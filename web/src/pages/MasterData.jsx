import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend, apiSendForm } from '../api.js';
import { useToast } from '../ToastContext.jsx';

const CLUSTERS = ['AD', 'BC', 'EF', 'FI'];

const TABS = [
  { key: 'groupHead', label: 'Grup Head' },
  { key: 'partName', label: 'Part Name' },
  { key: 'proses', label: 'Proses' },
];

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

export default function MasterData() {
  const { logout } = useAuth();
  const showToast = useToast();
  const [tab, setTab] = useState('groupHead');
  const [master, setMaster] = useState({ clusters: CLUSTERS, groupHeads: [], partNames: [], proses: [] });
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/master', { clusters: CLUSTERS, groupHeads: [], partNames: [], proses: [] }, logout)
      .then((d) => { setMaster(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [logout]);
  useEffect(() => { load(); }, [load]);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiSendForm('/master/import', fd, logout);
      showToast(`Import selesai: ${data.groupHeads} grup head, ${data.partNames} part, ${data.proses} proses (${data.skipped} dilewati)`, 'green');
      load();
    } catch (err) { showToast(err.message, 'red'); }
  }

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Master Data</div>
          <div className="page-sub">Kelola Grup Head, Part Name, dan Proses beserta relasinya — dipakai sebagai dropdown di form Resume Control Harian Produksi</div>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '9px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
              background: 'none', border: 'none', cursor: 'pointer',
              color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'groupHead' && <GroupHeadTab data={master.groupHeads} loading={loading} onChanged={load} logout={logout} />}
      {tab === 'partName' && <PartNameTab data={master.partNames} loading={loading} onChanged={load} logout={logout} />}
      {tab === 'proses' && <ProsesTab data={master.proses} partNames={master.partNames} loading={loading} onChanged={load} logout={logout} />}
    </div>
  );
}

/* ── Tab: Grup Head ─────────────────────────────────── */
function GroupHeadTab({ data, loading, onChanged, logout }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [cluster, setCluster] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim() || !cluster) return;
    setBusy(true);
    try {
      await apiSend('/master/group-head', 'POST', { name, cluster }, logout);
      setName(''); setCluster('');
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    try { await apiSend('/master/group-head-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
        <Field label="Nama Grup Head">
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Cluster">
          <select className="form-input" value={cluster} onChange={(e) => setCluster(e.target.value)}>
            <option value="">Pilih…</option>
            {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <button className="btn primary" disabled={busy} onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Tambah
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Nama Grup Head</th>
            <th style={th}>Cluster</th>
            <th style={{ ...th, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={td}>Memuat…</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={3} style={td}>Belum ada data.</td></tr>
          ) : data.map((g) => (
            <tr key={g.id}>
              <td style={td}>{g.name}</td>
              <td style={td}>{g.cluster}</td>
              <td style={td}><button onClick={() => remove(g.id)} style={iconBtn}><Trash2 size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab: Part Name ─────────────────────────────────── */
function PartNameTab({ data, loading, onChanged, logout }) {
  const showToast = useToast();
  const [partName, setPartName] = useState('');
  const [cluster, setCluster] = useState('');
  const [cycleTime, setCycleTime] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!partName.trim() || !cluster) return;
    setBusy(true);
    try {
      await apiSend('/master/part-name', 'POST', { part_name: partName, cluster, cycle_time: cycleTime }, logout);
      setPartName(''); setCluster(''); setCycleTime('');
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    try { await apiSend('/master/part-name-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
        <Field label="Part Name">
          <input className="form-input" value={partName} onChange={(e) => setPartName(e.target.value)} />
        </Field>
        <Field label="Cluster">
          <select className="form-input" value={cluster} onChange={(e) => setCluster(e.target.value)}>
            <option value="">Pilih…</option>
            {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Cycle Time (detik/pcs)">
          <input type="number" className="form-input" value={cycleTime} onChange={(e) => setCycleTime(e.target.value)} />
        </Field>
        <button className="btn primary" disabled={busy} onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Tambah
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Part Name</th>
            <th style={th}>Cluster</th>
            <th style={th}>Cycle Time</th>
            <th style={{ ...th, width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={td}>Memuat…</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={4} style={td}>Belum ada data.</td></tr>
          ) : data.map((p) => (
            <tr key={p.id}>
              <td style={td}>{p.partName}</td>
              <td style={td}>{p.cluster}</td>
              <td style={td}>{p.cycleTime}</td>
              <td style={td}><button onClick={() => remove(p.id)} style={iconBtn}><Trash2 size={13} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab: Proses ────────────────────────────────────── */
function ProsesTab({ data, partNames, loading, onChanged, logout }) {
  const showToast = useToast();
  const [proses, setProses] = useState('');
  const [partName, setPartName] = useState('');
  const [line, setLine] = useState('');
  const [mesin, setMesin] = useState('');
  const [manPower, setManPower] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!proses.trim() || !partName || !line.trim() || !mesin.trim()) return;
    setBusy(true);
    try {
      await apiSend('/master/proses', 'POST', { proses, part_name: partName, line, mesin, man_power: manPower }, logout);
      setProses(''); setPartName(''); setLine(''); setMesin(''); setManPower('');
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    try { await apiSend('/master/proses-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  return (
    <div className="card">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
        <Field label="Proses">
          <input className="form-input" value={proses} onChange={(e) => setProses(e.target.value)} />
        </Field>
        <Field label="Part Name">
          <select className="form-input" value={partName} onChange={(e) => setPartName(e.target.value)}>
            <option value="">Pilih…</option>
            {partNames.map((p) => <option key={p.id} value={p.partName}>{p.partName}</option>)}
          </select>
        </Field>
        <Field label="Line Produksi">
          <input className="form-input" value={line} onChange={(e) => setLine(e.target.value)} />
        </Field>
        <Field label="Mesin">
          <input className="form-input" value={mesin} onChange={(e) => setMesin(e.target.value)} />
        </Field>
        <Field label="Man Power">
          <input className="form-input" value={manPower} onChange={(e) => setManPower(e.target.value)} />
        </Field>
        <button className="btn primary" disabled={busy} onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Tambah
        </button>
      </div>

      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Proses</th>
              <th style={th}>Part Name</th>
              <th style={th}>Line Produksi</th>
              <th style={th}>Mesin</th>
              <th style={th}>Man Power</th>
              <th style={{ ...th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={td}>Memuat…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} style={td}>Belum ada data.</td></tr>
            ) : data.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.proses}</td>
                <td style={td}>{p.partName}</td>
                <td style={td}>{p.line}</td>
                <td style={td}>{p.mesin}</td>
                <td style={td}>{p.manPower}</td>
                <td style={td}><button onClick={() => remove(p.id)} style={iconBtn}><Trash2 size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, display: 'flex' };
