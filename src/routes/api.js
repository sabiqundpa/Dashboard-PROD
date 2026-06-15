const express = require('express');
const multer = require('multer');
const prisma = require('../db');
const { getPeriodRange, daysInRange } = require('../lib/period');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// ── GET /api/health ──────────────────────────────────
// Quick diagnostic: confirms the function can reach Postgres.
router.get('/health', async (req, res) => {
  try {
    const [{ count }] = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "Machine"`;
    res.json({ ok: true, machines: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── GET /api/machines ──────────────────────────────
router.get('/machines', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period);
    const days = daysInRange(start, end);
    const machines = await prisma.machine.findMany({
      orderBy: { name: 'asc' },
      include: {
        breakdowns: {
          where: { date: { gte: start, lte: end } },
          orderBy: { date: 'desc' },
        },
      },
    });

    const result = machines.map((m) => {
      const downtimeHrs = m.breakdowns.reduce((s, b) => s + b.durationHrs, 0);
      const plannedHrs = m.plannedHours * days;
      const availability = plannedHrs > 0
        ? Math.max(0, Math.min(100, ((plannedHrs - downtimeHrs) / plannedHrs) * 100))
        : 0;

      return {
        id: m.id,
        name: m.name,
        type: m.type,
        location: m.location,
        status: m.status,
        availability,
        breakdowns: m.breakdowns.length,
        downtime_hrs: downtimeHrs,
        last_incident: m.breakdowns[0]?.cause ?? '—',
      };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/kpi ────────────────────────────────────
router.get('/kpi', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period);
    const days = daysInRange(start, end);

    const machines = await prisma.machine.findMany();
    const breakdowns = await prisma.breakdown.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const downtimeHrs = breakdowns.reduce((s, b) => s + b.durationHrs, 0);
    const plannedHrsTotal = machines.reduce((s, m) => s + m.plannedHours * days, 0);

    const availability = plannedHrsTotal > 0
      ? Math.max(0, Math.min(100, ((plannedHrsTotal - downtimeHrs) / plannedHrsTotal) * 100))
      : 0;

    const performance = machines.length
      ? machines.reduce((s, m) => s + m.performancePct, 0) / machines.length
      : 0;

    const quality = machines.length
      ? machines.reduce((s, m) => s + m.qualityPct, 0) / machines.length
      : 0;

    const oee = (availability * performance * quality) / 10000;

    const breakdownCount = breakdowns.length;
    const uptimeHrs = Math.max(0, plannedHrsTotal - downtimeHrs);
    const mtbf = breakdownCount > 0 ? uptimeHrs / breakdownCount : uptimeHrs;
    const mttr = breakdownCount > 0 ? downtimeHrs / breakdownCount : 0;

    res.json({
      breakdowns: breakdownCount,
      downtime_hrs: downtimeHrs,
      availability,
      performance,
      quality,
      oee,
      mtbf: Number(mtbf.toFixed(1)),
      mttr: Number(mttr.toFixed(1)),
    });
  } catch (err) { next(err); }
});

// ── GET /api/breakdowns ─────────────────────────────
router.get('/breakdowns', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period);
    const breakdowns = await prisma.breakdown.findMany({
      where: { date: { gte: start, lte: end } },
      include: { machine: true },
      orderBy: { date: 'desc' },
      take: 50,
    });

    res.json(breakdowns.map((b) => ({
      id: b.id,
      machine: b.machine.name,
      cause: b.cause,
      category: b.category,
      severity: b.severity,
      status: b.status,
      start: b.startTime ?? '',
      duration: `${b.durationHrs.toFixed(1)} hrs`,
      date: b.date.toISOString().slice(0, 10),
    })));
  } catch (err) { next(err); }
});

// ── GET /api/pareto ──────────────────────────────────
router.get('/pareto', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period);
    const breakdowns = await prisma.breakdown.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const counts = {};
    for (const b of breakdowns) {
      counts[b.cause] = (counts[b.cause] ?? 0) + 1;
    }

    const total = breakdowns.length;
    const pareto = Object.entries(counts)
      .map(([cause, count]) => ({
        cause,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json(pareto);
  } catch (err) { next(err); }
});

// ── GET /api/downtime-by-day ─────────────────────────
// range=today  -> hourly buckets for the current day
// range=week   -> last 7 days, one bucket per day (default)
// range=month  -> last 30 days, one bucket per day
router.get('/downtime-by-day', async (req, res, next) => {
  try {
    const range = req.query.range || 'week';
    const now = new Date();

    if (range === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      const breakdowns = await prisma.breakdown.findMany({
        where: { date: { gte: start, lte: end } },
      });

      const hours = [];
      for (let h = 0; h < 24; h++) {
        hours.push({ key: h, day: `${String(h).padStart(2, '0')}:00`, hrs: 0 });
      }

      for (const b of breakdowns) {
        const hour = b.startTime ? Number(b.startTime.split(':')[0]) : 0;
        const entry = hours[Number.isNaN(hour) ? 0 : hour];
        if (entry) entry.hrs += b.durationHrs;
      }

      return res.json(hours.map(({ day, hrs }) => ({ day, hrs })));
    }

    const totalDays = range === 'month' ? 29 : 6;
    const end = new Date(now);
    const start = new Date(end);
    start.setDate(start.getDate() - totalDays);
    start.setHours(0, 0, 0, 0);

    const breakdowns = await prisma.breakdown.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const days = [];
    for (let i = totalDays; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      days.push({
        key: d.toISOString().slice(0, 10),
        day: range === 'month'
          ? d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })
          : d.toLocaleDateString('en-US', { weekday: 'short' }),
        hrs: 0,
      });
    }

    for (const b of breakdowns) {
      const key = b.date.toISOString().slice(0, 10);
      const entry = days.find((d) => d.key === key);
      if (entry) entry.hrs += b.durationHrs;
    }

    res.json(days.map(({ day, hrs }) => ({ day, hrs })));
  } catch (err) { next(err); }
});

// ── POST /api/breakdown ──────────────────────────────
// Repair Machine Order (RMO) form submission
router.post('/breakdown', async (req, res, next) => {
  try {
    const {
      machine_code, breakdown_date, start_time, end_time,
      failure_cause, failure_category, severity, technician, notes,
    } = req.body;

    if (!machine_code || !failure_cause) {
      return res.status(400).json({ error: 'machine_code and failure_cause are required' });
    }

    const machine = await prisma.machine.findUnique({ where: { name: machine_code } });
    if (!machine) return res.status(404).json({ error: `Machine "${machine_code}" not found` });

    const durationHrs = computeDurationHrs(start_time, end_time);

    const breakdown = await prisma.breakdown.create({
      data: {
        machineId: machine.id,
        cause: failure_cause,
        category: failure_category || 'Mechanical',
        severity: severity || 'warning',
        status: end_time ? 'resolved' : 'open',
        date: breakdown_date ? new Date(breakdown_date) : new Date(),
        startTime: start_time || null,
        endTime: end_time || null,
        durationHrs,
        technician: technician || null,
        notes: notes || null,
      },
    });

    res.status(201).json(breakdown);
  } catch (err) { next(err); }
});

// ── PATCH /api/breakdown/:id/close ────────────────────
// Close a work order: maintenance member marks repair as done.
router.patch('/breakdown/:id/close', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { end_time, notes } = req.body;

    const existing = await prisma.breakdown.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: `Work order #${id} not found` });

    const endTime = end_time || nowTimeString();
    const durationHrs = existing.startTime
      ? computeDurationHrs(existing.startTime, endTime)
      : existing.durationHrs;

    const breakdown = await prisma.breakdown.update({
      where: { id },
      data: {
        status: 'resolved',
        endTime,
        durationHrs,
        notes: notes ? `${existing.notes ? existing.notes + ' | ' : ''}${notes}` : existing.notes,
      },
    });

    res.json(breakdown);
  } catch (err) { next(err); }
});

