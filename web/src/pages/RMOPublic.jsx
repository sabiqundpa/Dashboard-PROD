import { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Maximize2, Minimize2, Table2, PencilLine } from 'lucide-react';
import ProduksiTable from '../components/ProduksiTable.jsx';

const API = '/api';
const SHIFTS = ['Shift 1', 'Shift 2', 'Shift 3'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

/* ── Layar sukses setelah submit ────────────────────── */
function SuccessView({ data, metrics, onReset }) {
  const tiles = [
    ['AR', metrics.ar], ['AVB', metrics.avb], ['PERF', metrics.perf],
    ['YIELD', metrics.yield], ['OEE', metrics.oee],
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', overflow: 'auto' }}>
      <CheckCircle2 size={56} style={{ color: '#00a884', marginBottom: 14 }} />
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.4px', marginBottom: 8 }}>
        Data Berhasil Dikirim!
      </div>
      <div style={{ color: '#5a6b73', fontSize: 14, lineHeight: 1.7, marginBottom: 20, maxWidth: 460 }}>
        {data.partName} — {data.proses} ({data.mesin}) untuk <strong>{data.line}</strong> telah tercatat.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, width: '100%', maxWidth: 560, marginBottom: 20 }}>
        {tiles.map(([label, val]) => (
          <div key={label} style={{ background: '#0e5a52', color: '#fff', borderRadius: 8, padding: '12px 6px' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{val}%</div>
            <div style={{ fontSize: 10, opacity: .85, marginTop: 2, letterSpacing: '.04em' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 480, background: '#f4f7f7', border: '1px solid #d7e0e0', borderRadius: 10, padding: '14px 18px', marginBottom: 22, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          ['Tanggal / Shift', `${data.tanggal} · ${data.shift}`],
          ['Cluster / Line', `${data.cluster} / ${data.line}`],
          ['Total OK / Total Proses', `${metrics.totalOk} / ${metrics.totalProses}`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#5a6b73', flexShrink: 0 }}>{k}</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      <button className="btn primary" style={{ width: '100%', maxWidth: 480, padding: '14px', fontSize: 16, color: '#fff', background: '#0e5a52', border: 'none', borderRadius: 8, cursor: 'pointer' }} onClick={onReset}>
        Buat Laporan Baru
      </button>
    </div>
  );
}

/* ── Popup konfirmasi batal ─────────────────────────── */
function CancelModal({ onConfirm, onDismiss }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onDismiss}>
      <div style={{ background: '#fff', border: '1px solid #d7e0e0', borderRadius: 12, padding: '32px 28px', maxWidth: 380, width: '88%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <AlertTriangle size={40} style={{ color: '#d9534f', marginBottom: 14 }} />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Batalkan Input?</div>
        <div style={{ fontSize: 13, color: '#5a6b73', lineHeight: 1.6, marginBottom: 24 }}>Semua data yang sudah diisi akan dihapus dan tidak tersimpan.</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ flex: 1, padding: '11px', fontSize: 14, background: '#eef2f2', border: '1px solid #d7e0e0', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }} onClick={onDismiss}>Tidak</button>
          <button style={{ flex: 1, padding: '11px', fontSize: 14, background: '#d9534f', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }} onClick={onConfirm}>Ya, Batalkan</button>
        </div>
      </div>
    </div>
  );
}

/* ── Label helper ───────────────────────────────────── */
function FL({ children, sub }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: '#5a6b73', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, display: 'block' }}>
      {children}
      {sub && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: .6, marginLeft: 5, fontSize: 11 }}>{sub}</span>}
    </label>
  );
}

/* Classic form-style tinted group box — mimics the "Input RMO" / "Maintenance"
   panels from the reference desktop app: colored border, floating title,
   tinted fill. */
