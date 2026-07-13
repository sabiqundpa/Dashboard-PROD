const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { getPeriodRange, daysInRange } = require('../lib/period');
const { signToken, requireAuth } = require('../lib/auth');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Optional ?machine=<name> filter, used across breakdown queries to scope
// the whole dashboard to a single machine.
function machineWhere(req) {
  return req.query.machine ? { machine: { name: req.query.machine } } : {};
}

// ── GET /api/health ──────────────────────────────────
// Quick diagnostic: confirms the function can reach Postgres. Left public
// (no auth) so it stays useful for uptime checks even when logged out.
router.get('/health', async (req, res) => {
  try {
    const [{ count }] = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "Machine"`;
    res.json({ ok: true, machines: count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── POST /api/login ───────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    res.json({ token: signToken(admin), username: admin.username, role: admin.role || 'maintenance' });
  } catch (err) { next(err); }
});

// Everything below requires a valid login.
router.use(requireAuth);

// ── GET /api/me ────────────────────────────────────────
router.get('/me', (req, res) => {
  res.json({ username: req.admin.username });
});

// ── GET /api/machines ──────────────────────────────
router.get('/machines', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
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
        assetNumber: m.assetNumber,
        type: m.type,
        brand: m.brand,
        yearMachine: m.yearMachine,
        power: m.power,
        cluster: m.cluster,
        line: m.line,
        shift: m.shift,
        active: m.active,
        plannedHours: m.plannedHours,
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
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const days = daysInRange(start, end);
    // Only active machines contribute to planned hours (and thus availability).
    // When a specific machine is requested by name, honour that regardless of active flag.
    const machineFilter = req.query.machine
      ? { name: req.query.machine }
      : { active: true };

    const machines = await prisma.machine.findMany({ where: machineFilter });
    const breakdowns = await prisma.breakdown.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(req.query.machine ? { machine: { name: req.query.machine } } : {}),
      },
    });

    const downtimeHrs = breakdowns.reduce((s, b) => s + b.durationHrs, 0);
    const plannedHrsPerDay = machines.reduce((s, m) => s + m.plannedHours, 0);
    const plannedHrsTotal = plannedHrsPerDay * days;

    const availability = plannedHrsTotal > 0
      ? Math.max(0, Math.min(100, ((plannedHrsTotal - downtimeHrs) / plannedHrsTotal) * 100))
      : 0;

    const breakdownCount = breakdowns.length;
    const uptimeHrs = Math.max(0, plannedHrsTotal - downtimeHrs);
    const mtbf = breakdownCount > 0 ? uptimeHrs / breakdownCount : uptimeHrs;
    const mttr = breakdownCount > 0 ? downtimeHrs / breakdownCount : 0;
    const plannedMinutesTotal = plannedHrsTotal * 60;

    res.json({
      breakdowns: breakdownCount,
      downtime_hrs: downtimeHrs,
      planned_hours: Number(plannedHrsTotal.toFixed(1)),
      planned_hours_per_day: Number(plannedHrsPerDay.toFixed(1)),
      planned_hours_minutes: Math.round(plannedMinutesTotal),
      availability,
      mtbf: Number(mtbf.toFixed(1)),
      mttr: Number(mttr.toFixed(1)),
    });
  } catch (err) { next(err); }
});

// ── GET /api/breakdowns ─────────────────────────────
router.get('/breakdowns', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const breakdowns = await prisma.breakdown.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(req.query.machine ? { machine: { name: req.query.machine } } : {}),
      },
      include: { machine: true },
      orderBy: { date: 'desc' },
      take: 50,
    });

    res.json(breakdowns.map((b) => {
      const akumulasiRepair = (b.repairDate && b.repairTime && b.endDate && b.endTime)
        ? computeDurationBetween(b.repairDate, b.repairTime, b.endDate, b.endTime)
        : null;
      return {
        id: b.id,
        machine: b.machine.name,
        cluster: b.machine.cluster,
        line: b.machine.line,
        cause: b.cause,
        category: b.category,
        severity: b.severity,
        status: b.status,
        start: b.startTime ?? '',
        end_date: b.endDate ? b.endDate.toISOString().slice(0, 10) : '',
        end_time: b.endTime ?? '',
        duration: `${b.durationHrs.toFixed(1)} hrs`,
        durationHrs: b.durationHrs,
        date: b.date.toISOString().slice(0, 10),
        pic_gh: b.picGh ?? '',
        pic_mtn: b.picMtn ?? '',
        resolution: b.resolution ?? '',
        action: b.action ?? '',
        repair_date: b.repairDate ? b.repairDate.toISOString().slice(0, 10) : '',
        repair_time: b.repairTime ?? '',
        akumulasiRepair,
      };
    }));
  } catch (err) { next(err); }
});

// ── GET /api/machine-history ─────────────────────────
// Full breakdown history for one machine — no period limit, no take cap.
router.get('/machine-history', async (req, res, next) => {
  try {
    const machineName = req.query.machine;
    if (!machineName) return res.status(400).json({ error: 'machine required' });
    const breakdowns = await prisma.breakdown.findMany({
      where: { machine: { name: machineName } },
      orderBy: { date: 'desc' },
    });
    res.json(breakdowns.map((b) => ({
      id: b.id,
      cause: b.cause,
      status: b.status,
      date: b.date.toISOString().slice(0, 10),
      start: b.startTime ?? '',
      durationHrs: b.durationHrs,
    })));
  } catch (err) { next(err); }
});

// ── GET /api/pareto ──────────────────────────────────
router.get('/pareto', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const breakdowns = await prisma.breakdown.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(req.query.machine ? { machine: { name: req.query.machine } } : {}),
      },
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
// Top 10 machines by total downtime within the period.
router.get('/pareto-machines', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const breakdowns = await prisma.breakdown.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(req.query.machine ? { machine: { name: req.query.machine } } : {}),
      },
      include: { machine: true },
    });

    const dtMap = {};
    for (const b of breakdowns) {
      dtMap[b.machine.name] = (dtMap[b.machine.name] ?? 0) + (b.durationHrs ?? 0);
    }

    const totalDt = Object.values(dtMap).reduce((s, v) => s + v, 0);
    const pareto = Object.entries(dtMap)
      .map(([machine, downtime_hrs]) => ({
        machine,
        downtime_hrs: Number(downtime_hrs.toFixed(2)),
        count: downtime_hrs,
        pct: totalDt > 0 ? Math.round((downtime_hrs / totalDt) * 100) : 0,
      }))
      .sort((a, b) => b.downtime_hrs - a.downtime_hrs)
      .slice(0, 10);

    res.json(pareto);
  } catch (err) { next(err); }
});

// ── GET /api/downtime-by-day ─────────────────────────
// period=today -> hourly buckets, 00 through 23, for the current day
// period=week  -> calendar week, Monday through Sunday (default)
// period=month -> calendar year, January through December
router.get('/downtime-by-day', async (req, res, next) => {
  try {
    const period = req.query.period || req.query.range || 'week';
    const now = req.query.date ? new Date(req.query.date) : new Date();

    if (period === 'month') {
      const year = now.getFullYear();
      const months = [];
      for (let m = 0; m < 12; m++) {
        const d = new Date(year, m, 1);
        months.push({
          key: `${year}-${String(m + 1).padStart(2, '0')}`,
          day: d.toLocaleDateString('en-US', { month: 'short' }),
          hrs: 0,
        });
      }

      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);

      const breakdowns = await prisma.breakdown.findMany({
        where: { date: { gte: start, lte: end }, ...machineWhere(req) },
      });

      for (const b of breakdowns) {
        const key = `${b.date.getUTCFullYear()}-${String(b.date.getUTCMonth() + 1).padStart(2, '0')}`;
        const entry = months.find((m) => m.key === key);
        if (entry) entry.hrs += b.durationHrs;
      }

      return res.json(months.map(({ day, hrs }) => ({ day, hrs })));
    }

    if (period === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      const breakdowns = await prisma.breakdown.findMany({
        where: { date: { gte: start, lte: end }, ...machineWhere(req) },
      });

      const hours = [];
      for (let h = 0; h < 24; h++) {
        hours.push({ key: h, day: String(h).padStart(2, '0'), hrs: 0 });
      }

      for (const b of breakdowns) {
        const hour = b.startTime ? Number(b.startTime.split(':')[0]) : 0;
        const entry = hours[Number.isNaN(hour) ? 0 : hour];
        if (entry) entry.hrs += b.durationHrs;
      }

      return res.json(hours.map(({ day, hrs }) => ({ day, hrs })));
    }

    // range: custom date range, one bucket per day
    if (period === 'range' && req.query.start && req.query.end) {
      const rangeStart = new Date(req.query.start); rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd   = new Date(req.query.end);   rangeEnd.setHours(23, 59, 59, 999);
      const breakdowns = await prisma.breakdown.findMany({
        where: { date: { gte: rangeStart, lte: rangeEnd }, ...machineWhere(req) },
      });
      const days = [];
      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
        days.push({ key: d.toISOString().slice(0, 10), day: `${d.getDate()}/${d.getMonth()+1}`, hrs: 0 });
      }
      for (const b of breakdowns) {
        const key = b.date.toISOString().slice(0, 10);
        const entry = days.find((d) => d.key === key);
        if (entry) entry.hrs += b.durationHrs;
      }
      return res.json(days.map(({ day, hrs }) => ({ day, hrs })));
    }

    // week: Monday through Sunday of the current calendar week
    const dayOfWeek = now.getDay(); // 0 = Sunday .. 6 = Saturday
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const breakdowns = await prisma.breakdown.findMany({
      where: { date: { gte: monday, lte: sunday }, ...machineWhere(req) },
    });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
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

// ── GET /api/mtbf-mttr-trend ──────────────────────────
// Same bucketing as /downtime-by-day (today=hourly, week=Mon-Sun,
// month=Jan-Dec), but each bucket reports MTBF/MTTR computed from that
// bucket's own breakdown count + planned hours, instead of a single
// aggregate for the whole period.
router.get('/mtbf-mttr-trend', async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    const now = req.query.date ? new Date(req.query.date) : new Date();
    const MTTR_TARGET_HOURS = 1; // fixed org-wide target: repair within 1 jam

    const machines = await prisma.machine.findMany({ where: req.query.machine ? { name: req.query.machine } : { active: true } });
    const plannedPerDay = machines.reduce((s, m) => s + m.plannedHours, 0);
    const mttrTarget = MTTR_TARGET_HOURS;

    // Target MTBF for a bucket = that bucket's full planned hours (the
    // ceiling you'd hit with zero breakdowns) -- naturally scales with how
    // many days/hours are in the bucket, based on each machine's Jam Kerja
    // Harian, e.g. a 31-day month has a higher target than a 28-day one.
    // Target MTTR stays flat at 1 jam regardless of calendar length.
    function bucket(downtimeHrs, count, plannedHrs) {
      const uptimeHrs = Math.max(0, plannedHrs - downtimeHrs);
      const mtbf = count > 0 ? uptimeHrs / count : uptimeHrs;
      const mttr = count > 0 ? downtimeHrs / count : 0;
      return {
        mtbf: Number(mtbf.toFixed(1)),
        mttr: Number(mttr.toFixed(1)),
        mtbfTarget: Number(plannedHrs.toFixed(1)),
        mttrTarget,
      };
    }
    // Total row: real aggregate over the whole range (not an average of
    // the per-bucket approximations), i.e. the textbook annual/period MTBF.
    function totalRow(totalDowntimeHrs, totalCount, totalPlannedHrs, bucketTargets) {
      const uptimeHrs = Math.max(0, totalPlannedHrs - totalDowntimeHrs);
      const mtbf = totalCount > 0 ? uptimeHrs / totalCount : uptimeHrs;
      const mttr = totalCount > 0 ? totalDowntimeHrs / totalCount : 0;
      const avgTarget = bucketTargets.reduce((s, t) => s + t, 0) / (bucketTargets.length || 1);
      return {
        day: 'TOTAL',
        mtbf: Number(mtbf.toFixed(1)),
        mttr: Number(mttr.toFixed(1)),
        mtbfTarget: Number(avgTarget.toFixed(1)),
        mttrTarget,
      };
    }

    if (period === 'month') {
      const year = now.getFullYear();
      const months = [];
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        months.push({
          key: `${year}-${String(m + 1).padStart(2, '0')}`,
          day: new Date(year, m, 1).toLocaleDateString('en-US', { month: 'short' }),
          downtimeHrs: 0, count: 0, plannedHrs: plannedPerDay * daysInMonth,
        });
      }

      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      const breakdowns = await prisma.breakdown.findMany({ where: { date: { gte: start, lte: end }, ...machineWhere(req) } });

      for (const b of breakdowns) {
        const key = `${b.date.getUTCFullYear()}-${String(b.date.getUTCMonth() + 1).padStart(2, '0')}`;
        const entry = months.find((m) => m.key === key);
        if (entry) { entry.downtimeHrs += b.durationHrs; entry.count += 1; }
      }

      const rows = months.map((m) => ({ day: m.day, ...bucket(m.downtimeHrs, m.count, m.plannedHrs) }));
      const totalDowntime = months.reduce((s, m) => s + m.downtimeHrs, 0);
      const totalCount = months.reduce((s, m) => s + m.count, 0);
      const totalPlanned = months.reduce((s, m) => s + m.plannedHrs, 0);
      rows.push(totalRow(totalDowntime, totalCount, totalPlanned, months.map((m) => m.plannedHrs)));
      return res.json(rows);
    }

    if (period === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      const breakdowns = await prisma.breakdown.findMany({ where: { date: { gte: start, lte: end }, ...machineWhere(req) } });

      const hours = [];
      for (let h = 0; h < 24; h++) {
        hours.push({ day: String(h).padStart(2, '0'), downtimeHrs: 0, count: 0, plannedHrs: plannedPerDay / 24 });
      }
      for (const b of breakdowns) {
        const hour = b.startTime ? Number(b.startTime.split(':')[0]) : 0;
        const entry = hours[Number.isNaN(hour) ? 0 : hour];
        if (entry) { entry.downtimeHrs += b.durationHrs; entry.count += 1; }
      }

      const rows = hours.map((h) => ({ day: h.day, ...bucket(h.downtimeHrs, h.count, h.plannedHrs) }));
      const totalDowntime = hours.reduce((s, h) => s + h.downtimeHrs, 0);
      const totalCount = hours.reduce((s, h) => s + h.count, 0);
      const totalPlanned = hours.reduce((s, h) => s + h.plannedHrs, 0);
      rows.push(totalRow(totalDowntime, totalCount, totalPlanned, hours.map((h) => h.plannedHrs)));
      return res.json(rows);
    }

    // range: custom start–end, one bucket per day
    if (period === 'range' && req.query.start && req.query.end) {
      const rs = new Date(req.query.start); rs.setHours(0, 0, 0, 0);
      const re = new Date(req.query.end);   re.setHours(23, 59, 59, 999);
      const rBreakdowns = await prisma.breakdown.findMany({ where: { date: { gte: rs, lte: re }, ...machineWhere(req) } });
      const rDays = [];
      for (let d = new Date(rs); d <= re; d.setDate(d.getDate() + 1)) {
        rDays.push({ key: d.toISOString().slice(0, 10), day: `${d.getDate()}/${d.getMonth()+1}`, downtimeHrs: 0, count: 0, plannedHrs: plannedPerDay });
      }
      for (const b of rBreakdowns) {
        const key = b.date.toISOString().slice(0, 10);
        const entry = rDays.find((d) => d.key === key);
        if (entry) { entry.downtimeHrs += b.durationHrs; entry.count += 1; }
      }
      const rRows = rDays.map((d) => ({ day: d.day, ...bucket(d.downtimeHrs, d.count, d.plannedHrs) }));
      const rTotalDT = rDays.reduce((s, d) => s + d.downtimeHrs, 0);
      const rTotalC  = rDays.reduce((s, d) => s + d.count, 0);
      const rTotalP  = rDays.reduce((s, d) => s + d.plannedHrs, 0);
      rRows.push(totalRow(rTotalDT, rTotalC, rTotalP, rDays.map((d) => d.plannedHrs)));
      return res.json(rRows);
    }

    // week: Monday through Sunday of the current calendar week
    const dayOfWeek = now.getDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const breakdowns = await prisma.breakdown.findMany({ where: { date: { gte: monday, lte: sunday }, ...machineWhere(req) } });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      days.push({
        key: d.toISOString().slice(0, 10),
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        downtimeHrs: 0, count: 0, plannedHrs: plannedPerDay,
      });
    }
    for (const b of breakdowns) {
      const key = b.date.toISOString().slice(0, 10);
      const entry = days.find((d) => d.key === key);
      if (entry) { entry.downtimeHrs += b.durationHrs; entry.count += 1; }
    }

    const rows = days.map((d) => ({ day: d.day, ...bucket(d.downtimeHrs, d.count, d.plannedHrs) }));
    const totalDowntime = days.reduce((s, d) => s + d.downtimeHrs, 0);
    const totalCount = days.reduce((s, d) => s + d.count, 0);
    const totalPlanned = days.reduce((s, d) => s + d.plannedHrs, 0);
    rows.push(totalRow(totalDowntime, totalCount, totalPlanned, days.map((d) => d.plannedHrs)));
    res.json(rows);
  } catch (err) { next(err); }
});

// ── POST /api/breakdown ──────────────────────────────
// Repair Machine Order (RMO) form submission
router.post('/breakdown', async (req, res, next) => {
  try {
    const {
      machine_code, breakdown_date, start_time,
      failure_cause, failure_category, pic_gh, severity,
    } = req.body;

    if (!machine_code || !failure_cause) {
      return res.status(400).json({ error: 'machine_code and failure_cause are required' });
    }

    const allowedSeverity = ['critical', 'warning', 'info'];

    const machine = await prisma.machine.findUnique({ where: { name: machine_code } });
    if (!machine) return res.status(404).json({ error: `Machine "${machine_code}" not found` });

    const breakdown = await prisma.breakdown.create({
      data: {
        machineId: machine.id,
        cause: failure_cause,
        category: failure_category || 'Mechanical',
        severity: allowedSeverity.includes(severity) ? severity : 'warning',
        status: 'open',
        date: breakdown_date ? new Date(breakdown_date) : new Date(),
        startTime: start_time || null,
        picGh: pic_gh || null,
      },
    });

    res.status(201).json(breakdown);
  } catch (err) { next(err); }
});

// ── POST /api/breakdown-close ──────────────────────────
// Close a work order: maintenance member marks repair as done.
// (Flat path, no nested segments or :id param -- this Vercel deployment's
// edge routing only forwards single-segment /api/* paths to the
// serverless function; anything with a second path segment, even just an
// :id, returns a platform-level 404 before reaching Express at all. id is
// passed in the body instead of the URL.)
router.post('/breakdown-close', async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    const { end_date, end_time, repair_date, repair_time, resolution, action, pic_mtn, failure_category, severity } = req.body;

    const existing = await prisma.breakdown.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: `Work order #${id} not found` });

    const endTime = end_time || nowTimeString();
    const endDate = end_date ? new Date(end_date) : new Date();
    const durationHrs = computeDurationBetween(existing.date, existing.startTime, endDate, endTime);

    const allowedSeverity = ['critical', 'warning', 'info'];
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
        category: failure_category || existing.category,
        severity: allowedSeverity.includes(severity) ? severity : existing.severity,
        repairDate: repair_date ? new Date(repair_date) : null,
        repairTime: repair_time || null,
      },
    });

    res.json(breakdown);
  } catch (err) { next(err); }
});

