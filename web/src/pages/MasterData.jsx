import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, Upload, Pencil, Check, X, Search } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend, apiSendForm } from '../api.js';
import { useToast } from '../ToastContext.jsx';
import useHorizontalWheelScroll from '../useHorizontalWheelScroll.js';

const CLUSTERS = ['AD', 'BC', 'EF', 'FI'];

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'groupHead', label: 'Grup Head' },
  { key: 'partProses', label: 'Part Name & Proses' },
];

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder = 'Cari…' }) {
  return (
    <div style={{ position: 'relative', maxWidth: 320, marginBottom: 14 }}>
      <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
      <input
        className="form-input"
        style={{ paddingLeft: 32 }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function matches(query, ...fields) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => String(f ?? '').toLowerCase().includes(q));
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

  // Gabungan Group Head -> Cluster -> Part Name -> Proses (+Cycle Time,
  // Line/Mesin/Man Power) jadi satu tabel, tanpa mengubah cara data
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
        cycleTime: p.cycleTime,
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
      {tab === 'partProses' && (
        <PartProsesTab
          proses={master.proses} partNames={master.partNames}
          loading={loading} onChanged={load} logout={logout} legacy={legacy}
        />
      )}
    </div>
  );
}

/* ── Tab: Ringkasan (tampilan gabungan, read-only) ──── */
// Bukan tabel fisik baru -- ini cuma JOIN tampilan dari 3 tabel master
// (GroupHead/PartName/Proses) yang sudah ada, jadi edit/tambah data tetap
// lewat tab Grup Head / Part Name & Proses (satu tempat per jenis data,
// tidak perlu ubah banyak baris kalau ada perubahan).
function RingkasanTab({ rows, loading }) {
  const [query, setQuery] = useState('');
  const scrollRef = useHorizontalWheelScroll();
  const shown = useMemo(
    () => rows.filter((r) => matches(query, r.groupHead, r.cluster, r.partName, r.proses, r.line, r.mesin, r.manPower)),
    [rows, query],
  );
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Ringkasan Relasi Master Data</div>
      </div>
      <SearchBox value={query} onChange={setQuery} placeholder="Cari Grup Head / Part Name / Proses / Mesin / Man Power…" />
      <div ref={scrollRef} style={{ overflow: 'auto' }}>
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
            ) : shown.length === 0 ? (
              <tr><td colSpan={8} style={td}>{rows.length === 0 ? 'Belum ada data. Isi dulu lewat tab Grup Head dan Part Name & Proses.' : 'Tidak ada yang cocok.'}</td></tr>
            ) : shown.map((r) => (
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
  const [query, setQuery] = useState('');

  const shown = useMemo(() => data.filter((g) => matches(query, g.name, g.cluster)), [data, query]);

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

      <SearchBox value={query} onChange={setQuery} placeholder="Cari nama Grup Head / Cluster…" />

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
          ) : shown.length === 0 ? (
            <tr><td colSpan={3} style={td}>{data.length === 0 ? 'Belum ada data.' : 'Tidak ada yang cocok.'}</td></tr>
          ) : shown.map((g) => editingId === g.id ? (
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

/* ── Tab: Part Name & Proses (digabung — Cycle Time ikut Proses, karena
   satu Part Name bisa punya beberapa Proses dengan Cycle Time beda) ─── */
function PartProsesTab({ proses, partNames, loading, onChanged, logout, legacy = { proses: [], mesin: [], manPower: [], partNames: [] } }) {
  const showToast = useToast();
  const [form, setForm] = useState({ partName: '', cluster: '', proses: '', line: '', mesin: '', manPower: '', cycleTime: '' });
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [ed, setEd] = useState({ partName: '', cluster: '', proses: '', line: '', mesin: '', manPower: '', cycleTime: '' });
  const [query, setQuery] = useState('');
  const scrollRef = useHorizontalWheelScroll();

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Kalau ketik Part Name yang sudah ada, Cluster-nya otomatis kekunci ke
  // cluster yang sudah tersimpan (konsisten dengan cascading di /rmo).
  function setPartNameField(v) {
    const existing = partNames.find((p) => p.partName === v);
    setForm((f) => ({ ...f, partName: v, cluster: existing ? existing.cluster : f.cluster }));
  }

  async function add() {
    if (!form.partName.trim() || !form.cluster || !form.proses.trim() || !form.line.trim() || !form.mesin.trim()) return;
    setBusy(true);
    try {
      await apiSend('/master-part-name', 'POST', { part_name: form.partName, cluster: form.cluster }, logout);
      await apiSend('/master-proses', 'POST', {
        proses: form.proses, part_name: form.partName, line: form.line,
        mesin: form.mesin, man_power: form.manPower, cycle_time: form.cycleTime,
      }, logout);
      setForm({ partName: '', cluster: '', proses: '', line: '', mesin: '', manPower: '', cycleTime: '' });
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }
  async function remove(id) {
    if (!window.confirm('Hapus baris Proses ini?')) return;
    try { await apiSend('/master-proses-delete', 'POST', { id }, logout); onChanged(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  function startEdit(p) {
    const partName = partNames.find((pn) => pn.partName === p.partName);
    setEditingId(p.id);
    setEd({ partName: p.partName, cluster: partName?.cluster || '', proses: p.proses, line: p.line, mesin: p.mesin, manPower: p.manPower, cycleTime: p.cycleTime });
  }
  function setEdField(k, v) { setEd((f) => ({ ...f, [k]: v })); }
  function setEdPartName(v) {
    const existing = partNames.find((p) => p.partName === v);
    setEd((f) => ({ ...f, partName: v, cluster: existing ? existing.cluster : f.cluster }));
  }
  async function saveEdit(row) {
    if (!ed.partName.trim() || !ed.cluster || !ed.proses.trim() || !ed.line.trim() || !ed.mesin.trim()) return;
    setBusy(true);
    try {
      const partNameRecord = partNames.find((pn) => pn.partName === row.partName);
      if (partNameRecord && (ed.partName !== row.partName || ed.cluster !== partNameRecord.cluster)) {
        await apiSend('/master-part-name-update', 'POST', { id: partNameRecord.id, part_name: ed.partName, cluster: ed.cluster }, logout);
      } else if (!partNameRecord) {
        await apiSend('/master-part-name', 'POST', { part_name: ed.partName, cluster: ed.cluster }, logout);
      }
      await apiSend('/master-proses-update', 'POST', {
        id: row.id, proses: ed.proses, part_name: ed.partName, line: ed.line,
        mesin: ed.mesin, man_power: ed.manPower, cycle_time: ed.cycleTime,
      }, logout);
      setEditingId(null);
      onChanged();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }

  const rows = useMemo(() => proses.map((p) => {
    const pn = partNames.find((x) => x.partName === p.partName);
    return { ...p, cluster: pn?.cluster || '—' };
  }), [proses, partNames]);
  const shown = useMemo(
    () => rows.filter((r) => matches(query, r.partName, r.cluster, r.proses, r.line, r.mesin, r.manPower)),
    [rows, query],
  );

  return (
    <div className="card">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .7fr 1fr 1fr 1fr 1fr .8fr auto', gap: 12, alignItems: 'end', marginBottom: 18 }}>
        <Field label="Part Name">
          <input className="form-input" list="dl-part-names" value={form.partName} onChange={(e) => setPartNameField(e.target.value)} />
          <datalist id="dl-part-names">{legacy.partNames.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Cluster">
          <select className="form-input" value={form.cluster} onChange={(e) => set('cluster', e.target.value)}>
            <option value="">Pilih…</option>
            {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Proses">
          <input className="form-input" list="dl-proses" value={form.proses} onChange={(e) => set('proses', e.target.value)} />
          <datalist id="dl-proses">{legacy.proses.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Line Produksi">
          <input className="form-input" value={form.line} onChange={(e) => set('line', e.target.value)} />
        </Field>
        <Field label="Mesin">
          <input className="form-input" list="dl-mesin" value={form.mesin} onChange={(e) => set('mesin', e.target.value)} />
          <datalist id="dl-mesin">{legacy.mesin.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Man Power">
          <input className="form-input" list="dl-mp" value={form.manPower} onChange={(e) => set('manPower', e.target.value)} />
          <datalist id="dl-mp">{legacy.manPower.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Cycle Time (detik/pcs)">
          <input type="number" className="form-input" value={form.cycleTime} onChange={(e) => set('cycleTime', e.target.value)} />
        </Field>
        <button className="btn primary" disabled={busy} onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Tambah
        </button>
      </div>

      <SearchBox value={query} onChange={setQuery} placeholder="Cari Part Name / Proses / Line / Mesin / Man Power…" />

      <div ref={scrollRef} style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Part Name</th>
              <th style={th}>Cluster</th>
              <th style={th}>Proses</th>
              <th style={th}>Line Produksi</th>
              <th style={th}>Mesin</th>
              <th style={th}>Man Power</th>
              <th style={th}>Cycle Time</th>
              <th style={{ ...th, width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={td}>Memuat…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={8} style={td}>{rows.length === 0 ? 'Belum ada data.' : 'Tidak ada yang cocok.'}</td></tr>
            ) : shown.map((p) => editingId === p.id ? (
              <tr key={p.id}>
                <td style={td}><input className="form-input" style={editInp} list="dl-part-names" value={ed.partName} onChange={(e) => setEdPartName(e.target.value)} /></td>
                <td style={td}>
                  <select className="form-input" style={editInp} value={ed.cluster} onChange={(e) => setEdField('cluster', e.target.value)}>
                    <option value="">Pilih…</option>
                    {CLUSTERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={td}><input className="form-input" style={editInp} list="dl-proses" value={ed.proses} onChange={(e) => setEdField('proses', e.target.value)} /></td>
                <td style={td}><input className="form-input" style={editInp} value={ed.line} onChange={(e) => setEdField('line', e.target.value)} /></td>
                <td style={td}><input className="form-input" style={editInp} list="dl-mesin" value={ed.mesin} onChange={(e) => setEdField('mesin', e.target.value)} /></td>
                <td style={td}><input className="form-input" style={editInp} list="dl-mp" value={ed.manPower} onChange={(e) => setEdField('manPower', e.target.value)} /></td>
                <td style={td}><input type="number" className="form-input" style={editInp} value={ed.cycleTime} onChange={(e) => setEdField('cycleTime', e.target.value)} /></td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button disabled={busy} onClick={() => saveEdit(p)} style={iconBtn} title="Simpan"><Check size={13} /></button>
                    <button onClick={() => setEditingId(null)} style={iconBtn} title="Batal"><X size={13} /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td style={td}>{p.partName}</td>
                <td style={td}>{p.cluster}</td>
                <td style={td}>{p.proses}</td>
                <td style={td}>{p.line}</td>
                <td style={td}>{p.mesin}</td>
                <td style={td}>{p.manPower}</td>
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
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', border: '1px solid var(--border)', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', color: 'var(--text)' };
const iconBtn = { background: 'none', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', color: 'var(--text)', padding: 4, display: 'flex' };
const editInp = { padding: '5px 8px', fontSize: 12.5 };