// ── POST /api/machines ─────────────────────────────────
// Register a new machine so it can receive work orders.
router.post('/machines', async (req, res, next) => {
  try {
    const { name, type, location } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    const existing = await prisma.machine.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: `Machine "${name}" already exists` });

    const machine = await prisma.machine.create({
      data: { name, type, location: location || '' },
    });

    res.status(201).json(machine);
  } catch (err) { next(err); }
});

// ── PATCH /api/machines/:name/status ───────────────────
router.patch('/machines/:name/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['running', 'down', 'idle', 'maintenance'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }

    const existing = await prisma.machine.findUnique({ where: { name: req.params.name } });
    if (!existing) return res.status(404).json({ error: `Machine "${req.params.name}" not found` });

    const machine = await prisma.machine.update({
      where: { name: req.params.name },
      data: { status },
    });

    res.json(machine);
  } catch (err) { next(err); }
});

// ── POST /api/import ──────────────────────────────────
// Accepts .csv with columns:
// machine_name, machine_type, breakdown_date, start_time, end_time, failure_cause, category, technician, notes
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rows = parseCsv(req.file.buffer.toString('utf-8'));

    let imported = 0;
    for (const row of rows) {
      const name = String(row.machine_name ?? '').trim();
      const cause = String(row.failure_cause ?? '').trim();
      if (!name || !cause) continue;

      const machine = await prisma.machine.upsert({
        where: { name },
        update: {},
        create: { name, type: String(row.machine_type ?? 'Unknown') },
      });

      const start = parseTimeValue(row.start_time);
      const end = parseTimeValue(row.end_time);
      const durationHrs = computeDurationHrs(start, end);

      await prisma.breakdown.create({
        data: {
          machineId: machine.id,
          cause,
          category: row.category ? String(row.category) : 'Mechanical',
          severity: 'warning',
          status: end ? 'resolved' : 'open',
          date: parseDateValue(row.breakdown_date) ?? new Date(),
          startTime: start,
          endTime: end,
          durationHrs,
          technician: row.technician ? String(row.technician) : null,
          notes: row.notes ? String(row.notes) : null,
        },
      });
      imported++;
    }

    res.json({ imported, total: rows.length });
  } catch (err) { next(err); }
});

module.exports = router;

// Minimal CSV parser supporting quoted fields with embedded commas/newlines.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field); field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
}

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function parseTimeValue(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }
  return String(value);
}

function nowTimeString() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function computeDurationHrs(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Number((diff / 60).toFixed(2));
}
