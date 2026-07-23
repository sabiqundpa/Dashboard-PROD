const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { getPeriodRange, daysInRange, calcPlannedHours } = require('../lib/period');
const { signToken, requireAuth } = require('../lib/auth');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Fetch WorkingCalendar rows for the date range. Skipped for very long ranges
// (period=all spans 2000–2099) to avoid a huge IN list — those fall back to
// calendar days inside calcPlannedHours.
async function fetchWcRows(start, end) {
  const sy = start.getFullYear(), ey = end.getFullYear();
  if (ey - sy > 10) return [];
  const years = Array.from({ length: ey - sy + 1 }, (_, i) => sy + i);
  return prisma.workingCalendar.findMany({ where: { year: { in: years } } });
}

// Optional ?machine=<name> filter, used across breakdown queries to scope
// the whole dashboard to a single machine.
function machineWhere(req) {
  if (req.query.machine) return { machine: { name: req.query.machine } };
  if (req.query.line) return { machine: { line: req.query.line } };
  return {};
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

// ── GET /api/master ────────────────────────────────────
// Public — master data relasional lengkap untuk dropdown bertingkat di
// form /rmo: Group Head → Cluster → Part Name (+Cycle Time) → Proses
// (+Line Produksi, Mesin, Man Power).
router.get('/master', async (req, res, next) => {
  try {
    const [clusters, groupHeads, partNames, proses] = await Promise.all([
      prisma.masterCluster.findMany({ orderBy: { cluster: 'asc' } }),
      prisma.masterGroupHead.findMany({ orderBy: { name: 'asc' } }),
      prisma.masterPartName.findMany({ orderBy: { partName: 'asc' } }),
      prisma.masterProses.findMany({ orderBy: { proses: 'asc' } }),
    ]);
    res.json({
      clusters: clusters.map((r) => r.cluster).filter(Boolean),
      groupHeads: groupHeads.map((r) => ({ id: r.id, name: r.name, cluster: r.cluster })),
      partNames: partNames.map((r) => ({ id: r.id, partName: r.partName, cluster: r.cluster, cycleTime: r.cycleTime })),
      proses: proses.map((r) => ({ id: r.id, proses: r.proses, partName: r.partName, line: r.line, mesin: r.mesin, manPower: r.manPower })),
    });
  } catch (err) { next(err); }
});

// ── GET /api/legacy-lookups ─────────────────────────────
// Login-gated — daftar nama mentah dari tabel lama "MP", "Mesin", "Proses",
// "Nama Parts" yang dibuat manual di Supabase sebelum Master Data
// relasional ada. Tabel-tabel itu cuma daftar nama datar tanpa relasi
// (tidak tahu Part mana pakai Proses/Mesin/MP mana), jadi tidak bisa
// auto-migrate ke MasterPartName/MasterProses. Dipakai sebagai saran
// autocomplete (datalist) saja di menu Master Data supaya penamaan
// konsisten dengan histori, sambil relasinya diisi manual sekali oleh
// admin (yang tahu kombinasi aslinya di lapangan).
router.get('/legacy-lookups', requireAuth, async (req, res, next) => {
  try {
    const [mp, mesin, proses, partNames] = await Promise.all([
      prisma.$queryRaw`SELECT "MP" AS name FROM "MP" ORDER BY "MP"`,
      prisma.$queryRaw`SELECT "Mesin" AS name FROM "Mesin" ORDER BY "Mesin"`,
      prisma.$queryRaw`SELECT "Proses" AS name FROM "Proses" ORDER BY "Proses"`,
      prisma.$queryRaw`SELECT "Nama Parts" AS name FROM "Nama Parts" ORDER BY "Nama Parts"`,
    ]);
    res.json({
      manPower: mp.map((r) => r.name?.trim()).filter(Boolean),
      mesin: mesin.map((r) => r.name?.trim()).filter(Boolean),
      proses: proses.map((r) => r.name?.trim()).filter(Boolean),
      partNames: partNames.map((r) => r.name?.trim()).filter(Boolean),
    });
  } catch (err) { next(err); }
});

// ── Master Data CRUD (login-gated) ─────────────────────
// Dipakai oleh menu "Master Data" di dashboard. Path benar-benar flat —
// SATU segmen saja setelah /api/ (contoh: /master-group-head, bukan
// /master/group-head). Vercel edge routing (fungsi catch-all
// api/[...path].js) 404 untuk path apa pun yang punya lebih dari satu
// segmen literal setelah /api/, meski bukan dynamic /:id. Ini pernah
// bikin seluruh menu Master Data + Dashboard ringkasan + halaman AR
// gagal total di production walau lolos test di localhost.

router.post('/master-group-head', requireAuth, async (req, res, next) => {
  try {
    const { name, cluster } = req.body;
    if (!name || !cluster) return res.status(400).json({ error: 'name dan cluster wajib diisi' });
    const record = await prisma.masterGroupHead.upsert({
      where: { name }, update: { cluster }, create: { name, cluster },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});
router.post('/master-group-head-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { name, cluster } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (cluster !== undefined) data.cluster = cluster;
    const record = await prisma.masterGroupHead.update({ where: { id }, data });
    res.json(record);
  } catch (err) { next(err); }
});
router.post('/master-group-head-delete', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await prisma.masterGroupHead.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/master-part-name', requireAuth, async (req, res, next) => {
  try {
    const { part_name, cluster, cycle_time } = req.body;
    if (!part_name || !cluster) return res.status(400).json({ error: 'part_name dan cluster wajib diisi' });
    const record = await prisma.masterPartName.upsert({
      where: { partName: part_name },
      update: { cluster, cycleTime: cycle_time ? Number(cycle_time) : 0 },
      create: { partName: part_name, cluster, cycleTime: cycle_time ? Number(cycle_time) : 0 },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});
router.post('/master-part-name-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { part_name, cluster, cycle_time } = req.body;
    const data = {};
    if (part_name !== undefined) data.partName = part_name;
    if (cluster !== undefined) data.cluster = cluster;
    if (cycle_time !== undefined) data.cycleTime = Number(cycle_time) || 0;
    const record = await prisma.masterPartName.update({ where: { id }, data });
    res.json(record);
  } catch (err) { next(err); }
});
router.post('/master-part-name-delete', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await prisma.masterPartName.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/master-proses', requireAuth, async (req, res, next) => {
  try {
    const { proses, part_name, line, mesin, man_power } = req.body;
    if (!proses || !part_name || !line || !mesin) {
      return res.status(400).json({ error: 'proses, part_name, line, dan mesin wajib diisi' });
    }
    const record = await prisma.masterProses.upsert({
      where: { proses_partName: { proses, partName: part_name } },
      update: { line, mesin, manPower: man_power || '' },
      create: { proses, partName: part_name, line, mesin, manPower: man_power || '' },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});
router.post('/master-proses-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { proses, part_name, line, mesin, man_power } = req.body;
    const data = {};
    if (proses !== undefined) data.proses = proses;
    if (part_name !== undefined) data.partName = part_name;
    if (line !== undefined) data.line = line;
    if (mesin !== undefined) data.mesin = mesin;
    if (man_power !== undefined) data.manPower = man_power;
    const record = await prisma.masterProses.update({ where: { id }, data });
    res.json(record);
  } catch (err) { next(err); }
});
router.post('/master-proses-delete', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await prisma.masterProses.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/master/import ────────────────────────────
// Login-gated — import CSV massal: Group Head, Cluster, Part Name,
// Cycle Time, Proses, Line Produksi, Mesin, Man Power. Tiap baris mengisi
// ketiga tabel master (upsert, aman dijalankan berulang).
router.post('/master-import', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rows = parseCsv(req.file.buffer.toString('utf-8'));

    let groupHeads = 0, partNames = 0, prosesRows = 0, skipped = 0;
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

      const cluster = field('Cluster').toUpperCase();
      const groupHead = field('Group Head', 'Grup Head');
      const partName = field('Part Name', 'Nama Part');
      const proses = field('Proses');
      const line = field('Line Produksi', 'Line');
      const mesin = field('Mesin', 'Nama Mesin');
      const manPower = field('Man Power', 'MP');
      const cycleTimeRaw = field('Cycle Time', 'CT');
      const cycleTime = cycleTimeRaw && !isNaN(Number(cycleTimeRaw)) ? Number(cycleTimeRaw) : 0;

      if (!cluster) { skipped++; continue; }

      if (groupHead) {
        await prisma.masterGroupHead.upsert({
          where: { name: groupHead }, update: { cluster }, create: { name: groupHead, cluster },
        });
        groupHeads++;
      }
      if (partName) {
        await prisma.masterPartName.upsert({
          where: { partName }, update: { cluster, cycleTime }, create: { partName, cluster, cycleTime },
        });
        partNames++;
        if (proses && line && mesin) {
          await prisma.masterProses.upsert({
            where: { proses_partName: { proses, partName } },
            update: { line, mesin, manPower },
            create: { proses, partName, line, mesin, manPower },
          });
          prosesRows++;
        }
      }
    }

    res.json({ groupHeads, partNames, proses: prosesRows, skipped, total: rows.length });
  } catch (err) { next(err); }
});

