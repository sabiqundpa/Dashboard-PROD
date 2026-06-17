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
        cluster: m.cluster,
        line: m.line,
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
      end_date: b.endDate ? b.endDate.toISOString().slice(0, 10) : '',
      end_time: b.endTime ?? '',
      duration: `${b.durationHrs.toFixed(1)} hrs`,
      date: b.date.toISOString().slice(0, 10),
      pic_gh: b.picGh ?? '',
      pic_mtn: b.picMtn ?? '',
      resolution: b.resolution ?? '',
      action: b.action ?? '',
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

// ── GET /api/pareto-machines ─────────────────────────
// Top 10 machines by breakdown frequency within the period.
router.get('/pareto-machines', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period);
    const breakdowns = await prisma.breakdown.findMany({
      where: { date: { gte: start, lte: end } },
      include: { machine: true },
    });

    const counts = {};
    for (const b of breakdowns) {
      counts[b.machine.name] = (counts[b.machine.name] ?? 0) + 1;
    }

    const total = breakdowns.length;
    const pareto = Object.entries(counts)
      .map(([machine, count]) => ({
        machine,
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(pareto);
  } catch (err) { next(err); }
});

// ── GET /api/downtime-by-day ─────────────────────────
// range=today  -> hourly buckets for the current day
// range=week   -> last 7 days, one bucket per day (default)
// range=month  -> last 12 calendar months, one bucket per month
router.get('/downtime-by-day', async (req, res, next) => {
  try {
    const range = req.query.range || 'week';
    const now = new Date();

    if (range === 'month') {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          day: d.toLocaleDateString('en-US', { month: 'short' }),
          hrs: 0,
        });
      }

      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const breakdowns = await prisma.breakdown.findMany({
        where: { date: { gte: start, lte: end } },
      });

      for (const b of breakdowns) {
        const key = `${b.date.getUTCFullYear()}-${String(b.date.getUTCMonth() + 1).padStart(2, '0')}`;
        const entry = months.find((m) => m.key === key);
        if (entry) entry.hrs += b.durationHrs;
      }

      return res.json(months.map(({ day, hrs }) => ({ day, hrs })));
    }

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

    const totalDays = 6;
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
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
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
      machine_code, breakdown_date, start_time,
      failure_cause, failure_category, pic_gh,
    } = req.body;

    if (!machine_code || !failure_cause) {
      return res.status(400).json({ error: 'machine_code and failure_cause are required' });
    }

    const machine = await prisma.machine.findUnique({ where: { name: machine_code } });
    if (!machine) return res.status(404).json({ error: `Machine "${machine_code}" not found` });

    const breakdown = await prisma.breakdown.create({
      data: {
        machineId: machine.id,
        cause: failure_cause,
        category: failure_category || 'Mechanical',
        status: 'open',
        date: breakdown_date ? new Date(breakdown_date) : new Date(),
        startTime: start_time || null,
        picGh: pic_gh || null,
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
    const { end_date, end_time, resolution, action, pic_mtn } = req.body;

    const existing = await prisma.breakdown.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: `Work order #${id} not found` });

    const endTime = end_time || nowTimeString();
    const endDate = end_date ? new Date(end_date) : new Date();
    const durationHrs = computeDurationBetween(existing.date, existing.startTime, endDate, endTime);

    const breakdown = await prisma.breakdown.update({
      where: { id },
      data: {
        status: 'resolved',
        endDate,
        endTime,
        durationHrs,
        resolution: resolution || null,
        action: action || null,
        picMtn: pic_mtn || null,
      },
    });

    res.json(breakdown);
  } catch (err) { next(err); }
});

// ── POST /api/machines ─────────────────────────────────
// Register a new machine so it can receive work orders.
router.post('/machines', async (req, res, next) => {
  try {
    const { name, cluster, line } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const existing = await prisma.machine.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: `Machine "${name}" already exists` });

    const machine = await prisma.machine.create({
      data: { name, cluster: cluster || '', line: line || '' },
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
// machine_name, machine_cluster, machine_line, breakdown_date, start_time, end_time, failure_cause, category, technician, notes
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
        create: { name, cluster: String(row.machine_cluster ?? ''), line: String(row.machine_line ?? '') },
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

function computeDurationBetween(startDate, startTime, endDate, endTime) {
  const [sh, sm] = (startTime || '00:00').split(':').map(Number);
  const start = new Date(startDate);
  start.setHours(Number.isNaN(sh) ? 0 : sh, Number.isNaN(sm) ? 0 : sm, 0, 0);

  const [eh, em] = (endTime || '00:00').split(':').map(Number);
  const end = new Date(endDate || startDate);
  end.setHours(Number.isNaN(eh) ? 0 : eh, Number.isNaN(em) ? 0 : em, 0, 0);

  const diffMs = end - start;
  return diffMs > 0 ? Number((diffMs / 3600000).toFixed(2)) : 0;
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
