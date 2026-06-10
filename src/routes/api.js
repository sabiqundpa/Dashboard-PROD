const express = require('express');
const multer = require('multer');
const prisma = require('../db');
const { getPeriodRange, daysInRange } = require('../lib/period');

const upload = multer({ storage: multer.memoryStorage() });

module.exports = function (io) {
  const router = express.Router();

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
        take: 10,
      });

      res.json(breakdowns.map((b) => ({
        machine: b.machine.name,
        cause: b.cause,
        severity: b.severity,
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
  router.get('/downtime-by-day', async (req, res, next) => {
    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const breakdowns = await prisma.breakdown.findMany({
        where: { date: { gte: start, lte: end } },
      });

      const days = [];
      for (let i = 6; i >= 0; i--) {
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

  // ── POST /api/breakdowns ──────────────────────────────
  router.post('/breakdowns', async (req, res, next) => {
    try {
      const {
        machine_name, cause, severity, date,
        start_time, end_time, duration_hrs, technician, notes,
      } = req.body;

      const machine = await prisma.machine.findUnique({ where: { name: machine_name } });
      if (!machine) return res.status(404).json({ error: `Machine "${machine_name}" not found` });

      const breakdown = await prisma.breakdown.create({
        data: {
          machineId: machine.id,
          cause,
          severity: severity ?? 'warning',
          date: date ? new Date(date) : new Date(),
          startTime: start_time ?? null,
          endTime: end_time ?? null,
          durationHrs: Number(duration_hrs) || 0,
          technician: technician ?? null,
          notes: notes ?? null,
        },
      });

      io.emit('breakdown:new', { machine: machine.name, cause: breakdown.cause });
      res.status(201).json(breakdown);
    } catch (err) { next(err); }
  });

  // ── PATCH /api/machines/:id/status ───────────────────
  router.patch('/machines/:id/status', async (req, res, next) => {
    try {
      const { status } = req.body;
      const allowed = ['running', 'down', 'idle', 'maintenance'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
      }

      const machine = await prisma.machine.update({
        where: { id: Number(req.params.id) },
        data: { status },
      });

      io.emit('machine:status', { id: machine.id, name: machine.name, status: machine.status });
      res.json(machine);
    } catch (err) { next(err); }
  });

  // ── POST /api/import ──────────────────────────────────
  // Accepts .csv with columns:
  // machine_name, machine_type, breakdown_date, start_time, end_time, failure_cause, technician, notes
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
            severity: 'warning',
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

      io.emit('machine:status');
      res.json({ imported, total: rows.length });
    } catch (err) { next(err); }
  });

  return router;
};

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

function computeDurationHrs(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Number((diff / 60).toFixed(2));
}