// ── POST /api/produksi-harian ─────────────────────────
// Public — submit satu baris Resume Control Harian Produksi (Part + Proses +
// Mesin) dari halaman /rmo (tanpa login).
router.post('/produksi-harian', async (req, res, next) => {
  try {
    const {
      tanggal, waktu, shift, cluster, line, grup_head,
      no_lot, part_name, part_number, proses, mesin, man_power, cycle_time,
      waktu_efektif, plan, ok1, ok2, rwk, rjct,
      breakdown_mesin, lost_time, keterangan,
    } = req.body;

    if (!tanggal || !shift || !cluster || !line || !part_name || !proses || !mesin) {
      return res.status(400).json({ error: 'tanggal, shift, cluster, line, part, proses, dan mesin wajib diisi' });
    }

    const record = await prisma.produksiHarian.create({
      data: {
        tanggal: new Date(tanggal),
        waktu: waktu || null,
        shift, cluster, line,
        grupHead: grup_head || null,
        noLot: no_lot || null,
        partName: part_name,
        partNumber: part_number || null,
        proses, mesin,
        manPower: man_power || null,
        cycleTime: cycle_time ? Number(cycle_time) : 0,
        waktuEfektif: waktu_efektif ? Number(waktu_efektif) : 0,
        plan: plan ? Number(plan) : 0,
        ok1: ok1 ? Number(ok1) : 0,
        ok2: ok2 ? Number(ok2) : 0,
        rework: rwk ? Number(rwk) : 0,
        reject: rjct ? Number(rjct) : 0,
        breakdownMesin: breakdown_mesin ? Number(breakdown_mesin) : 0,
        lostTime: lost_time ? Number(lost_time) : 0,
        keterangan: keterangan || null,
      },
    });

    res.status(201).json({ id: record.id, ...rowMetrics(record) });
  } catch (err) { next(err); }
});

// ── POST /api/produksi-harian-update ───────────────────
// Login-gated — admin mengedit baris Resume Control Harian Produksi yang
// sudah tersimpan (mis. salah input Plan/OK/Reject). Path flat, id di
// body (lihat catatan di atas soal Vercel routing).
router.post('/produksi-harian-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const {
      tanggal, waktu, shift, cluster, line, grup_head,
      no_lot, part_name, part_number, proses, mesin, man_power, cycle_time,
      waktu_efektif, plan, ok1, ok2, rwk, rjct,
      breakdown_mesin, lost_time, keterangan,
    } = req.body;

    const data = {};
    if (tanggal !== undefined) data.tanggal = new Date(tanggal);
    if (waktu !== undefined) data.waktu = waktu || null;
    if (shift !== undefined) data.shift = shift;
    if (cluster !== undefined) data.cluster = cluster;
    if (line !== undefined) data.line = line;
    if (grup_head !== undefined) data.grupHead = grup_head || null;
    if (no_lot !== undefined) data.noLot = no_lot || null;
    if (part_name !== undefined) data.partName = part_name;
    if (part_number !== undefined) data.partNumber = part_number || null;
    if (proses !== undefined) data.proses = proses;
    if (mesin !== undefined) data.mesin = mesin;
    if (man_power !== undefined) data.manPower = man_power || null;
    if (cycle_time !== undefined) data.cycleTime = Number(cycle_time) || 0;
    if (waktu_efektif !== undefined) data.waktuEfektif = Number(waktu_efektif) || 0;
    if (plan !== undefined) data.plan = Number(plan) || 0;
    if (ok1 !== undefined) data.ok1 = Number(ok1) || 0;
    if (ok2 !== undefined) data.ok2 = Number(ok2) || 0;
    if (rwk !== undefined) data.rework = Number(rwk) || 0;
    if (rjct !== undefined) data.reject = Number(rjct) || 0;
    if (breakdown_mesin !== undefined) data.breakdownMesin = Number(breakdown_mesin) || 0;
    if (lost_time !== undefined) data.lostTime = Number(lost_time) || 0;
    if (keterangan !== undefined) data.keterangan = keterangan || null;

    const record = await prisma.produksiHarian.update({ where: { id }, data });
    res.json({ id: record.id, ...rowMetrics(record) });
  } catch (err) { next(err); }
});

// ── POST /api/produksi-harian-delete ───────────────────
// Login-gated — admin menghapus baris yang salah input total.
router.post('/produksi-harian-delete', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await prisma.produksiHarian.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Per-row AR/AVB/PERF/YIELD/OEE — sama persis dengan rumus di format Excel.
// Total OK = OK1 + OK2. Total Proses = OK1 + OK2 + Rework + Reject.
function rowMetrics(r) {
  const pct = (n, d) => d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0;
  const totalOk = r.ok1 + r.ok2;
  const totalProses = r.ok1 + r.ok2 + r.rework + r.reject;
  const waktuEfektifMin = r.waktuEfektif * 60;

  const avb  = pct((waktuEfektifMin * 0.9) - r.breakdownMesin, waktuEfektifMin);
  const perf = pct((r.cycleTime * totalOk * 1.05) / 60, waktuEfektifMin - r.lostTime);
  const yld  = pct(totalOk, totalProses);
  const ar   = pct(totalProses, r.plan);
  const oee  = avb * perf * yld / 10000;

  return {
    totalOk, totalProses,
    avb: Number(avb.toFixed(1)),
    perf: Number(perf.toFixed(1)),
    yield: Number(yld.toFixed(1)),
    ar: Number(ar.toFixed(1)),
    oee: Number(oee.toFixed(1)),
  };
}

// ── GET /api/produksi-harian/summary ──────────────────
// Ringkasan OEE (Availability, Performance, Yield, AR, OEE) diagregasi dari
// semua baris Resume Control Harian Produksi dalam periode terpilih.
router.get('/produksi-harian-summary', requireAuth, async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const rows = await prisma.produksiHarian.findMany({
      where: { tanggal: { gte: start, lte: end } },
    });

    const sumWaktuEfektifMin = rows.reduce((s, r) => s + r.waktuEfektif * 60, 0);
    const sumBreakdownMesin  = rows.reduce((s, r) => s + r.breakdownMesin, 0);
    const sumLostTime        = rows.reduce((s, r) => s + r.lostTime, 0);
    const sumCycleTimeOk     = rows.reduce((s, r) => s + r.cycleTime * (r.ok1 + r.ok2), 0);
    const sumTotalOk         = rows.reduce((s, r) => s + r.ok1 + r.ok2, 0);
    const sumTotalProses     = rows.reduce((s, r) => s + r.ok1 + r.ok2 + r.rework + r.reject, 0);
    const sumReject          = rows.reduce((s, r) => s + r.reject, 0);
    const sumPlan            = rows.reduce((s, r) => s + r.plan, 0);

    const pct = (n, d) => d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0;

    const availability = pct((sumWaktuEfektifMin * 0.9) - sumBreakdownMesin, sumWaktuEfektifMin);
    const performance   = pct((sumCycleTimeOk * 1.05) / 60, sumWaktuEfektifMin - sumLostTime);
    const yieldPct       = pct(sumTotalOk, sumTotalProses);
    const ar             = pct(sumTotalProses, sumPlan);
    const rejection       = pct(sumReject, sumTotalProses);
    const oee             = availability * performance * yieldPct / 10000;

    res.json({
      availability: Number(availability.toFixed(1)),
      performance: Number(performance.toFixed(1)),
      yield: Number(yieldPct.toFixed(1)),
      ar: Number(ar.toFixed(1)),
      rejection: Number(rejection.toFixed(1)),
      oee: Number(oee.toFixed(1)),
      entries: rows.length,
    });
  } catch (err) { next(err); }
});

// ── GET /api/produksi-harian/ar-by-cluster ─────────────
// AR rata-rata per Cluster (AD/BC/EF/FI) dalam periode terpilih — untuk pie
// chart drill-down AR di dashboard.
router.get('/ar-by-cluster', requireAuth, async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const rows = await prisma.produksiHarian.findMany({
      where: { tanggal: { gte: start, lte: end } },
    });

    const byCluster = {};
    for (const r of rows) {
      if (!byCluster[r.cluster]) byCluster[r.cluster] = { totalProses: 0, plan: 0 };
      byCluster[r.cluster].totalProses += r.ok1 + r.ok2 + r.rework + r.reject;
      byCluster[r.cluster].plan += r.plan;
    }

    const pct = (n, d) => d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0;
    const result = Object.entries(byCluster).map(([cluster, v]) => ({
      cluster,
      ar: Number(pct(v.totalProses, v.plan).toFixed(1)),
    }));
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/produksi-harian/ar-by-line ────────────────
// AR rata-rata per Line Produksi dalam periode terpilih — untuk ranking
// 5 Line AR tertinggi/terendah di halaman detail AR.
router.get('/ar-by-line', requireAuth, async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const rows = await prisma.produksiHarian.findMany({
      where: { tanggal: { gte: start, lte: end } },
    });

    const byLine = {};
    for (const r of rows) {
      if (!byLine[r.line]) byLine[r.line] = { cluster: r.cluster, totalProses: 0, plan: 0 };
      byLine[r.line].totalProses += r.ok1 + r.ok2 + r.rework + r.reject;
      byLine[r.line].plan += r.plan;
    }

    const pct = (n, d) => d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0;
    const result = Object.entries(byLine).map(([line, v]) => ({
      line,
      cluster: v.cluster,
      ar: Number(pct(v.totalProses, v.plan).toFixed(1)),
    })).sort((a, b) => b.ar - a.ar);
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/produksi-harian/ar-trend ──────────────────
// Tren AR untuk grafik drill-down AR di dashboard, mengikuti pola PeriodPicker:
//   period=today -> per jam (24 bucket), pakai created_at karena "tanggal"
//                   tidak menyimpan jam
//   period=month -> per hari dalam bulan dari ?date
//   period=year  -> per bulan dalam tahun dari ?date
router.get('/ar-trend', requireAuth, async (req, res, next) => {
  try {
    const period = req.query.period || 'month';
    const ref = req.query.date ? new Date(req.query.date) : new Date();
    const pct = (n, d) => d > 0 ? Math.max(0, Math.min(100, (n / d) * 100)) : 0;
    const clusterFilter = req.query.cluster ? { cluster: req.query.cluster } : {};

    if (period === 'today') {
      const start = new Date(ref); start.setHours(0, 0, 0, 0);
      const end = new Date(ref); end.setHours(23, 59, 59, 999);
      const rows = await prisma.produksiHarian.findMany({ where: { tanggal: { gte: start, lte: end }, ...clusterFilter } });

      const byHour = Array.from({ length: 24 }, (_, h) => ({
        day: String(h).padStart(2, '0'), totalProses: 0, plan: 0,
      }));
      for (const r of rows) {
        const parsed = r.waktu ? parseInt(r.waktu.split(':')[0], 10) : NaN;
        const h = !isNaN(parsed) ? parsed : r.createdAt.getHours();
        if (byHour[h]) {
          byHour[h].totalProses += r.ok1 + r.ok2 + r.rework + r.reject;
          byHour[h].plan += r.plan;
        }
      }
      return res.json(byHour.map((d) => ({ day: d.day, ar: Number(pct(d.totalProses, d.plan).toFixed(1)) })));
    }

    if (period === 'year') {
      const year = ref.getFullYear();
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      const rows = await prisma.produksiHarian.findMany({ where: { tanggal: { gte: start, lte: end }, ...clusterFilter } });

      const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const byMonth = MONTHS.map((m) => ({ day: m, totalProses: 0, plan: 0 }));
      for (const r of rows) {
        const idx = r.tanggal.getUTCMonth();
        byMonth[idx].totalProses += r.ok1 + r.ok2 + r.rework + r.reject;
        byMonth[idx].plan += r.plan;
      }
      return res.json(byMonth.map((d) => ({ day: d.day, ar: Number(pct(d.totalProses, d.plan).toFixed(1)) })));
    }

    // default: month -> per hari dalam bulan
    const year = ref.getFullYear(), month = ref.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const rows = await prisma.produksiHarian.findMany({ where: { tanggal: { gte: start, lte: end }, ...clusterFilter } });

    const daysInMonth = end.getDate();
    const byDay = Array.from({ length: daysInMonth }, (_, i) => ({
      day: String(i + 1).padStart(2, '0'), totalProses: 0, plan: 0,
    }));
    for (const r of rows) {
      const idx = r.tanggal.getUTCDate() - 1;
      if (byDay[idx]) {
        byDay[idx].totalProses += r.ok1 + r.ok2 + r.rework + r.reject;
        byDay[idx].plan += r.plan;
      }
    }
    res.json(byDay.map((d) => ({ day: d.day, ar: Number(pct(d.totalProses, d.plan).toFixed(1)) })));
  } catch (err) { next(err); }
});

// ── GET /api/problem-log ───────────────────────────────
// Public — daftar problem/root-cause log, untuk tabel di halaman detail AR.
router.get('/problem-log', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.problemLog.findMany({ orderBy: { id: 'desc' } });
    res.json(rows.map((r) => ({
      id: r.id,
      tanggal: r.tanggal ? r.tanggal.toISOString().slice(0, 10) : null,
      line: r.line,
      partName: r.partName,
      problem: r.problem,
      rootCause: r.rootCause,
      temporaryAction: r.temporaryAction,
      permanentAction: r.permanentAction,
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
      status: r.status,
      closeComment: r.closeComment,
      closedAt: r.closedAt ? r.closedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) { next(err); }
});

// ── POST /api/problem-log ──────────────────────────────
// Public — tambah baris problem/root-cause log baru. Dikirim juga dari
// form /rmo saat isi Resume Control Harian (ikut tanggal/line/part yang
// lagi diisi) supaya problem-nya jelas terkait line & part yang mana.
router.post('/problem-log', async (req, res, next) => {
  try {
    const { tanggal, line, part_name, problem, root_cause, temporary_action, permanent_action, due_date, status } = req.body;
    if (!problem) return res.status(400).json({ error: 'problem wajib diisi' });
    const record = await prisma.problemLog.create({
      data: {
        tanggal: tanggal ? new Date(tanggal) : null,
        line: line || null,
        partName: part_name || null,
        problem,
        rootCause: root_cause || null,
        temporaryAction: temporary_action || null,
        permanentAction: permanent_action || null,
        dueDate: due_date ? new Date(due_date) : null,
        status: status || 'open',
      },
    });
    res.status(201).json({ id: record.id });
  } catch (err) { next(err); }
});

// ── POST /api/problem-log-update ───────────────────────
// Edit status/field problem log (mis. tandai selesai). Flat path — id di
// body (Vercel edge routing 404 untuk nested path /problem-log/:id).
router.post('/problem-log-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { problem, root_cause, temporary_action, permanent_action, due_date, status, close_comment } = req.body;
    const data = {};
    if (problem !== undefined) data.problem = problem;
    if (root_cause !== undefined) data.rootCause = root_cause || null;
    if (temporary_action !== undefined) data.temporaryAction = temporary_action || null;
    if (permanent_action !== undefined) data.permanentAction = permanent_action || null;
    if (due_date !== undefined) data.dueDate = due_date ? new Date(due_date) : null;
    if (status !== undefined) {
      data.status = status;
      if (status === 'closed') {
        data.closeComment = close_comment || null;
        data.closedAt = new Date();
      }
    }
    const record = await prisma.problemLog.update({ where: { id }, data });
    res.json(record);
  } catch (err) { next(err); }
});

// ── POST /api/problem-log-delete ───────────────────────
router.post('/problem-log-delete', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await prisma.problemLog.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── GET /api/produksi-harian ───────────────────────────
// Public — daftar seluruh baris Resume Control Harian Produksi dalam
// periode terpilih, dengan metrik AR/AVB/PERF/YIELD/OEE per baris, untuk
// tabel hasil input di halaman /rmo.
router.get('/produksi-harian', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const rows = await prisma.produksiHarian.findMany({
      where: { tanggal: { gte: start, lte: end } },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });
    res.json(rows.map((r) => ({
      id: r.id,
      tanggal: r.tanggal.toISOString().slice(0, 10),
      shift: r.shift,
      cluster: r.cluster,
      line: r.line,
      noLot: r.noLot,
      partName: r.partName,
      proses: r.proses,
      mesin: r.mesin,
      manPower: r.manPower,
      cycleTime: r.cycleTime,
      waktuEfektif: r.waktuEfektif,
      plan: r.plan,
      ok1: r.ok1,
      ok2: r.ok2,
      rework: r.rework,
      reject: r.reject,
      breakdownMesin: r.breakdownMesin,
      lostTime: r.lostTime,
      keterangan: r.keterangan,
      ...rowMetrics(r),
    })));
  } catch (err) { next(err); }
});


// ── GET /api/machines ──────────────────────────────
router.get('/machines', async (req, res, next) => {
  try {
    const { start, end } = getPeriodRange(req.query.period, req.query.date, req.query.start, req.query.end);
    const lineFilter = req.query.line ? { line: req.query.line } : {};
    const [machines, wcRows] = await Promise.all([
      prisma.machine.findMany({
        where: lineFilter,
        orderBy: { name: 'asc' },
        include: {
          breakdowns: {
            where: { date: { gte: start, lte: end } },
            orderBy: { date: 'desc' },
          },
        },
      }),
      fetchWcRows(start, end),
    ]);

    const result = machines.map((m) => {
      const downtimeHrs = m.breakdowns.reduce((s, b) => s + b.durationHrs, 0);
      const plannedHrs = calcPlannedHours(start, end, m.plannedHours, wcRows);
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
    // Only active machines contribute to planned hours (and thus availability).
    // When a specific machine is requested by name, honour that regardless of active flag.
    const machineFilter = req.query.machine
      ? { name: req.query.machine }
      : req.query.line
      ? { line: req.query.line, active: true }
      : { active: true };

    const [machines, breakdowns, wcRows] = await Promise.all([
      prisma.machine.findMany({ where: machineFilter }),
      prisma.breakdown.findMany({ where: { date: { gte: start, lte: end }, ...machineWhere(req) } }),
      fetchWcRows(start, end),
    ]);

    const downtimeHrs = breakdowns.reduce((s, b) => s + b.durationHrs, 0);
    const plannedHrsPerDay = machines.reduce((s, m) => s + m.plannedHours, 0);
    const plannedHrsTotal = calcPlannedHours(start, end, plannedHrsPerDay, wcRows);

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
      where: { date: { gte: start, lte: end }, ...machineWhere(req) },
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
      where: { date: { gte: start, lte: end }, ...machineWhere(req) },
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

    // all: group every breakdown by year-month across all time
    if (period === 'all') {
      const allBD = await prisma.breakdown.findMany({
        where: machineWhere(req),
        orderBy: { date: 'asc' },
      });
      if (!allBD.length) return res.json([]);
      const map = {};
      for (const b of allBD) {
        const y = b.date.getUTCFullYear();
        const m = b.date.getUTCMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        if (!map[key]) {
          const lbl = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
          map[key] = { day: `${lbl}'${String(y).slice(2)}`, hrs: 0 };
        }
        map[key].hrs += b.durationHrs;
      }
      const sorted = Object.keys(map).sort();
      return res.json(sorted.map((k) => ({ day: map[k].day, hrs: map[k].hrs })));
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

    const machines = await prisma.machine.findMany({
      where: req.query.machine
        ? { name: req.query.machine }
        : req.query.line
        ? { line: req.query.line }
        : { active: true },
    });
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
        day: 'Avg',
        mtbf: Number(mtbf.toFixed(1)),
        mttr: Number(mttr.toFixed(1)),
        mtbfTarget: Number(avgTarget.toFixed(1)),
        mttrTarget,
      };
    }

    if (period === 'month') {
      const year = now.getFullYear();
      // Fetch configured working days; fall back to calendar days if not set.
      const wcRows = await prisma.workingCalendar.findMany({ where: { year } });
      const wcMap = {};
      for (const r of wcRows) wcMap[r.month] = r.workingDays;

      const months = [];
      for (let m = 0; m < 12; m++) {
        const monthNum = m + 1;
        const calDays = new Date(year, m + 1, 0).getDate();
        const workingDays = wcMap[monthNum] ?? calDays; // use configured hari kerja, else calendar days
        months.push({
          key: `${year}-${String(monthNum).padStart(2, '0')}`,
          day: new Date(year, m, 1).toLocaleDateString('en-US', { month: 'short' }),
          downtimeHrs: 0, count: 0, plannedHrs: plannedPerDay * workingDays,
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

    // all: group every breakdown by year-month across all time
    if (period === 'all') {
      const allBD = await prisma.breakdown.findMany({
        where: machineWhere(req),
        orderBy: { date: 'asc' },
      });
      if (!allBD.length) return res.json([]);

      const map = {};
      for (const b of allBD) {
        const y = b.date.getUTCFullYear();
        const m = b.date.getUTCMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        if (!map[key]) map[key] = { year: y, month: m, downtimeHrs: 0, count: 0 };
        map[key].downtimeHrs += b.durationHrs;
        map[key].count += 1;
      }

      const years = [...new Set(Object.values(map).map((v) => v.year))];
      const wcRows = await prisma.workingCalendar.findMany({ where: { year: { in: years } } });
      const wcMap = {};
      for (const r of wcRows) wcMap[`${r.year}-${r.month}`] = r.workingDays;

      const sorted = Object.keys(map).sort();
      const planFor = (year, month) => {
        const calDays = new Date(year, month, 0).getDate();
        return plannedPerDay * (wcMap[`${year}-${month}`] ?? calDays);
      };

      const rows = sorted.map((key) => {
        const { year, month, downtimeHrs, count } = map[key];
        const lbl = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        return { day: `${lbl}'${String(year).slice(2)}`, ...bucket(downtimeHrs, count, planFor(year, month)) };
      });

      const totalDT = Object.values(map).reduce((s, v) => s + v.downtimeHrs, 0);
      const totalC  = Object.values(map).reduce((s, v) => s + v.count, 0);
      const totalP  = sorted.reduce((s, key) => s + planFor(map[key].year, map[key].month), 0);
      rows.push(totalRow(totalDT, totalC, totalP, sorted.map((key) => planFor(map[key].year, map[key].month))));
      return res.json(rows);
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
    const { cause, resolution, action, category, pic_gh, pic_mtn, date, start_time, end_date, end_time, duration_hrs, repair_date, repair_time, machine_name } = req.body;
    const data = {};
    if (cause        !== undefined) data.cause       = String(cause);
    if (resolution   !== undefined) data.resolution  = resolution ? String(resolution) : null;
    if (action       !== undefined) data.action      = action ? String(action) : null;
    if (category     !== undefined) data.category    = String(category);
    if (pic_gh       !== undefined) data.picGh       = pic_gh ? String(pic_gh) : null;
    if (pic_mtn      !== undefined) data.picMtn      = pic_mtn ? String(pic_mtn) : null;
    if (date         !== undefined) data.date        = new Date(date);
    if (start_time   !== undefined) data.startTime   = start_time || null;
    if (end_date     !== undefined) data.endDate     = end_date ? new Date(end_date) : null;
    if (end_time     !== undefined) data.endTime     = end_time || null;
    if (duration_hrs !== undefined) data.durationHrs = parseFloat(duration_hrs) || 0;
    if (repair_date  !== undefined) data.repairDate  = repair_date ? new Date(repair_date) : null;
    if (repair_time  !== undefined) data.repairTime  = repair_time || null;
    if (machine_name !== undefined && String(machine_name).trim()) {
      const machine = await prisma.machine.findUnique({ where: { name: String(machine_name).trim() } });
      if (machine) {
        data.machineId = machine.id;
      }
      // if not found in master data, leave machineId unchanged so the save still succeeds
    }
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

// ── POST /api/breakdown-update ─────────────────────────
// Edit work order fields. Flat path — id in body (same pattern as
// breakdown-close; Vercel edge routing returns 404 for nested paths
// like /breakdown/:id before Express is even reached).
router.post('/breakdown-update', async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { cause, resolution, action, category, pic_gh, pic_mtn, date, start_time, end_date, end_time, duration_hrs, repair_date, repair_time, machine_name } = req.body;
    const data = {};
    if (cause      !== undefined) data.cause      = String(cause);
    if (resolution !== undefined) data.resolution = resolution ? String(resolution) : null;
    if (action     !== undefined) data.action     = action ? String(action) : null;
    if (category   !== undefined) data.category   = String(category);
    if (pic_gh     !== undefined) data.picGh      = pic_gh ? String(pic_gh) : null;
    if (pic_mtn    !== undefined) data.picMtn     = pic_mtn ? String(pic_mtn) : null;
    if (date       !== undefined) data.date       = new Date(date);
    if (start_time !== undefined) data.startTime  = start_time || null;
    if (end_date   !== undefined) data.endDate    = end_date ? new Date(end_date) : null;
    if (end_time   !== undefined) data.endTime    = end_time || null;
    if (repair_date !== undefined) data.repairDate = repair_date ? new Date(repair_date) : null;
    if (repair_time !== undefined) data.repairTime = repair_time || null;
    // Auto-calculate durationHrs when end_date+end_time are present
    if (end_date && end_time) {
      const existing = await prisma.breakdown.findUnique({ where: { id }, select: { date: true, startTime: true } });
      if (existing) {
        const d = date ? new Date(date) : existing.date;
        const t = start_time !== undefined ? start_time : existing.startTime;
        data.durationHrs = computeDurationBetween(d, t, new Date(end_date), end_time);
      }
    } else if (duration_hrs !== undefined) {
      data.durationHrs = parseFloat(duration_hrs) || 0;
    }
    if (machine_name !== undefined && String(machine_name).trim()) {
      const machine = await prisma.machine.findUnique({ where: { name: String(machine_name).trim() } });
      if (machine) data.machineId = machine.id;
    }
    await prisma.breakdown.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/breakdown-delete ─────────────────────────
// Delete a work order. Flat path — id in body (same pattern as
// breakdown-update to avoid Vercel nested-path routing issue).
router.post('/breakdown-delete', async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await prisma.breakdown.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/recalculate-downtime ────────────────────
// Batch-fix all breakdowns where durationHrs=0 but endDate+endTime
// are set. Computes the correct value from date/startTime→endDate/endTime.
router.post('/recalculate-downtime', async (req, res, next) => {
  try {
    const records = await prisma.breakdown.findMany({
      where: { durationHrs: 0, endDate: { not: null }, endTime: { not: null } },
      select: { id: true, date: true, startTime: true, endDate: true, endTime: true },
    });
    let updated = 0;
    for (const r of records) {
      const hrs = computeDurationBetween(r.date, r.startTime, r.endDate, r.endTime);
      if (hrs > 0) {
        await prisma.breakdown.update({ where: { id: r.id }, data: { durationHrs: hrs } });
        updated++;
      }
    }
    res.json({ updated, total: records.length });
  } catch (err) { next(err); }
});

// ── POST /api/remove-duplicate-breakdowns ─────────────
// Scan seluruh database, temukan breakdown dengan fingerprint sama
// (machineId + tanggal + startTime + cause), hapus yang ID-nya lebih baru,
// pertahankan yang paling lama (ID terkecil).
router.post('/remove-duplicate-breakdowns', async (req, res, next) => {
  try {
    const all = await prisma.breakdown.findMany({
      select: { id: true, machineId: true, date: true, startTime: true, cause: true },
      orderBy: { id: 'asc' },
    });

    const seen = new Map();
    const toDelete = [];
    for (const b of all) {
      const d = b.date instanceof Date ? b.date : new Date(b.date);
      const causeKey = String(b.cause || '').trim().toLowerCase().slice(0, 50);
      const fp = `${b.machineId}|${d.toISOString().slice(0, 10)}|${b.startTime || ''}|${causeKey}`;
      if (seen.has(fp)) {
        toDelete.push(b.id);
      } else {
        seen.set(fp, b.id);
      }
    }

    if (toDelete.length > 0) {
      await prisma.breakdown.deleteMany({ where: { id: { in: toDelete } } });
    }

    res.json({ removed: toDelete.length, total: all.length });
  } catch (err) { next(err); }
});

// ── POST /api/machine-merge ────────────────────────────
// Move all breakdowns from one machine to another, then delete the source.
// Used to consolidate duplicate machine names created during CSV import.
router.post('/machine-merge', async (req, res, next) => {
  try {
    const { fromName, toName } = req.body;
    if (!fromName || !toName || fromName === toName) {
      return res.status(400).json({ error: 'fromName and toName must be different non-empty strings' });
    }
    const from = await prisma.machine.findUnique({ where: { name: fromName } });
    const to   = await prisma.machine.findUnique({ where: { name: toName } });
    if (!from) return res.status(404).json({ error: `Machine "${fromName}" not found` });
    if (!to)   return res.status(404).json({ error: `Machine "${toName}" not found` });
    const moved = await prisma.breakdown.updateMany({
      where: { machineId: from.id },
      data:  { machineId: to.id },
    });
    await prisma.machine.delete({ where: { id: from.id } });
    res.json({ moved: moved.count, from: fromName, to: toName });
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

    const HEADERS = ['NO', 'Tanggal Lapor', 'Waktu Lapor', 'Nama Mesin', 'Problem', 'Penyelesaian', 'Tanggal Mulai', 'Waktu Mulai', 'Tanggal Selesai', 'Waktu Selesai', 'Waktu Pengerjaan', 'Downtime', 'Status', 'PIC MTN'];
    const csvLines = [HEADERS.join(',')];
    bs.forEach((b, i) => {
      const akumulasi = (b.repairDate && b.repairTime && b.endDate && b.endTime)
        ? computeDurationBetween(b.repairDate, b.repairTime, b.endDate, b.endTime)
        : '';
      const row = [
        i + 1,
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
        b.status === 'resolved' ? 'Close' : 'Open',
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
// Accepts JSON body (CSV is parsed client-side to avoid serverless timeout):
// { breakdowns: [...], newMachineNames: [...] }
// Each breakdown has either machineId (already resolved) or machineName (needs creation).
router.post('/import', async (req, res, next) => {
  try {
    const { breakdowns: inputRows = [], newMachineNames = [] } = req.body;
    if (!Array.isArray(inputRows) || inputRows.length === 0) {
      return res.status(400).json({ error: 'Tidak ada baris valid dalam file' });
    }

    // Create any machines that the client couldn't match (case-insensitive miss)
    const nameToId = new Map();
    if (newMachineNames.length > 0) {
      await prisma.machine.createMany({
        data: newMachineNames.map((name) => ({ name, cluster: '', line: '' })),
        skipDuplicates: true,
      });
      const created = await prisma.machine.findMany({
        where: { name: { in: newMachineNames } },
        select: { id: true, name: true },
      });
      created.forEach((m) => nameToId.set(m.name, m.id));
    }

    // Resolve any rows that still carry machineName instead of machineId
    const resolvedRows = inputRows
      .map((row) => {
        const { machineName, ...rest } = row;
        const machineId = rest.machineId ?? nameToId.get(machineName);
        if (!machineId) return null;
        return {
          ...rest,
          machineId,
          date:    rest.date    ? new Date(rest.date)    : new Date(),
          endDate: rest.endDate ? new Date(rest.endDate) : null,
        };
      })
      .filter(Boolean);

    // Build a fingerprint to detect duplicates: machineId|date|startTime|cause(50)
    function mkFp(machineId, date, startTime, cause) {
      const d = date instanceof Date ? date : new Date(date);
      const causeKey = String(cause || '').trim().toLowerCase().slice(0, 50);
      return `${machineId}|${d.toISOString().slice(0, 10)}|${startTime || ''}|${causeKey}`;
    }

    // Query existing breakdowns in the relevant machine+date window
    const machineIds = [...new Set(resolvedRows.map((r) => r.machineId))];
    const allDates   = resolvedRows.map((r) => r.date instanceof Date ? r.date : new Date(r.date));
    const minDate    = new Date(Math.min(...allDates));
    const maxDate    = new Date(Math.max(...allDates));

    const existing = await prisma.breakdown.findMany({
      where: { machineId: { in: machineIds }, date: { gte: minDate, lte: maxDate } },
      select: { machineId: true, date: true, startTime: true, cause: true },
    });

    const existingFps = new Set(
      existing.map((e) => mkFp(e.machineId, e.date, e.startTime, e.cause))
    );

    const newRows = [];
    const duplicateRows = [];
    for (const row of resolvedRows) {
      const fp = mkFp(row.machineId, row.date, row.startTime, row.cause);
      if (existingFps.has(fp)) {
        duplicateRows.push(row);
      } else {
        existingFps.add(fp); // prevent within-file duplication too
        newRows.push(row);
      }
    }

    if (newRows.length > 0) {
      await prisma.breakdown.createMany({ data: newRows });
    }

    const matched = inputRows.filter((r) => r.machineId).length;
    res.json({
      imported: newRows.length,
      duplicates: duplicateRows.length,
      total: inputRows.length,
      matchedMachines: matched,
      newMachines: newMachineNames.length,
    });
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

    const wcRows = await fetchWcRows(start, end);
    const results = [];
    for (const m of machines) {
      const bds = m.breakdowns;
      const totalBreakdowns = bds.length;
      const totalDowntime = bds.reduce((s, b) => s + b.durationHrs, 0);
      const plannedHours = calcPlannedHours(start, end, m.plannedHours, wcRows);
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

// ── GET /api/working-calendar?year=YYYY ───────────────
// Hari kerja per bulan yang dikonfigurasi via menu Analitik.
router.get('/working-calendar', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const records = await prisma.workingCalendar.findMany({ where: { year }, orderBy: { month: 'asc' } });
    res.json({ year, records });
  } catch (err) { next(err); }
});

// ── PUT /api/working-calendar ──────────────────────────
// Upsert hari kerja untuk bulan tertentu: { year, month, workingDays }
router.put('/working-calendar', async (req, res, next) => {
  try {
    const year = parseInt(req.body.year);
    const month = parseInt(req.body.month);
    const workingDays = parseInt(req.body.workingDays);
    if (!year || !month || isNaN(workingDays) || workingDays < 1) {
      return res.status(400).json({ error: 'year, month, workingDays (≥1) wajib diisi' });
    }
    const record = await prisma.workingCalendar.upsert({
      where: { year_month: { year, month } },
      update: { workingDays },
      create: { year, month, workingDays },
    });
    res.json({ ok: true, record });
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
  const s = String(value).trim();
  // Handle dd/mm/yyyy and dd-mm-yyyy (Indonesian/manual format)
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
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