// ── POST /api/machines ─────────────────────────────────
// Register a new machine so it can receive work orders.
router.post('/machines', async (req, res, next) => {
  try {
    const { name, assetNumber, type, brand, yearMachine, power, cluster, line, shift, plannedHours } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const existing = await prisma.machine.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: `Machine "${name}" already exists` });

    const machine = await prisma.machine.create({
      data: {
        name,
        assetNumber: assetNumber || '',
        type: type || '',
        brand: brand || '',
        yearMachine: yearMachine || null,
        power: power || '',
        cluster: cluster || '',
        line: line || '',
        shift: shift || '',
        plannedHours: plannedHours ? Number(plannedHours) : 16,
      },
    });

    res.status(201).json(machine);
  } catch (err) { next(err); }
});

// ── DELETE /api/machines ───────────────────────────────
// Permanently delete a machine and all its breakdown records (cascade).
router.delete('/machines', async (req, res, next) => {
  try {
    const { machine: machineName } = req.body;
    if (!machineName) return res.status(400).json({ error: 'machine name required' });
    const existing = await prisma.machine.findUnique({ where: { name: machineName } });
    if (!existing) return res.status(404).json({ error: `Machine "${machineName}" not found` });
    await prisma.machine.delete({ where: { name: machineName } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── PUT /api/breakdown/:id ─────────────────────────────
// Edit work order fields (cause, resolution, dates, pic_mtn, etc.)
router.put('/breakdown/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { cause, resolution, action, category, pic_mtn, date, start_time, end_date, end_time, duration_hrs, repair_date, repair_time } = req.body;
    const data = {};
    if (cause        !== undefined) data.cause       = String(cause);
    if (resolution   !== undefined) data.resolution  = resolution ? String(resolution) : null;
    if (action       !== undefined) data.action      = action ? String(action) : null;
    if (category     !== undefined) data.category    = String(category);
    if (pic_mtn      !== undefined) data.picMtn      = pic_mtn ? String(pic_mtn) : null;
    if (date         !== undefined) data.date        = new Date(date);
    if (start_time   !== undefined) data.startTime   = start_time || null;
    if (end_date     !== undefined) data.endDate     = end_date ? new Date(end_date) : null;
    if (end_time     !== undefined) data.endTime     = end_time || null;
    if (duration_hrs !== undefined) data.durationHrs = parseFloat(duration_hrs) || 0;
    if (repair_date  !== undefined) data.repairDate  = repair_date ? new Date(repair_date) : null;
    if (repair_time  !== undefined) data.repairTime  = repair_time || null;
    await prisma.breakdown.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── DELETE /api/breakdown/:id ──────────────────────────
// Permanently delete a single work order record.
router.delete('/breakdown/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.breakdown.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/machines-active ──────────────────────────
// Toggle aktif/nonaktif flag. Only active machines contribute to KPI.
router.post('/machines-active', async (req, res, next) => {
  try {
    const { machine: machineName, active } = req.body;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }
    const existing = await prisma.machine.findUnique({ where: { name: machineName } });
    if (!existing) return res.status(404).json({ error: `Machine "${machineName}" not found` });

    await prisma.machine.update({ where: { name: machineName }, data: { active } });
    res.json({ ok: true, active });
  } catch (err) { next(err); }
});

// ── POST /api/machines-edit ─────────────────────────────
// Edit machine details: name, master data fields, cluster/line/shift, plannedHours.
// (Flat path -- the machine's current name is passed in the body as
// `machine`, distinct from `name` which may be a rename.)
router.post('/machines-edit', async (req, res, next) => {
  try {
    const { machine: machineName, name, assetNumber, type, brand, yearMachine, power, cluster, line, shift, plannedHours } = req.body;
    const existing = await prisma.machine.findUnique({ where: { name: machineName } });
    if (!existing) return res.status(404).json({ error: `Machine "${machineName}" not found` });

    if (name && name !== existing.name) {
      const clash = await prisma.machine.findUnique({ where: { name } });
      if (clash) return res.status(409).json({ error: `Machine "${name}" already exists` });
    }

    const machine = await prisma.machine.update({
      where: { name: machineName },
      data: {
        name: name || existing.name,
        assetNumber: assetNumber ?? existing.assetNumber,
        type: type ?? existing.type,
        brand: brand ?? existing.brand,
        yearMachine: yearMachine !== undefined ? (yearMachine || null) : existing.yearMachine,
        power: power ?? existing.power,
        cluster: cluster ?? existing.cluster,
        line: line ?? existing.line,
        shift: shift ?? existing.shift,
        plannedHours: plannedHours != null ? Number(plannedHours) : existing.plannedHours,
      },
    });

    res.json(machine);
  } catch (err) { next(err); }
});

// ── GET /api/export-work-orders ────────────────────────
// CSV export of the work_order_export SQL view -- the same view that can
// be queried directly in pgAdmin (Query Tool -> Export to CSV).
// Optional ?period=today|week|month (+ ?date=YYYY-MM-DD) filters rows to
// that calendar-aligned range by "tanggal" (the breakdown's start date);
// omitting ?period keeps exporting the full history, unfiltered.
// (Flat path, no nested segments -- see the comment on /breakdown-close.)
router.get('/export-work-orders', async (req, res, next) => {
  try {
    const whereClause = req.query.period
      ? (() => { const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end); return { date: { gte: start, lte: end } }; })()
      : {};
    const bs = await prisma.breakdown.findMany({
      where: whereClause,
      include: { machine: true },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    });

    const HEADERS = ['NO', 'Status', 'Tanggal Lapor', 'Waktu Lapor', 'Nama Mesin', 'Problem', 'Penyelesaian', 'Tanggal Mulai', 'Waktu Mulai', 'Tanggal Selesai', 'Waktu Selesai', 'Waktu Pengerjaan', 'Downtime', 'PIC MTN'];
    const csvLines = [HEADERS.join(',')];
    bs.forEach((b, i) => {
      const akumulasi = (b.repairDate && b.repairTime && b.endDate && b.endTime)
        ? computeDurationBetween(b.repairDate, b.repairTime, b.endDate, b.endTime)
        : '';
      const row = [
        i + 1,
        b.status === 'resolved' ? 'Close' : 'Open',
        b.date.toISOString().slice(0, 10),
        b.startTime ?? '',
        b.machine.name,
        b.cause,
        b.resolution ?? '',
        b.repairDate ? b.repairDate.toISOString().slice(0, 10) : '',
        b.repairTime ?? '',
        b.endDate ? b.endDate.toISOString().slice(0, 10) : '',
        b.endTime ?? '',
        akumulasi,
        b.durationHrs,
        b.picMtn ?? '',
      ];
      csvLines.push(row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="work-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) { next(err); }
});

// ── GET /api/export-machines ───────────────────────────
// CSV export of master data for every machine, each paired with its full
// breakdown history (not just the latest incident, and not limited to any
// dashboard period filter) -- one row per breakdown; machines with no
// breakdowns at all still get a single row with the history columns blank.
router.get('/export-machines', async (req, res, next) => {
  try {
    const machines = await prisma.machine.findMany({ orderBy: { name: 'asc' } });

    const headers = ['Nama Mesin', 'Nomor Asset', 'Type', 'Merk', 'Tahun Mesin', 'Daya', 'Cluster', 'Line', 'Shift', 'Jam Kerja Harian', 'Aktif'];
    const csvLines = [headers.join(',')];
    for (const m of machines) {
      const row = [m.name, m.assetNumber, m.type, m.brand, m.yearMachine ?? '', m.power, m.cluster, m.line, m.shift, m.plannedHours, m.active ? 'Ya' : 'Tidak'];
      csvLines.push(row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mesin-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) { next(err); }
});

// ── POST /api/import ──────────────────────────────────
// Accepts .csv with columns (format baru — Indonesian):
// NO, Tanggal Lapor, Waktu Lapor, Nama Mesin, Cluster, Line, Problem Identifikasi,
// Penyelesaian, Tanggal Mulai, Waktu Mulai, Tanggal Selesai, Waktu Selesai,
// Waktu Pengerjaan, Breakdown Time, Status, PIC MTN
// Juga mendukung kolom lama (backward-compatible): machine_name, failure_cause, dll.
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rows = parseCsv(req.file.buffer.toString('utf-8'));

    // ── Phase 1: parse all rows, collect valid entries ──────────
    const validRows = [];
    for (const row of rows) {
      const name  = String(row['Nama Mesin'] ?? row.machine_name ?? '').trim();
      const cause = String(row['Problem Identifikasi'] ?? row['Problem'] ?? row.failure_cause ?? '').trim();
      if (!name || !cause) continue;
      validRows.push({ row, name, cause });
    }

    // ── Phase 2: batch-upsert unique machines, build name→id map ─
    const uniqueNames = [...new Set(validRows.map((r) => r.name))];
    const nameToId = new Map();
    const CHUNK = 50;
    for (let i = 0; i < uniqueNames.length; i += CHUNK) {
      const chunk = uniqueNames.slice(i, i + CHUNK);
      const results = await prisma.$transaction(
        chunk.map((name) =>
          prisma.machine.upsert({
            where: { name },
            update: {},
            create: { name, cluster: '', line: '' },
            select: { id: true, name: true },
          })
        )
      );
      results.forEach((m) => nameToId.set(m.name, m.id));
    }

    // ── Phase 3: batch-create all breakdowns ────────────────────
    const breakdownData = validRows.map(({ row, name, cause }) => {
      const startTime  = parseTimeValue(row['Waktu Mulai'] ?? row['Waktu Lapor'] ?? row.start_time);
      const endTime    = parseTimeValue(row['Waktu Selesai'] ?? row.end_time);
      const reportDate = parseDateValue(row['Tanggal Lapor'] ?? row.breakdown_date);
      const startDate  = parseDateValue(row['Tanggal Mulai'] ?? row['Tanggal Lapor'] ?? row.breakdown_date);
      const endDate    = parseDateValue(row['Tanggal Selesai']);

      const btRaw = row['Downtime'] ?? row['Breakdown Time'] ?? row['Waktu Pengerjaan'];
      let durationHrs = computeDurationHrs(startTime, endTime);
      if (btRaw !== undefined && btRaw !== '' && !isNaN(parseFloat(btRaw))) {
        durationHrs = parseFloat(btRaw);
      }

      const statusRaw = String(row['Status'] ?? '').toLowerCase();
      const status = statusRaw === 'open' ? 'open'
        : ['resolved', 'close', 'closed', 'selesai'].includes(statusRaw) ? 'resolved'
        : (endTime ? 'resolved' : 'open');

      return {
        machineId: nameToId.get(name),
        cause,
        category: row['category'] ? String(row['category']) : 'Mechanical',
        severity: 'warning',
        status,
        date: startDate ?? reportDate ?? new Date(),
        startTime,
        endDate: endDate ?? (endTime ? (startDate ?? reportDate ?? new Date()) : null),
        endTime,
        durationHrs,
        picMtn: (row['PIC MTN'] ? String(row['PIC MTN']).trim() : null)
                ?? (row.technician ? String(row.technician).trim() : null),
        resolution: row['Penyelesaian'] ? String(row['Penyelesaian']).trim() : null,
        notes: row.notes ? String(row.notes) : null,
      };
    });

    for (let i = 0; i < breakdownData.length; i += CHUNK) {
      await prisma.$transaction(
        breakdownData.slice(i, i + CHUNK).map((data) => prisma.breakdown.create({ data }))
      );
    }

    res.json({ imported: breakdownData.length, total: rows.length });
  } catch (err) { next(err); }
});

// ── POST /api/import-machines ──────────────────────────
// Accepts .csv with machine master-data columns:
// NO, Nomor Asset, Nama Mesin, Type, Merk, Tahun Mesin, Daya, Cluster, Line, Shift, Jam Waktu Kerja
router.post('/import-machines', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const rows = parseCsv(req.file.buffer.toString('utf-8'));

    // Parse every row first, collect valid upsert payloads
    const upserts = [];
    let skipped = 0;
    const seenNames = new Set(); // deduplicate within the file itself

    for (const row of rows) {
      const lookup = {};
      Object.keys(row).forEach((k) => { lookup[k.trim().toLowerCase()] = row[k]; });
      const field = (...keys) => {
        for (const key of keys) {
          const v = lookup[key.toLowerCase()];
          if (v !== undefined && v !== '') return String(v).trim();
        }
        return '';
      };

      const name = field('Nama Mesin', 'Mesin', 'Machine Name', 'name', 'machine_name');
      if (!name || seenNames.has(name)) { skipped++; continue; }
      seenNames.add(name);

      const plannedHoursRaw = field('Jam Waktu Kerja', 'Jam Kerja', 'Planned Hours', 'plannedHours');
      const plannedHours = plannedHoursRaw !== '' && !isNaN(Number(plannedHoursRaw)) ? Number(plannedHoursRaw) : null;

      const yearRaw = field('Tahun Mesin', 'Tahun', 'year_machine', 'Year');
      const data = {
        assetNumber: field('Nomor Asset', 'No Asset', 'Asset Number', 'id_asset_machine'),
        type: field('Type', 'Tipe', 'type_machine'),
        brand: field('Merk', 'Brand', 'Merk tahun', 'Merk Tahun', 'brand_machine'),
        yearMachine: yearRaw || null,
        power: field('Daya', 'Power', 'power_machine'),
        cluster: field('Cluster'),
        line: field('Line'),
        shift: field('Shift'),
      };

      upserts.push({ name, data, plannedHours });
    }

    // Batch into chunks of 50 and run each chunk as a single transaction.
    // This replaces N sequential round-trips (one per row) with ceil(N/50)
    // round-trips, keeping total time well inside the serverless timeout.
    const CHUNK = 50;
    for (let i = 0; i < upserts.length; i += CHUNK) {
      const chunk = upserts.slice(i, i + CHUNK);
      await prisma.$transaction(
        chunk.map(({ name, data, plannedHours }) =>
          prisma.machine.upsert({
            where: { name },
            update: { ...data, ...(plannedHours != null ? { plannedHours } : {}) },
            create: { name, ...data, plannedHours: plannedHours ?? 16, active: false },
          })
        )
      );
    }

    res.json({ imported: upserts.length, skipped, total: rows.length });
  } catch (err) { next(err); }
});

// ── POST /api/analytics-compute ────────────────────────
// Hitung dan simpan Availability, MTBF, MTTR ke tabel Analytic
// dari data Breakdown yang sudah ada untuk periode tertentu.
// Body: { period: 'monthly'|'weekly'|'daily', date: 'YYYY-MM-DD', machineId?: number }
// Jika machineId tidak diberikan, hitung untuk SEMUA mesin.
router.post('/analytics-compute', async (req, res, next) => {
  try {
    const { period = 'monthly', date, machineId } = req.body;
    const { start, end } = getPeriodRange(period, date);

    const whereClause = machineId ? { id: Number(machineId) } : {};
    const machines = await prisma.machine.findMany({
      where: whereClause,
      include: {
        breakdowns: {
          where: { date: { gte: start, lte: end } },
        },
      },
    });

    const results = [];
    for (const m of machines) {
      const bds = m.breakdowns;
      const totalBreakdowns = bds.length;
      const totalDowntime = bds.reduce((s, b) => s + b.durationHrs, 0);
      const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const plannedHours = m.plannedHours * days;
      const uptime = Math.max(0, plannedHours - totalDowntime);
      const availability = plannedHours > 0
        ? Math.max(0, Math.min(100, (uptime / plannedHours) * 100))
        : 0;
      const mtbf = totalBreakdowns > 0 ? uptime / totalBreakdowns : uptime;
      const mttr = totalBreakdowns > 0 ? totalDowntime / totalBreakdowns : 0;

      // Upsert: jika sudah ada record untuk mesin+periode ini, ganti nilainya
      const analytic = await prisma.analytic.create({
        data: {
          machineId: m.id,
          periodStart: start,
          periodEnd: end,
          periodType: period,
          availability: Number(availability.toFixed(2)),
          mtbf: Number(mtbf.toFixed(2)),
          mttr: Number(mttr.toFixed(2)),
          totalDowntime: Number(totalDowntime.toFixed(2)),
          totalBreakdowns,
          plannedHours: Number(plannedHours.toFixed(2)),
        },
      });
      results.push({ machine: m.name, ...analytic });
    }

    res.json({ computed: results.length, period, start, end, results });
  } catch (err) { next(err); }
});

// ── GET /api/analytics ──────────────────────────────────
// Ambil hasil analitik yang sudah disimpan.
// Query params: machineId (opsional), limit (default 100), offset (default 0)
router.get('/analytics', async (req, res, next) => {
  try {
    const { machineId, limit = 100, offset = 0 } = req.query;
    const where = machineId ? { machineId: Number(machineId) } : {};

    const [records, total] = await Promise.all([
      prisma.analytic.findMany({
        where,
        include: { machine: { select: { name: true, cluster: true, line: true } } },
        orderBy: [{ machineId: 'asc' }, { periodStart: 'desc' }],
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.analytic.count({ where }),
    ]);

    res.json({
      total,
      records: records.map((r) => ({
        id: r.id,
        machine: r.machine.name,
        cluster: r.machine.cluster,
        line: r.machine.line,
        periodStart: r.periodStart.toISOString().slice(0, 10),
        periodEnd: r.periodEnd.toISOString().slice(0, 10),
        periodType: r.periodType,
        availability: r.availability,
        mtbf: r.mtbf,
        mttr: r.mttr,
        totalDowntime: r.totalDowntime,
        totalBreakdowns: r.totalBreakdowns,
        plannedHours: r.plannedHours,
        notes: r.notes,
        calculatedAt: r.calculatedAt.toISOString().slice(0, 16).replace('T', ' '),
      })),
    });
  } catch (err) { next(err); }
});

module.exports = router;

// Minimal CSV parser supporting quoted fields with embedded commas/newlines.
function parseCsv(text) {
  // Auto-detect delimiter from the header line (comma, semicolon, or tab)
  const firstLine = text.split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis  = (firstLine.match(/;/g) || []).length;
  const tabs   = (firstLine.match(/\t/g) || []).length;
  const delim  = tabs > commas && tabs > semis ? '\t' : semis > commas ? ';' : ',';

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
    } else if (char === delim) {
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
