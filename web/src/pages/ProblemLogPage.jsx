import { useState, useEffect, useCallback } from 'react';
import { Plus, XCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend } from '../api.js';
import { useToast } from '../ToastContext.jsx';

const STATUS_OPTS = ['open', 'in_progress', 'closed'];
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
const STATUS_COLOR = { open: 'var(--red)', in_progress: 'var(--yellow)', closed: 'var(--green)' };

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
  const [closingId, setClosingId] = useState(null);
  const [closeComment, setCloseComment] = useState('');
  const [filter, setFilter] = useState('all');

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

  async function confirmClose(id) {
    if (!closeComment.trim()) { showToast('Komentar penutupan wajib diisi', 'red'); return; }
    setBusy(true);
    try {
      await apiSend('/problem-log-update', 'POST', { id, status: 'closed', close_comment: closeComment }, logout);
      setClosingId(null);
      setCloseComment('');
      load();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }

  async function remove(id) {
    try { await apiSend('/problem-log-delete', 'POST', { id }, logout); load(); }
    catch (e) { showToast(e.message, 'red'); }
  }

  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Problem & Root Cause Log</div>
          <div className="page-sub">Semua catatan problem produksi, terbaru di atas — siapa saja yang login bisa menutup problem</div>
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
        <div style={{ overflow: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {['No', 'Tanggal', 'Line Produksi', 'Part Name', 'Problem', 'Root Cause', 'Temporary Action', 'Permanent Action', 'Due Date', 'Status', 'Ditutup', ''].map((h) => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '2px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Memuat…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Belum ada data.</td></tr>
              ) : shown.map((r, i) => (
                <>
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
                      <span style={{ color: STATUS_COLOR[r.status] || 'var(--muted)', fontWeight: 700 }}>{STATUS_LABEL[r.status] || r.status}</span>
                    </td>
                    <td style={{ ...td, fontSize: 11.5, color: 'var(--muted)' }}>
                      {r.status === 'closed' ? (r.closedAt ? new Date(r.closedAt).toLocaleString('id-ID') : '—') : '—'}
                    </td>
                    <td style={td}>
                      {r.status !== 'closed' ? (
                        <button onClick={() => { setClosingId(r.id); setCloseComment(''); }} style={iconBtn} title="Tutup problem">
                          <XCircle size={14} /> Tutup
                        </button>
                      ) : (
                        <button onClick={() => remove(r.id)} style={{ ...iconBtn, color: 'var(--red)' }} title="Hapus">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {closingId === r.id && (
                    <tr>
                      <td colSpan={12} style={{ padding: '10px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            autoFocus
                            placeholder="Komentar penutupan (wajib) *"
                            style={{ ...inp, flex: 1 }}
                            value={closeComment}
                            onChange={(e) => setCloseComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && confirmClose(r.id)}
                          />
                          <button disabled={busy} onClick={() => confirmClose(r.id)} style={{ padding: '8px 16px', fontSize: 12.5, borderRadius: 7, background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            Konfirmasi Tutup
                          </button>
                          <button onClick={() => setClosingId(null)} style={{ padding: '8px 14px', fontSize: 12.5, borderRadius: 7, background: 'var(--s3)', border: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Batal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {r.status === 'closed' && r.closeComment && (
                    <tr>
                      <td colSpan={12} style={{ padding: '6px 10px 12px 10px', fontSize: 12, color: 'var(--muted)', borderBottom: '1px solid var(--border)', fontStyle: 'italic' }}>
                        Komentar penutupan: {r.closeComment}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const td = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
const iconBtn = { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', color: 'var(--text)', whiteSpace: 'nowrap' };
