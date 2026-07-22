import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Maximize2, Minimize2, Upload, Table2, PencilLine } from 'lucide-react';

const API = '/api';
const CLUSTERS = ['AD', 'BC', 'EF', 'FI'];
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

/* ── Popup hasil import master data ─────────────────── */
function ImportResultModal({ result, error, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid #d7e0e0', borderRadius: 12, padding: '28px', maxWidth: 380, width: '88%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        {error ? (
          <>
            <AlertTriangle size={36} style={{ color: '#d9534f', marginBottom: 10 }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Import Gagal</div>
            <div style={{ fontSize: 13, color: '#5a6b73' }}>{error}</div>
          </>
        ) : (
          <>
            <CheckCircle2 size={36} style={{ color: '#00a884', marginBottom: 10 }} />
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Import Selesai</div>
            <div style={{ fontSize: 13, color: '#5a6b73' }}>
              {result.imported} baris master data diimpor, {result.skipped} dilewati (data tidak lengkap), dari total {result.total} baris.
            </div>
          </>
        )}
        <button style={{ marginTop: 18, padding: '9px 24px', fontSize: 13, background: '#0e5a52', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600 }} onClick={onClose}>Tutup</button>
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

function GroupLabel({ children }) {
  return (
    <div style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700, color: '#0e5a52', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 8, marginBottom: -2, borderBottom: '2px solid #0e5a52', paddingBottom: 4 }}>
      {children}
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

const EMPTY_FORM = {
  tanggal: todayStr(), shift: SHIFTS[0],
  cluster: '', line: '', partName: '', proses: '', mesin: '', manPower: '', cycleTime: '',
  noLot: '', waktuEfektif: '', plan: '',
  ok1: '', ok2: '', rwk: '', rjct: '',
  breakdownMesin: '', lossTime: '', keteranganLossTime: '',
};

/* ── Tabel hasil input ───────────────────────────────── */
function DataTable({ rows, loading }) {
  const th = { padding: '8px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: '#3d4b4b', background: '#f5c542', border: '1px solid #d9b93a', whiteSpace: 'nowrap', position: 'sticky', top: 0 };
  const td = { padding: '7px 10px', fontSize: 12.5, border: '1px solid #dfe6e6', whiteSpace: 'nowrap' };
  const tdOk = { ...td, background: '#e3f3ea' };
  const tdPct = (v, target) => ({ ...td, background: v >= target ? '#d7f0dd' : '#fdeaea', fontWeight: 700, textAlign: 'center' });

  const avg = (key) => rows.length ? (rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length).toFixed(1) : '0.0';

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px', background: '#eef3f3' }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#5a6b73' }}>Memuat…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#5a6b73' }}>Belum ada data.</div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', background: '#fff' }}>
          <thead>
            <tr>
              {['Nama Parts', 'No Lot', 'Proses', 'Mesin', 'MP', 'CT', 'Waktu Efektif (Jam)', 'Plan',
                'OK1', 'OK2', 'Rwk', 'Rjct', 'Total OK', 'Total Proses',
                'Breakdown MC', 'Lost Time', 'Keterangan',
                'AR', 'AVB', 'PERF', 'YIELD', 'OEE'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.partName}</td>
                <td style={td}>{r.noLot || '—'}</td>
                <td style={td}>{r.proses}</td>
                <td style={td}>{r.mesin}</td>
                <td style={td}>{r.manPower || '—'}</td>
                <td style={td}>{r.cycleTime}</td>
                <td style={td}>{r.waktuEfektif}</td>
                <td style={td}>{r.plan.toLocaleString()}</td>
                <td style={td}>{r.ok1.toLocaleString()}</td>
                <td style={td}>{r.ok2.toLocaleString()}</td>
                <td style={td}>{r.rework || ''}</td>
                <td style={td}>{r.reject || ''}</td>
                <td style={tdOk}>{r.totalOk.toLocaleString()}</td>
                <td style={tdOk}>{r.totalProses.toLocaleString()}</td>
                <td style={td}>{r.breakdownMesin || ''}</td>
                <td style={td}>{r.lostTime || ''}</td>
                <td style={{ ...td, whiteSpace: 'normal', minWidth: 160 }}>{r.keterangan || ''}</td>
                <td style={tdPct(r.ar, 100)}>{r.ar}%</td>
                <td style={tdPct(r.avb, 90)}>{r.avb}%</td>
                <td style={tdPct(r.perf, 95)}>{r.perf}%</td>
                <td style={tdPct(r.yield, 100)}>{r.yield}%</td>
                <td style={tdPct(r.oee, 85)}>{r.oee}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...td, fontWeight: 700, background: '#f5c542' }} colSpan={17}>PENCAPAIAN RATA-RATA</td>
              <td style={{ ...td, fontWeight: 700, background: '#f5c542', textAlign: 'center' }}>{avg('ar')}%</td>
              <td style={{ ...td, fontWeight: 700, background: '#f5c542', textAlign: 'center' }}>{avg('avb')}%</td>
              <td style={{ ...td, fontWeight: 700, background: '#f5c542', textAlign: 'center' }}>{avg('perf')}%</td>
              <td style={{ ...td, fontWeight: 700, background: '#f5c542', textAlign: 'center' }}>{avg('yield')}%</td>
              <td style={{ ...td, fontWeight: 700, background: '#f5c542', textAlign: 'center' }}>{avg('oee')}%</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}

/* ── Halaman utama ──────────────────────────────────── */
export default function RMOPublic() {
  const [tab, setTab]                   = useState('input'); // input | table
  const [routing, setRouting]           = useState([]);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [busy, setBusy]                 = useState(false);
  const [errors, setErrors]             = useState({});
  const [done, setDone]                 = useState(null);
  const [doneMetrics, setDoneMetrics]   = useState(null);
  const [cancelWarn, setCancelWarn]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError]   = useState(null);
  const [importBusy, setImportBusy]     = useState(false);
  const [tableRows, setTableRows]       = useState([]);
  const [tableLoading, setTableLoading] = useState(false);

  const fileInputRef = useRef(null);

  /* Tab title + force light theme */
  useEffect(() => {
    document.title = 'Resume Control Harian Produksi';
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.title = 'MTN-DPA Monitoring';
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

  const loadRouting = useCallback(() => {
    fetch(`${API}/part-routing`).then((r) => r.json()).then(setRouting).catch(() => {});
  }, []);
  useEffect(() => { loadRouting(); }, [loadRouting]);

  const loadTable = useCallback(() => {
    setTableLoading(true);
    fetch(`${API}/produksi-harian?period=all`).then((r) => r.json()).then((rows) => {
      setTableRows(rows);
      setTableLoading(false);
    }).catch(() => setTableLoading(false));
  }, []);
  useEffect(() => { if (tab === 'table') loadTable(); }, [tab, loadTable]);

  function set(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  /* Cascading options derived from master data */
  const lines = useMemo(
    () => [...new Set(routing.filter((r) => r.cluster === form.cluster).map((r) => r.line))].sort(),
    [routing, form.cluster],
  );
  const partNames = useMemo(
    () => [...new Set(routing.filter((r) => r.cluster === form.cluster && r.line === form.line).map((r) => r.partName))].sort(),
    [routing, form.cluster, form.line],
  );
  const prosesList = useMemo(
    () => [...new Set(routing.filter((r) => r.cluster === form.cluster && r.line === form.line && r.partName === form.partName).map((r) => r.proses))],
    [routing, form.cluster, form.line, form.partName],
  );
  const mesinList = useMemo(
    () => routing.filter((r) => r.cluster === form.cluster && r.line === form.line && r.partName === form.partName && r.proses === form.proses),
    [routing, form.cluster, form.line, form.partName, form.proses],
  );

  /* Live-computed Total OK / Total Proses */
  const totalOk = useMemo(() => num(form.ok1) + num(form.ok2), [form.ok1, form.ok2]);
  const totalProses = useMemo(() => totalOk + num(form.rwk) + num(form.rjct), [totalOk, form.rwk, form.rjct]);

  function pickCluster(v) { setForm((f) => ({ ...f, cluster: v, line: '', partName: '', proses: '', mesin: '', manPower: '', cycleTime: '' })); }
  function pickLine(v) { setForm((f) => ({ ...f, line: v, partName: '', proses: '', mesin: '', manPower: '', cycleTime: '' })); }
  function pickPart(v) { setForm((f) => ({ ...f, partName: v, proses: '', mesin: '', manPower: '', cycleTime: '' })); }
  function pickProses(v) { setForm((f) => ({ ...f, proses: v, mesin: '', manPower: '', cycleTime: '' })); }
  function pickMesin(v) {
    const match = mesinList.find((r) => r.mesin === v);
    setForm((f) => ({ ...f, mesin: v, manPower: match?.manPower || f.manPower, cycleTime: match?.cycleTime || f.cycleTime }));
  }

  const hasInput = Object.entries(form).some(([k, v]) => !['tanggal', 'shift'].includes(k) && !!v);

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
    if (!form.cluster) nextErrors.cluster = 'Wajib dipilih';
    if (!form.line) nextErrors.line = 'Wajib dipilih';
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
          tanggal: form.tanggal, shift: form.shift, cluster: form.cluster, line: form.line,
          no_lot: form.noLot, part_name: form.partName, proses: form.proses, mesin: form.mesin,
          man_power: form.manPower, cycle_time: form.cycleTime,
          waktu_efektif: form.waktuEfektif, plan: form.plan,
          ok1: form.ok1, ok2: form.ok2, rwk: form.rwk, rjct: form.rjct,
          breakdown_mesin: form.breakdownMesin, lost_time: form.lossTime,
          keterangan: form.keteranganLossTime,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Gagal mengirim');
      setDoneMetrics(data);
      setDone({ ...form });
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportBusy(true);
    setImportError(null);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/part-routing/import`, { method: 'POST', body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Gagal import');
      setImportResult(data);
      loadRouting();
    } catch (err) { setImportError(err.message); }
    setImportBusy(false);
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
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '.05em', textTransform: 'uppercase', textAlign: 'center' }}>
          Resume Control Harian Produksi
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importBusy}
          title="Import Master Data (CSV: Cluster, Line, Part Name, Part Number, Proses, Nama Mesin, Man Power, Cycle Time)"
          style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.4)', borderRadius: 7, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
        >
          <Upload size={16} />
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportFile} />
      </div>

      {/* ── Konten ────────────────────────────────────── */}
      {tab === 'table' ? (
        <DataTable rows={tableRows} loading={tableLoading} />
      ) : done ? (
        <SuccessView data={done} metrics={doneMetrics} onReset={reset} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', padding: '20px 40px 16px', maxWidth: 1000, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px 20px', alignContent: 'start' }}>

            {/* Tanggal, Shift, No Lot */}
            <div>
              <FL>Tanggal *</FL>
              <input type="date" style={inp} value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
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
            <div />

            {/* Cluster, Line Produksi, Part Name, Proses */}
            <GroupLabel>Routing Produksi</GroupLabel>
            <div>
              <FL>Cluster *</FL>
              <select style={errors.cluster ? inpErr : inp} value={form.cluster} onChange={(e) => pickCluster(e.target.value)}>
                <option value="">Pilih…</option>
                {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FL>Line Produksi *</FL>
              <select style={errors.line ? inpErr : inp} value={form.line} disabled={!form.cluster} onChange={(e) => pickLine(e.target.value)}>
                <option value="">Pilih…</option>
                {lines.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <FL>Part Name *</FL>
              <select style={errors.partName ? inpErr : inp} value={form.partName} disabled={!form.line} onChange={(e) => pickPart(e.target.value)}>
                <option value="">Pilih…</option>
                {partNames.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <FL>Proses *</FL>
              <select style={errors.proses ? inpErr : inp} value={form.proses} disabled={!form.partName} onChange={(e) => pickProses(e.target.value)}>
                <option value="">Pilih…</option>
                {prosesList.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Mesin, Man Power, Cycle Time, Waktu Efektif */}
            <div>
              <FL>Mesin *</FL>
              <select style={errors.mesin ? inpErr : inp} value={form.mesin} disabled={!form.proses} onChange={(e) => pickMesin(e.target.value)}>
                <option value="">Pilih…</option>
                {mesinList.map((r) => <option key={r.mesin} value={r.mesin}>{r.mesin}</option>)}
              </select>
            </div>
            <div>
              <FL>Man Power</FL>
              <input type="text" style={inp} value={form.manPower} onChange={(e) => set('manPower', e.target.value)} />
            </div>
            <div>
              <FL sub="detik/pcs">Cycle Time</FL>
              <input type="number" style={inp} value={form.cycleTime} onChange={(e) => set('cycleTime', e.target.value)} />
            </div>
            <div>
              <FL sub="jam">Waktu Efektif</FL>
              <input type="number" style={inp} value={form.waktuEfektif} onChange={(e) => set('waktuEfektif', e.target.value)} />
            </div>

            {/* Plan, OK1, OK2, Rework */}
            <GroupLabel>Aktual</GroupLabel>
            <div>
              <FL sub="pcs">Plan</FL>
              <input type="number" style={inp} value={form.plan} onChange={(e) => set('plan', e.target.value)} />
            </div>
            <div>
              <FL sub="pcs">OK 1</FL>
              <input type="number" style={inp} value={form.ok1} onChange={(e) => set('ok1', e.target.value)} />
            </div>
            <div>
              <FL sub="pcs">OK 2</FL>
              <input type="number" style={inp} value={form.ok2} onChange={(e) => set('ok2', e.target.value)} />
            </div>
            <div>
              <FL sub="pcs">Rework</FL>
              <input type="number" style={inp} value={form.rwk} onChange={(e) => set('rwk', e.target.value)} />
            </div>

            {/* Reject, Total OK, Total Proses (live computed) */}
            <div>
              <FL sub="pcs">Reject</FL>
              <input type="number" style={inp} value={form.rjct} onChange={(e) => set('rjct', e.target.value)} />
            </div>
            <ComputedField label="Total OK" sub="= OK1 + OK2" value={totalOk.toLocaleString()} />
            <ComputedField label="Total Proses" sub="= OK1+OK2+Rwk+Rjct" value={totalProses.toLocaleString()} />
            <div />

            {/* Breakdown, Loss Time, Keterangan */}
            <GroupLabel>Downtime</GroupLabel>
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
      {(importResult || importError) && (
        <ImportResultModal result={importResult} error={importError} onClose={() => { setImportResult(null); setImportError(null); }} />
      )}

    </div>
  );
}
