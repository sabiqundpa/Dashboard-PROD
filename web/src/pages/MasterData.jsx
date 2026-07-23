import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Upload, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend, apiSendForm } from '../api.js';
import { useToast } from '../ToastContext.jsx';

const CLUSTERS = ['AD', 'BC', 'EF', 'FI'];

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
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
  const [tab, setTab] = useState('ringkasan');
  const [master, setMaster] = useState({ clusters: CLUSTERS, groupHeads: [], partNames: [], proses: [] });
  const [legacy, setLegacy] = useState({ manPower: [], mesin: [], proses: [], partNames: [] });
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/master', { clusters: CLUSTERS, groupHeads: [], partNames: [], proses: [] }, logout)
      .then((d) => { setMaster(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [logout]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiFetch('/legacy-lookups', { manPower: [], mesin: [], proses: [], partNames: [] }, logout).then(setLegacy);
  }, [logout]);

  // Gabungan Group Head -> Cluster -> Part Name (+Cycle Time) -> Proses
  // (+Line/Mesin/Man Power) jadi satu tabel, tanpa mengubah cara data
  // disimpan (tetap 3 tabel terpisah supaya edit satu tempat tidak perlu
  // ubah banyak baris berulang). Baris terkecil = tiap Proses; join ke atas
  // by cluster/partName.
  const ringkasanRows = useMemo(() => {
    return master.proses.map((p) => {
      const partName = master.partNames.find((pn) => pn.partName === p.partName);
      const cluster = partName?.cluster || '';
      const groupHeads = master.groupHeads.filter((g) => g.cluster === cluster).map((g) => g.name);
      return {
        key: p.id,
        groupHead: groupHeads.join(', ') || '—',
        cluster: cluster || '—',
        partName: p.partName,
        cycleTime: partName?.cycleTime ?? '—',
        proses: p.proses,
        line: p.line,
        mesin: p.mesin,
        manPower: p.manPower,
      };
    });
  }, [master]);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiSendForm('/master-import', fd, logout);
      showToast(`Import selesai: ${data.groupHeads} grup head, ${data.partNames} part, ${data.proses} proses (${data.skipped} dilewati)`, 'green');
      load();
    } catch (err) { showToast(err.message, 'red'); }
  }

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Master Data</div>
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

      {tab === 'ringkasan' && <RingkasanTab rows={ringkasanRows} loading={loading} />}
      {tab === 'groupHead' && <GroupHeadTab data={master.groupHeads} loading={loading} onChanged={load} logout={logout} />}
      {tab === 'partName' && <PartNameTab data={master.partNames} loading={loading} onChanged={load} logout={logout} suggestions={legacy.partNames} />}
      {tab === 'proses' && <ProsesTab data={master.proses} partNames={master.partNames} loading={loading} onChanged={load} logout={logout} legacy={legacy} />}
    </div>
  );
}

