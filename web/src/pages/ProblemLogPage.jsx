import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend } from '../api.js';
import { useToast } from '../ToastContext.jsx';
import useHorizontalWheelScroll from '../useHorizontalWheelScroll.js';

const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
const STATUS_COLOR = { open: 'var(--red)', in_progress: 'var(--yellow)', closed: 'var(--green)' };
const STATUS_OPTS = ['open', 'in_progress', 'closed'];

const EMPTY = { tanggal: '', line: '', partName: '', problem: '', rootCause: '', temporaryAction: '', permanentAction: '', dueDate: '', status: 'open' };

const inp = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%',
  boxSizing: 'border-box', color: 'var(--text)', fontFamily: 'inherit',
};

export default function ProblemLogPage() {
  const { logout } = useAuth();
  const showToast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const scrollRef = useHorizontalWheelScroll();

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/problem-log', [], logout).then((d) => { setRows(d); setLoading(false); }).catch(() => setLoading(false));
  }, [logout]);
  useEffect(() => { load(); }, [load]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.problem.trim()) return;
    setBusy(true);
    try {
      await apiSend('/problem-log', 'POST', {
        tanggal: form.tanggal || null,
        line: form.line,
        part_name: form.partName,
        problem: form.problem,
        root_cause: form.rootCause,
        temporary_action: form.temporaryAction,
        permanent_action: form.permanentAction,
        due_date: form.dueDate || null,
        status: form.status,
      }, logout);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }

  // Status Open/Closed adalah toggle sendiri -- tidak bergantung dan tidak
  // mempengaruhi isi Notes.
  async function toggleStatus(r) {
    const next = r.status === 'closed' ? 'open' : 'closed';
    try {
      await apiSend('/problem-log-update', 'POST', { id: r.id, status: next }, logout);
      load();
    } catch (e) { showToast(e.message, 'red'); }
  }

  function startEditNotes(r) {
    setEditingNotesId(r.id);
    setNotesDraft(r.notes || '');
  }
  async function saveNotes(id) {
    try {
      await apiSend('/problem-log-update', 'POST', { id, notes: notesDraft }, logout);
      setEditingNotesId(null);
      load();
    } catch (e) { showToast(e.message, 'red'); }
  }

  async function remove(id) {
    if (!window.confirm('Hapus catatan problem ini?')) return;
    try { await apiSend('/problem-log-delete', 'POST', { id }, logout); load(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  const shown = useMemo(() => {
    const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
    // Open (dan In Progress) di atas, Closed di bawah; terbaru di atas dalam masing-masing kelompok.
    const rank = (s) => (s === 'closed' ? 1 : 0);
    return [...filtered].sort((a, b) => rank(a.status) - rank(b.status) || b.id - a.id);
  }, [rows, filter]);

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Problem & Root Cause Log</div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 8 }}>
          <select style={{ ...inp, width: 150 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            <Plus size={14} /> Tambah Problem
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Problem Baru</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="date" placeholder="Tanggal" style={inp} value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} />
            <input placeholder="Line Produksi" style={inp} value={form.line} onChange={(e) => set('line', e.target.value)} />
            <input placeholder="Part Name" style={inp} value={form.partName} onChange={(e) => set('partName', e.target.value)} />
            <div />
            <div style={{ gridColumn: '1 / -1' }}>
              <input placeholder="Problem *" style={inp} value={form.problem} onChange={(e) => set('problem', e.target.value)} />
            </div>
            <input placeholder="Root Cause" style={inp} value={form.rootCause} onChange={(e) => set('rootCause', e.target.value)} />
            <input placeholder="Temporary Action" style={inp} value={form.temporaryAction} onChange={(e) => set('temporaryAction', e.target.value)} />
            <input placeholder="Permanent Action" style={inp} value={form.permanentAction} onChange={(e) => set('permanentAction', e.target.value)} />
            <input type="date" placeholder="Due Date" style={inp} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button disabled={busy} onClick={submit} style={{ padding: '8px 18px', fontSize: 13, borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              {busy ? 'Menyimpan…' : 'Simpan'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 18px', fontSize: 13, borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div ref={scrollRef} style={{ overflow: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {['No', 'Tanggal', 'Line Produksi', 'Part Name', 'Problem', 'Root Cause', 'Temporary Action', 'Permanent Action', 'Due Date', 'Status', 'Notes', 'Ditutup', 'Aksi'].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '2px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Memuat…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Belum ada data.</td></tr>
              ) : shown.map((r, i) => (
                <tr key={r.id}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{r.tanggal || '—'}</td>
                  <td style={td}>{r.line || '—'}</td>
                  <td style={td}>{r.partName || '—'}</td>
                  <td style={td}>{r.problem}</td>
                  <td style={td}>{r.rootCause || '—'}</td>
                  <td style={td}>{r.temporaryAction || '—'}</td>
                  <td style={td}>{r.permanentAction || '—'}</td>
                  <td style={td}>{r.dueDate || '—'}</td>
                  <td style={td}>
                    <button onClick={() => toggleStatus(r)} style={{ ...statusBtn, color: STATUS_COLOR[r.status] || 'var(--muted)', borderColor: STATUS_COLOR[r.status] || 'var(--border)' }} title="Ganti status">
                      {STATUS_LABEL[r.status] || r.status}
                    </button>
                  </td>
                  <td style={{ ...td, minWidth: 200 }}>
                    {editingNotesId === r.id ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          autoFocus
                          style={{ ...inp, padding: '5px 8px', fontSize: 12.5 }}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveNotes(r.id)}
                        />
                        <button onClick={() => saveNotes(r.id)} style={iconBtn} title="Simpan"><Check size={13} /></button>
                        <button onClick={() => setEditingNotesId(null)} style={iconBtn} title="Batal"><X size={13} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ color: r.notes ? 'var(--text)' : 'var(--muted)' }}>{r.notes || '—'}</span>
                        <button onClick={() => startEditNotes(r)} style={iconBtn} title="Edit Notes"><Pencil size={12} /></button>
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, fontSize: 11.5, color: 'var(--muted)' }}>
                    {r.status === 'closed' ? (r.closedAt ? new Date(r.closedAt).toLocaleString('id-ID') : '—') : '—'}
                  </td>
                  <td style={td}>
                    <button onClick={() => remove(r.id)} style={{ ...iconBtn, color: 'var(--red)' }} title="Hapus">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const td = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
const iconBtn = { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', fontSize: 12, cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0 };
const statusBtn = { background: 'none', border: '1px solid', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };
