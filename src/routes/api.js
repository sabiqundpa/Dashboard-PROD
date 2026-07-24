const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { getPeriodRange } = require('../lib/period');
const { signToken, requireAuth } = require('../lib/auth');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// ── GET /api/health ──────────────────────────────────
// Quick diagnostic: confirms the function can reach Postgres. Left public
// (no auth) so it stays useful for uptime checks even when logged out.
router.get('/health', async (req, res) => {
  try {
    const [{ count }] = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "ProduksiHarian"`;
    res.json({ ok: true, produksiRows: count });
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
// form /rmo: Group Head → Cluster → Part Name → Proses (+Cycle Time,
// Line Produksi, Mesin, Man Power).
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
      partNames: partNames.map((r) => ({ id: r.id, partName: r.partName, cluster: r.cluster })),
      proses: proses.map((r) => ({ id: r.id, proses: r.proses, partName: r.partName, line: r.line, mesin: r.mesin, manPower: r.manPower, cycleTime: r.cycleTime })),
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
    const { part_name, cluster } = req.body;
    if (!part_name || !cluster) return res.status(400).json({ error: 'part_name dan cluster wajib diisi' });
    const record = await prisma.masterPartName.upsert({
      where: { partName: part_name },
      update: { cluster },
      create: { partName: part_name, cluster },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});
router.post('/master-part-name-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { part_name, cluster } = req.body;
    const existing = await prisma.masterPartName.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = {};
    if (part_name !== undefined) data.partName = part_name;
    if (cluster !== undefined) data.cluster = cluster;
    // partName di MasterProses cuma string biasa (bukan foreign key), jadi
    // kalau nama Part Name diganti harus ikut diupdate di semua Proses
    // turunannya supaya tidak jadi yatim (tidak muncul lagi di dropdown).
    if (part_name !== undefined && part_name !== existing.partName) {
      await prisma.masterProses.updateMany({ where: { partName: existing.partName }, data: { partName: part_name } });
    }
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
    const { proses, part_name, line, mesin, man_power, cycle_time } = req.body;
    if (!proses || !part_name || !line || !mesin) {
      return res.status(400).json({ error: 'proses, part_name, line, dan mesin wajib diisi' });
    }
    const cycleTime = cycle_time ? Number(cycle_time) : 0;
    const record = await prisma.masterProses.upsert({
      where: { proses_partName: { proses, partName: part_name } },
      update: { line, mesin, manPower: man_power || '', cycleTime },
      create: { proses, partName: part_name, line, mesin, manPower: man_power || '', cycleTime },
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});
router.post('/master-proses-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { proses, part_name, line, mesin, man_power, cycle_time } = req.body;
    const data = {};
    if (proses !== undefined) data.proses = proses;
    if (part_name !== undefined) data.partName = part_name;
    if (line !== undefined) data.line = line;
    if (mesin !== undefined) data.mesin = mesin;
    if (man_power !== undefined) data.manPower = man_power;
    if (cycle_time !== undefined) data.cycleTime = Number(cycle_time) || 0;
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
          where: { partName }, update: { cluster }, create: { partName, cluster },
        });
        partNames++;
        if (proses && line && mesin) {
          await prisma.masterProses.upsert({
            where: { proses_partName: { proses, partName } },
            update: { line, mesin, manPower, cycleTime },
            create: { proses, partName, line, mesin, manPower, cycleTime },
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
      notes: r.notes,
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
// Edit field problem log. Flat path — id di body (Vercel edge routing
// 404 untuk nested path /problem-log/:id). Status open/closed adalah
// toggle independen dari Notes -- keduanya bisa dikirim terpisah, tidak
// saling mensyaratkan.
router.post('/problem-log-update', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.body.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { problem, root_cause, temporary_action, permanent_action, due_date, status, notes } = req.body;
    const data = {};
    if (problem !== undefined) data.problem = problem;
    if (root_cause !== undefined) data.rootCause = root_cause || null;
    if (temporary_action !== undefined) data.temporaryAction = temporary_action || null;
    if (permanent_action !== undefined) data.permanentAction = permanent_action || null;
    if (due_date !== undefined) data.dueDate = due_date ? new Date(due_date) : null;
    if (notes !== undefined) data.notes = notes || null;
    if (status !== undefined) {
      data.status = status;
      data.closedAt = status === 'closed' ? new Date() : null;
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