/* ── Tab: Ringkasan (tampilan gabungan, read-only) ──── */
// Bukan tabel fisik baru -- ini cuma JOIN tampilan dari 3 tabel master
// (GroupHead/PartName/Proses) yang sudah ada, jadi edit/tambah data tetap
// lewat tab Grup Head / Part Name / Proses (satu tempat per jenis data,
// tidak perlu ubah banyak baris kalau ada perubahan).
function RingkasanTab({ rows, loading }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Ringkasan Relasi Master Data</div>
      </div>
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Grup Head', 'Cluster', 'Part Name', 'Cycle Time', 'Proses', 'Line Produksi', 'Mesin', 'Man Power'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={td}>Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={td}>Belum ada data. Isi dulu lewat tab Grup Head, Part Name, dan Proses.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.key}>
                <td style={td}>{r.groupHead}</td>
                <td style={td}>{r.cluster}</td>
                <td style={td}>{r.partName}</td>
                <td style={td}>{r.cycleTime}</td>
                <td style={td}>{r.proses}</td>
                <td style={td}>{r.line}</td>
                <td style={td}>{r.mesin}</td>
                <td style={td}>{r.manPower}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Grup Head ─────────────────────────────────── */
function GroupHeadTab({ data, loading, onChanged, logout }) {
  const showToast = useToast();
  const [name, setName] = useState('');
  const [cluster, setCluster] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCluster, setEditCluster] = useState('');

  async function add() {
    if (!name.trim() || !cluster) return;
    setBusy(true);
    try {
      await apiSend('/master-group-head', 'POST', { name, cluster }, logout);
      setName(''); setCluster('');
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    if (!window.confirm('Hapus Grup Head ini?')) return;
    try { await apiSend('/master-group-head-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  function startEdit(g) {
    setEditingId(g.id);
    setEditName(g.name);
    setEditCluster(g.cluster);
  }
  async function saveEdit(id) {
    if (!editName.trim() || !editCluster) return;
    setBusy(true);
    try {
      await apiSend('/master-group-head-update', 'POST', { id, name: editName, cluster: editCluster }, logout);
      setEditingId(null);
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
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
            <th style={{ ...th, width: 70 }}></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={td}>Memuat…</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={3} style={td}>Belum ada data.</td></tr>
          ) : data.map((g) => editingId === g.id ? (
            <tr key={g.id}>
              <td style={td}><input className="form-input" style={editInp} value={editName} onChange={(e) => setEditName(e.target.value)} /></td>
              <td style={td}>
                <select className="form-input" style={editInp} value={editCluster} onChange={(e) => setEditCluster(e.target.value)}>
                  {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button disabled={busy} onClick={() => saveEdit(g.id)} style={iconBtn} title="Simpan"><Check size={13} /></button>
                  <button onClick={() => setEditingId(null)} style={iconBtn} title="Batal"><X size={13} /></button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={g.id}>
              <td style={td}>{g.name}</td>
              <td style={td}>{g.cluster}</td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEdit(g)} style={iconBtn} title="Edit"><Pencil size={13} /></button>
                  <button onClick={() => remove(g.id)} style={{ ...iconBtn, color: 'var(--red)' }} title="Hapus"><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab: Part Name ─────────────────────────────────── */
function PartNameTab({ data, loading, onChanged, logout, suggestions = [] }) {
  const showToast = useToast();
  const [partName, setPartName] = useState('');
  const [cluster, setCluster] = useState('');
  const [cycleTime, setCycleTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPartName, setEditPartName] = useState('');
  const [editCluster, setEditCluster] = useState('');
  const [editCycleTime, setEditCycleTime] = useState('');

  async function add() {
    if (!partName.trim() || !cluster) return;
    setBusy(true);
    try {
      await apiSend('/master-part-name', 'POST', { part_name: partName, cluster, cycle_time: cycleTime }, logout);
      setPartName(''); setCluster(''); setCycleTime('');
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    if (!window.confirm('Hapus Part Name ini?')) return;
    try { await apiSend('/master-part-name-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditPartName(p.partName);
    setEditCluster(p.cluster);
    setEditCycleTime(p.cycleTime);
  }
  async function saveEdit(id) {
    if (!editPartName.trim() || !editCluster) return;
    setBusy(true);
    try {
      await apiSend('/master-part-name-update', 'POST', { id, part_name: editPartName, cluster: editCluster, cycle_time: editCycleTime }, logout);
      setEditingId(null);
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
        <Field label="Part Name">
          <input className="form-input" list="dl-part-names" value={partName} onChange={(e) => setPartName(e.target.value)} />
          <datalist id="dl-part-names">
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
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
            <th style={{ ...th, width: 70 }}></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={td}>Memuat…</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={4} style={td}>Belum ada data.</td></tr>
          ) : data.map((p) => editingId === p.id ? (
            <tr key={p.id}>
              <td style={td}><input className="form-input" style={editInp} list="dl-part-names" value={editPartName} onChange={(e) => setEditPartName(e.target.value)} /></td>
              <td style={td}>
                <select className="form-input" style={editInp} value={editCluster} onChange={(e) => setEditCluster(e.target.value)}>
                  {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td style={td}><input type="number" className="form-input" style={editInp} value={editCycleTime} onChange={(e) => setEditCycleTime(e.target.value)} /></td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button disabled={busy} onClick={() => saveEdit(p.id)} style={iconBtn} title="Simpan"><Check size={13} /></button>
                  <button onClick={() => setEditingId(null)} style={iconBtn} title="Batal"><X size={13} /></button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={p.id}>
              <td style={td}>{p.partName}</td>
              <td style={td}>{p.cluster}</td>
              <td style={td}>{p.cycleTime}</td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEdit(p)} style={iconBtn} title="Edit"><Pencil size={13} /></button>
                  <button onClick={() => remove(p.id)} style={{ ...iconBtn, color: 'var(--red)' }} title="Hapus"><Trash2 size={13} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tab: Proses ────────────────────────────────────── */
function ProsesTab({ data, partNames, loading, onChanged, logout, legacy = { proses: [], mesin: [], manPower: [] } }) {
  const showToast = useToast();
  const [proses, setProses] = useState('');
  const [partName, setPartName] = useState('');
  const [line, setLine] = useState('');
  const [mesin, setMesin] = useState('');
  const [manPower, setManPower] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [ed, setEd] = useState({ proses: '', partName: '', line: '', mesin: '', manPower: '' });

  async function add() {
    if (!proses.trim() || !partName || !line.trim() || !mesin.trim()) return;
    setBusy(true);
    try {
      await apiSend('/master-proses', 'POST', { proses, part_name: partName, line, mesin, man_power: manPower }, logout);
      setProses(''); setPartName(''); setLine(''); setMesin(''); setManPower('');
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    if (!window.confirm('Hapus Proses ini?')) return;
    try { await apiSend('/master-proses-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEd({ proses: p.proses, partName: p.partName, line: p.line, mesin: p.mesin, manPower: p.manPower });
  }
  function setEdField(k, v) { setEd((f) => ({ ...f, [k]: v })); }
  async function saveEdit(id) {
    if (!ed.proses.trim() || !ed.partName || !ed.line.trim() || !ed.mesin.trim()) return;
    setBusy(true);
    try {
      await apiSend('/master-proses-update', 'POST', { id, proses: ed.proses, part_name: ed.partName, line: ed.line, mesin: ed.mesin, man_power: ed.manPower }, logout);
      setEditingId(null);
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }

  return (
    <div className="card">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
        <Field label="Proses">
          <input className="form-input" list="dl-proses" value={proses} onChange={(e) => setProses(e.target.value)} />
          <datalist id="dl-proses">{legacy.proses.map((s) => <option key={s} value={s} />)}</datalist>
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
          <input className="form-input" list="dl-mesin" value={mesin} onChange={(e) => setMesin(e.target.value)} />
          <datalist id="dl-mesin">{legacy.mesin.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Man Power">
          <input className="form-input" list="dl-mp" value={manPower} onChange={(e) => setManPower(e.target.value)} />
          <datalist id="dl-mp">{legacy.manPower.map((s) => <option key={s} value={s} />)}</datalist>
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
              <th style={{ ...th, width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={td}>Memuat…</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} style={td}>Belum ada data.</td></tr>
            ) : data.map((p) => editingId === p.id ? (
              <tr key={p.id}>
                <td style={td}><input className="form-input" style={editInp} list="dl-proses" value={ed.proses} onChange={(e) => setEdField('proses', e.target.value)} /></td>
                <td style={td}>
                  <select className="form-input" style={editInp} value={ed.partName} onChange={(e) => setEdField('partName', e.target.value)}>
                    {partNames.map((pn) => <option key={pn.id} value={pn.partName}>{pn.partName}</option>)}
                  </select>
                </td>
                <td style={td}><input className="form-input" style={editInp} value={ed.line} onChange={(e) => setEdField('line', e.target.value)} /></td>
                <td style={td}><input className="form-input" style={editInp} list="dl-mesin" value={ed.mesin} onChange={(e) => setEdField('mesin', e.target.value)} /></td>
                <td style={td}><input className="form-input" style={editInp} list="dl-mp" value={ed.manPower} onChange={(e) => setEdField('manPower', e.target.value)} /></td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button disabled={busy} onClick={() => saveEdit(p.id)} style={iconBtn} title="Simpan"><Check size={13} /></button>
                    <button onClick={() => setEditingId(null)} style={iconBtn} title="Batal"><X size={13} /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td style={td}>{p.proses}</td>
                <td style={td}>{p.partName}</td>
                <td style={td}>{p.line}</td>
                <td style={td}>{p.mesin}</td>
                <td style={td}>{p.manPower}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => startEdit(p)} style={iconBtn} title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => remove(p.id)} style={{ ...iconBtn, color: 'var(--red)' }} title="Hapus"><Trash2 size={13} /></button>
                  </div>
                </td>
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
const iconBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text)', padding: 4, display: 'flex' };
const editInp = { padding: '5px 8px', fontSize: 12.5 };