const TINTS = {
  cyan:  { bg: '#e0f7f7', border: '#17a2b8' },
  peach: { bg: '#fde7d6', border: '#e08a3c' },
  gray:  { bg: '#eef1f1', border: '#8a9a9a' },
};
function Panel({ title, tint = 'cyan', children }) {
  const c = TINTS[tint];
  return (
    <div style={{ position: 'relative', border: `2px solid ${c.border}`, borderRadius: 6, background: c.bg, padding: '18px 16px 16px', marginBottom: 18 }}>
      <span style={{ position: 'absolute', top: -11, left: 14, background: c.bg, padding: '0 8px', fontSize: 12, fontWeight: 800, color: c.border, textTransform: 'uppercase', letterSpacing: '.05em' }}>
        {title}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px 20px' }}>
        {children}
      </div>
    </div>
  );
}

/* Read-only computed field (Total OK / Total Proses) */
function ComputedField({ label, sub, value }) {
  return (
    <div>
      <FL sub={sub}>{label}</FL>
      <div style={{ background: '#eef7f5', border: '1px solid #a9d2ca', borderRadius: 7, padding: '10px 12px', fontSize: 14, fontWeight: 700, color: '#0e5a52' }}>
        {value}
      </div>
    </div>
  );
}

function nowTimeStr() { return new Date().toTimeString().slice(0, 5); }

const EMPTY_FORM = {
  tanggal: todayStr(), waktu: nowTimeStr(), shift: SHIFTS[0], grupHead: '',
  cluster: '', line: '', partName: '', proses: '', mesin: '', manPower: '', cycleTime: '',
  noLot: '', waktuEfektif: '', plan: '',
  qtyOk: '', rwk: '', rjct: '',
  breakdownMesin: '', lossTime: '', keteranganLossTime: '',
  problem: '', rootCause: '',
};

const EMPTY_MASTER = { clusters: [], groupHeads: [], partNames: [], proses: [] };

