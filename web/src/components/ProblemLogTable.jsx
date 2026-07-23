import { useState } from 'react';
import { Plus } from 'lucide-react';

const API = '/api';
const STATUS_OPTS = ['open', 'in_progress', 'closed'];
const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
const STATUS_COLOR = { open: 'var(--red)', in_progress: 'var(--yellow)', closed: 'var(--green)' };

const EMPTY = { problem: '', rootCause: '', temporaryAction: '', permanentAction: '', dueDate: '', status: 'open' };

export default function ProblemLogTable({ rows, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.problem.trim()) return;
    setBusy(true);
    try {
      await fetch(`${API}/problem-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: form.problem,
          root_cause: form.rootCause,
          temporary_action: form.temporaryAction,
          permanent_action: form.permanentAction,
          due_date: form.dueDate || null,
          status: form.status,
        }),
      });
      setForm(EMPTY);
      setShowForm(false);
      onChanged();
    } catch (_) {}
    setBusy(false);
  }

  const inp = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%',
    boxSizing: 'border-box', color: 'var(--text)', fontFamily: 'inherit',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', fontSize: 12.5, borderRadius: 7, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}
        >
          <Plus size={14} /> Tambah Problem
        </button>
      </div>

      {showForm && (
        <div className="group-box" style={{ marginBottom: 14 }}>
          <span className="group-box-title">Problem Baru</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <input placeholder="Problem *" style={inp} value={form.problem} onChange={(e) => set('problem', e.target.value)} />
            </div>
            <input placeholder="Root Cause" style={inp} value={form.rootCause} onChange={(e) => set('rootCause', e.target.value)} />
            <input placeholder="Temporary Action" style={inp} value={form.temporaryAction} onChange={(e) => set('temporaryAction', e.target.value)} />
            <input placeholder="Permanent Action" style={inp} value={form.permanentAction} onChange={(e) => set('permanentAction', e.target.value)} />
            <input type="date" style={inp} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            <select style={inp} value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
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

      <div style={{ overflow: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['No', 'Problem', 'Root Cause', 'Temporary Action', 'Permanent Action', 'Due Date', 'Status'].map((h) => (
                <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '2px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Belum ada data.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id}>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{i + 1}</td>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{r.problem}</td>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{r.rootCause || '—'}</td>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{r.temporaryAction || '—'}</td>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{r.permanentAction || '—'}</td>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{r.dueDate || '—'}</td>
                <td style={{ padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: STATUS_COLOR[r.status] || 'var(--muted)', fontWeight: 700 }}>{STATUS_LABEL[r.status] || r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