/* ── Panel pencarian/filter untuk tab Data Tabel ────── */
function SearchBar({ query, setQuery, onRefresh }) {
  return (
    <div className="group-box" style={{ margin: '16px 24px 0', background: '#fff' }}>
      <span className="group-box-title">Pencarian</span>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1, maxWidth: 360 }}>
          <FL>Cari Part / Mesin / No Lot</FL>
          <input type="text" style={{ background: '#fff', border: '1px solid #c9d4d4', borderRadius: 7, padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
            value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ketik untuk mencari…" />
        </div>
        <button onClick={onRefresh} style={{ padding: '9px 20px', fontSize: 13, borderRadius: 7, background: '#0e5a52', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          Refresh
        </button>
      </div>
    </div>
  );
}

/* ── Halaman utama ──────────────────────────────────── */
export default function RMOPublic() {
  const [tab, setTab]                   = useState('input'); // input | table
  const [master, setMaster]             = useState(EMPTY_MASTER);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [busy, setBusy]                 = useState(false);
  const [errors, setErrors]             = useState({});
  const [done, setDone]                 = useState(null);
  const [doneMetrics, setDoneMetrics]   = useState(null);
  const [cancelWarn, setCancelWarn]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tableRows, setTableRows]       = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableQuery, setTableQuery]     = useState('');

  /* Tab title + force light theme */
  useEffect(() => {
    document.title = 'Resume Control Harian Produksi';
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.title = 'PROD';
      if (prev) document.documentElement.setAttribute('data-theme', prev);
      else document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  const loadMaster = useCallback(() => {
    fetch(`${API}/master`).then((r) => r.json()).then(setMaster).catch(() => {});
  }, []);
  useEffect(() => { loadMaster(); }, [loadMaster]);

  const loadTable = useCallback(() => {
    setTableLoading(true);
    fetch(`${API}/produksi-harian?period=all`).then((r) => r.json()).then((rows) => {
      setTableRows(rows);
      setTableLoading(false);
    }).catch(() => setTableLoading(false));
  }, []);

  const filteredTableRows = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    if (!q) return tableRows;
    return tableRows.filter((r) =>
      r.partName.toLowerCase().includes(q) ||
      r.mesin.toLowerCase().includes(q) ||
      (r.noLot || '').toLowerCase().includes(q) ||
      (r.proses || '').toLowerCase().includes(q),
    );
  }, [tableRows, tableQuery]);
  useEffect(() => { if (tab === 'table') loadTable(); }, [tab, loadTable]);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  /* Live-computed Total OK / Total Proses */
  const totalOk = useMemo(() => num(form.qtyOk), [form.qtyOk]);
  const totalProses = useMemo(() => totalOk + num(form.rwk) + num(form.rjct), [totalOk, form.rwk, form.rjct]);

  /* Cascading: Grup Head -> Cluster -> Part Name (+Cycle Time) -> Proses
     (+Line Produksi, Mesin, Man Power). */
  const partNameOptions = useMemo(
    () => master.partNames.filter((p) => p.cluster === form.cluster),
    [master.partNames, form.cluster],
  );
  const prosesOptions = useMemo(
    () => master.proses.filter((p) => p.partName === form.partName),
    [master.proses, form.partName],
  );

  function pickGroupHead(name) {
    const match = master.groupHeads.find((g) => g.name === name);
    setForm((f) => ({
      ...f, grupHead: name, cluster: match?.cluster || '',
      partName: '', cycleTime: '', proses: '', line: '', mesin: '', manPower: '',
    }));
  }
  function pickPartName(partName) {
    const match = master.partNames.find((p) => p.partName === partName);
    setForm((f) => ({
      ...f, partName, cycleTime: match?.cycleTime ?? '',
      proses: '', line: '', mesin: '', manPower: '',
    }));
  }
  function pickProses(prosesName) {
    const match = master.proses.find((p) => p.proses === prosesName && p.partName === form.partName);
    setForm((f) => ({
      ...f, proses: prosesName,
      line: match?.line || '', mesin: match?.mesin || '', manPower: match?.manPower || '',
    }));
  }

  const hasInput = Object.entries(form).some(([k, v]) => !['tanggal', 'waktu', 'shift'].includes(k) && !!v);

  function handleCancel() { if (hasInput) setCancelWarn(true); else reset(); }
  function reset() {
    setForm(EMPTY_FORM);
    setErrors({});
    setDone(null);
    setDoneMetrics(null);
    setCancelWarn(false);
  }

  async function submit() {
    const nextErrors = {};
    if (!form.grupHead.trim()) nextErrors.grupHead = 'Wajib diisi';
    if (!form.cluster) nextErrors.cluster = 'Wajib dipilih';
    if (!form.line.trim()) nextErrors.line = 'Wajib diisi';
    if (!form.partName) nextErrors.partName = 'Wajib dipilih';
    if (!form.proses) nextErrors.proses = 'Wajib dipilih';
    if (!form.mesin) nextErrors.mesin = 'Wajib dipilih';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const r = await fetch(`${API}/produksi-harian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal: form.tanggal, waktu: form.waktu, shift: form.shift, grup_head: form.grupHead,
          cluster: form.cluster, line: form.line,
          no_lot: form.noLot, part_name: form.partName, proses: form.proses, mesin: form.mesin,
          man_power: form.manPower, cycle_time: form.cycleTime,
          waktu_efektif: form.waktuEfektif, plan: form.plan,
          ok1: form.qtyOk, ok2: 0, rwk: form.rwk, rjct: form.rjct,
          breakdown_mesin: form.breakdownMesin, lost_time: form.lossTime,
          keterangan: form.keteranganLossTime,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Gagal mengirim');

      if (form.problem.trim()) {
        fetch(`${API}/problem-log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tanggal: form.tanggal, line: form.line, part_name: form.partName,
            problem: form.problem,
            root_cause: form.rootCause,
            status: 'open',
          }),
        }).catch(() => {});
      }

      setDoneMetrics(data);
      setDone({ ...form });
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  /* Styles */
  const inp = {
    background: '#fff', border: '1px solid #c9d4d4',
    borderRadius: 7, padding: '10px 12px', color: '#1c2b2b',
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };
  const inpErr = { ...inp, borderColor: '#d9534f' };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#eef3f3', color: '#1c2b2b', overflow: 'hidden' }}>

      {/* ── Header teal ───────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #0e5a52, #14746a)', padding: '16px 32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setTab('input')}
            style={{ background: tab === 'input' ? '#fff' : 'rgba(255,255,255,.15)', color: tab === 'input' ? '#0e5a52' : '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 7, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
          >
            <PencilLine size={14} /> Input
          </button>
          <button
            onClick={() => setTab('table')}
            style={{ background: tab === 'table' ? '#fff' : 'rgba(255,255,255,.15)', color: tab === 'table' ? '#0e5a52' : '#fff', border: '1px solid rgba(255,255,255,.4)', borderRadius: 7, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
          >
            <Table2 size={14} /> Data Tabel
          </button>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '.01em', textAlign: 'center' }}>
          Resume Control Harian Produksi
        </div>
        <div style={{ width: 32 }} />
      </div>

      {/* ── Konten ────────────────────────────────────── */}
      {tab === 'table' ? (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <SearchBar query={tableQuery} setQuery={setTableQuery} onRefresh={loadTable} />
          <div style={{ padding: '16px 24px' }}>
            <div style={{ position: 'relative', border: '2px solid #17a2b8', borderRadius: 6, background: '#fff', padding: '18px 12px 12px' }}>
              <span style={{ position: 'absolute', top: -11, left: 14, background: '#fff', padding: '0 8px', fontSize: 12, fontWeight: 800, color: '#17a2b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Tabel Resume Produksi
              </span>
              <ProduksiTable rows={filteredTableRows} loading={tableLoading} />
            </div>
          </div>
        </div>
      ) : done ? (
        <SuccessView data={done} metrics={doneMetrics} onReset={reset} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px 40px 16px', maxWidth: 1000, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          <div style={{ flex: 1 }}>

            <div className="group-box" style={{ marginBottom: 18 }}>
              <span className="group-box-title">Grup Head</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <div>
                  <FL>Nama Grup Head *</FL>
                  <select style={errors.grupHead ? inpErr : inp} value={form.grupHead} onChange={(e) => pickGroupHead(e.target.value)}>
                    <option value="">Pilih…</option>
                    {master.groupHeads.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                  {errors.grupHead && <div style={{ color: '#d9534f', fontSize: 12, marginTop: 5 }}>{errors.grupHead}</div>}
                </div>
                <ComputedField label="Cluster" sub="otomatis dari Grup Head" value={form.cluster || '—'} />
              </div>
            </div>

            <Panel title="Input Produksi" tint="cyan">
              <div>
                <FL>Tanggal *</FL>
                <input type="date" style={inp} value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
              </div>
              <div>
                <FL>Waktu *</FL>
                <input type="time" style={inp} value={form.waktu} onChange={(e) => set('waktu', e.target.value)} />
              </div>
              <div>
                <FL>Shift *</FL>
                <select style={inp} value={form.shift} onChange={(e) => set('shift', e.target.value)}>
                  {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <FL>No Lot</FL>
                <input type="text" style={inp} value={form.noLot} onChange={(e) => set('noLot', e.target.value)} />
              </div>

              <div>
                <FL>Part Name *</FL>
                <select style={errors.partName ? inpErr : inp} value={form.partName} disabled={!form.cluster} onChange={(e) => pickPartName(e.target.value)}>
                  <option value="">{form.cluster ? 'Pilih…' : 'Pilih Grup Head dulu'}</option>
                  {partNameOptions.map((p) => <option key={p.id} value={p.partName}>{p.partName}</option>)}
                </select>
              </div>
              <div>
                <FL>Proses *</FL>
                <select style={errors.proses ? inpErr : inp} value={form.proses} disabled={!form.partName} onChange={(e) => pickProses(e.target.value)}>
                  <option value="">Pilih…</option>
                  {prosesOptions.map((p) => <option key={p.id} value={p.proses}>{p.proses}</option>)}
                </select>
              </div>
              <ComputedField label="Line Produksi" sub="otomatis dari Proses" value={form.line || '—'} />
              <ComputedField label="Mesin" sub="otomatis dari Proses" value={form.mesin || '—'} />

              <ComputedField label="Man Power" sub="otomatis dari Proses" value={form.manPower || '—'} />
              <div>
                <FL sub="detik/pcs">Cycle Time</FL>
                <input type="number" style={inp} value={form.cycleTime} onChange={(e) => set('cycleTime', e.target.value)} />
              </div>
              <div>
                <FL sub="jam">Waktu Efektif</FL>
                <input type="number" style={inp} value={form.waktuEfektif} onChange={(e) => set('waktuEfektif', e.target.value)} />
              </div>
              <div />
            </Panel>

            <Panel title="Aktual Produksi" tint="peach">
              <div>
                <FL sub="pcs">Plan</FL>
                <input type="number" style={inp} value={form.plan} onChange={(e) => set('plan', e.target.value)} />
              </div>
              <div>
                <FL sub="pcs">QTY Produksi OK</FL>
                <input type="number" style={inp} value={form.qtyOk} onChange={(e) => set('qtyOk', e.target.value)} />
              </div>
              <div>
                <FL sub="pcs">Rework</FL>
                <input type="number" style={inp} value={form.rwk} onChange={(e) => set('rwk', e.target.value)} />
              </div>
              <div>
                <FL sub="pcs">Reject</FL>
                <input type="number" style={inp} value={form.rjct} onChange={(e) => set('rjct', e.target.value)} />
              </div>

              <ComputedField label="Total OK" sub="= QTY Produksi OK" value={totalOk.toLocaleString()} />
              <ComputedField label="Total Proses" sub="= OK+Rwk+Rjct" value={totalProses.toLocaleString()} />
              <div />
              <div />
            </Panel>

            <Panel title="Downtime" tint="gray">
              <div>
                <FL sub="menit">Breakdown Mesin</FL>
                <input type="number" style={inp} value={form.breakdownMesin} onChange={(e) => set('breakdownMesin', e.target.value)} />
              </div>
              <div>
                <FL sub="menit">Loss Time</FL>
                <input type="number" style={inp} value={form.lossTime} onChange={(e) => set('lossTime', e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <FL>Keterangan Loss Time</FL>
                <input type="text" style={inp} value={form.keteranganLossTime} onChange={(e) => set('keteranganLossTime', e.target.value)} />
              </div>
            </Panel>

            <Panel title="Problem & Root Cause (opsional)" tint="peach">
              <div style={{ gridColumn: 'span 2' }}>
                <FL>Problem</FL>
                <input type="text" style={inp} value={form.problem} onChange={(e) => set('problem', e.target.value)} placeholder="Isi jika ada masalah yang perlu ditindaklanjuti" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <FL>Root Cause</FL>
                <input type="text" style={inp} value={form.rootCause} onChange={(e) => set('rootCause', e.target.value)} />
              </div>
            </Panel>

          </div>

          {/* ── Footer ──────────────────────────────────── */}
          <div style={{ flexShrink: 0, paddingTop: 16, borderTop: '1px solid #c9d4d4', marginTop: 16, display: 'flex', gap: 12 }}>
            <button
              style={{ flex: '0 0 auto', padding: '13px 28px', fontSize: 15, borderRadius: 8, background: '#eef2f2', border: '1px solid #c9d4d4', cursor: 'pointer', fontWeight: 600 }}
              onClick={handleCancel}>
              Batal
            </button>
            <button
              style={{ flex: 1, padding: '13px', fontSize: 15, borderRadius: 8, color: '#fff', background: '#0e5a52', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              disabled={busy} onClick={submit}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>

        </div>
      )}

      {/* ── Tombol fullscreen ─────────────────────────── */}
      <button onClick={toggleFullscreen}
        title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
        style={{ position: 'fixed', bottom: 14, right: 14, width: 34, height: 34, borderRadius: 8, background: '#fff', border: '1px solid #c9d4d4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0e5a52' }}>
        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>

      {cancelWarn && <CancelModal onConfirm={reset} onDismiss={() => setCancelWarn(false)} />}

    </div>
  );
}
