import { useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiSend } from '../api.js';
import { fmtDate } from '../utils/fmt.js';

const CATEGORIES = [
  'Perbaikan MTN', 'Rusak / Mesin Trouble', 'Penggantian Spare Part',
  'Penggantian Oli dan Coolant', 'Problem Oli / Coolant', 'Problem Qualitas',
  'Preventive MTN', 'Problem Angin',
];

function fmtHrs(hrs) {
  if (!hrs && hrs !== 0) return '—';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export default function WOPanel() {
  const { detailWO, closeWODetail, openModal, showWODetail } = useUI();
  const { loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});

  const wo     = detailWO;
  const isOpen = wo?.status === 'open';

  function startEdit() {
    setForm({
      cause:        wo.cause        || '',
      resolution:   wo.resolution   || '',
      action:       wo.action       || '',
      category:     wo.category     || CATEGORIES[0],
      pic_mtn:      wo.pic_mtn      || '',
      date:         wo.date         || '',
      start_time:   wo.start        || '',
      repair_date:  wo.repair_date  || '',
      repair_time:  wo.repair_time  || '',
      end_date:     wo.end_date     || '',
      end_time:     wo.end_time     || '',
      duration_hrs: wo.durationHrs  ?? 0,
    });
    setEditMode(true);
  }

  function cancelEdit() { setEditMode(false); setForm({}); }
  function set(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function saveEdit() {
    if (!form.cause?.trim()) { showToast('Problem wajib diisi', 'red'); return; }
    setSaving(true);
    try {
      await apiSend(`/breakdown/${wo.id}`, 'PUT', form, logout);
      showToast('Work order diperbarui', 'green');
      cancelEdit();
      await loadAll();
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'red'); }
    setSaving(false);
  }

  async function deleteWO() {
    if (!window.confirm(`Hapus work order ini?\n\n"${wo.cause}"\n${wo.machine} · ${fmtDate(wo.date)}\n\nData tidak bisa dikembalikan.`)) return;
    try {
      await apiSend(`/breakdown/${wo.id}`, 'DELETE', {}, logout);
      showToast('Work order dihapus', 'yellow');
      closeWODetail();
      loadAll();
    } catch (e) { showToast(e.message || 'Gagal menghapus', 'red'); }
  }

  function handleCloseWO() {
    openModal('closeWO', { id: wo.id, machine: wo.machine, cause: wo.cause });
  }

  return (
    <div className={`detail-panel${wo ? ' show' : ''}`} id="woPanel">
      {!wo ? null : editMode ? (
        /* ── Edit mode ──────────────────────────────────── */
        <>
          <div className="detail-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-title">Edit Work Order</div>
              <div className="detail-subtitle">{wo.machine}</div>
            </div>
            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={cancelEdit}>Batal</button>
            <button className="btn primary" style={{ padding: '5px 10px', fontSize: 12 }} disabled={saving} onClick={saveEdit}>
              {saving ? 'Simpan…' : 'Simpan'}
            </button>
            <button className="modal-close" onClick={() => { cancelEdit(); closeWODetail(); }}><X size={18} /></button>
          </div>
          <div className="detail-body">
            <div className="form-group">
              <label className="form-label">Problem *</label>
              <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.cause} onChange={set('cause')} />
            </div>
            <div className="form-group">
              <label className="form-label">Penyelesaian</label>
              <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.resolution} onChange={set('resolution')} />
            </div>
            <div className="form-group">
              <label className="form-label">Action / Tindakan</label>
              <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.action} onChange={set('action')} />
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Problem</label>
              <select className="form-input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">PIC MTN</label>
              <input className="form-input" value={form.pic_mtn} onChange={set('pic_mtn')} placeholder="Nama PIC MTN" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Tanggal Lapor</label>
                <input type="date" className="form-input" value={form.date} onChange={set('date')} />
              </div>
              <div className="form-group">
                <label className="form-label">Waktu Lapor</label>
                <input type="time" className="form-input" value={form.start_time} onChange={set('start_time')} />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Mulai</label>
                <input type="date" className="form-input" value={form.repair_date} onChange={set('repair_date')} />
              </div>
              <div className="form-group">
                <label className="form-label">Waktu Mulai</label>
                <input type="time" className="form-input" value={form.repair_time} onChange={set('repair_time')} />
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Selesai</label>
                <input type="date" className="form-input" value={form.end_date} onChange={set('end_date')} />
              </div>
              <div className="form-group">
                <label className="form-label">Waktu Selesai</label>
                <input type="time" className="form-input" value={form.end_time} onChange={set('end_time')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Downtime (jam)</label>
              <input type="number" step="0.1" min="0" className="form-input" value={form.duration_hrs} onChange={set('duration_hrs')} />
            </div>
          </div>
        </>
      ) : (
        /* ── View mode ──────────────────────────────────── */
        <>
          <div className="detail-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-title">{wo.machine}</div>
              <div className="detail-subtitle">{[wo.cluster, wo.line].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            <button className="detail-nav-btn" onClick={startEdit} title="Edit work order">
              <Pencil size={14} />
            </button>
            <button className="modal-close" onClick={closeWODetail}><X size={18} /></button>
          </div>

          <div className="detail-body">
            {/* Status badge */}
            <span className={`wo-badge ${isOpen ? 'open' : 'closed'}`} style={{ alignSelf: 'flex-start' }}>
              <span className="wo-badge-dot"></span>
              {isOpen ? 'OPEN' : 'CLOSE'}
            </span>

            {/* Info grid */}
            <div className="wo-detail-grid">
              <div className="wo-detail-row">
                <span className="wo-detail-key">Tanggal Lapor</span>
                <span className="wo-detail-val">{fmtDate(wo.date)}{wo.start ? ' · ' + wo.start : ''}</span>
              </div>
              {(wo.repair_date || wo.repair_time) && (
                <div className="wo-detail-row">
                  <span className="wo-detail-key">Tanggal Mulai</span>
                  <span className="wo-detail-val">{fmtDate(wo.repair_date)}{wo.repair_time ? ' · ' + wo.repair_time : ''}</span>
                </div>
              )}
              {(wo.end_date || wo.end_time) && (
                <div className="wo-detail-row">
                  <span className="wo-detail-key">Tanggal Selesai</span>
                  <span className="wo-detail-val">{fmtDate(wo.end_date)}{wo.end_time ? ' · ' + wo.end_time : ''}</span>
                </div>
              )}
              <div className="wo-detail-row">
                <span className="wo-detail-key">Downtime</span>
                <span className="wo-detail-val" style={{ color: wo.durationHrs > 0 ? 'var(--red)' : 'var(--muted)', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtHrs(wo.durationHrs)}
                </span>
              </div>
              {wo.akumulasiRepair != null && (
                <div className="wo-detail-row">
                  <span className="wo-detail-key">Akumulasi Waktu Repair</span>
                  <span className="wo-detail-val" style={{ color: 'var(--yellow)', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtHrs(wo.akumulasiRepair)}
                  </span>
                </div>
              )}
              <div className="wo-detail-row">
                <span className="wo-detail-key">PIC MTN</span>
                <span className="wo-detail-val">{wo.pic_mtn || '—'}</span>
              </div>
              <div className="wo-detail-row">
                <span className="wo-detail-key">Jenis Problem</span>
                <span className="wo-detail-val" style={{ maxWidth: 160, textAlign: 'right' }}>{wo.category || '—'}</span>
              </div>
            </div>

            {/* Problem */}
            <div className="detail-section">
              <div className="detail-section-title">Problem</div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>{wo.cause || '—'}</div>
            </div>

            {/* Penyelesaian */}
            <div className="detail-section">
              <div className="detail-section-title">Penyelesaian</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: wo.resolution ? 'var(--text)' : 'var(--muted)' }}>
                {wo.resolution || 'Belum ada penyelesaian'}
              </div>
            </div>

            {/* Action */}
            {wo.action && (
              <div className="detail-section">
                <div className="detail-section-title">Action / Tindakan</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{wo.action}</div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {isOpen && wo.id && (
                <button className="btn primary" style={{ flex: 1 }} onClick={handleCloseWO}>
                  Tutup WO
                </button>
              )}
              <button
                className="btn"
                style={{ color: 'var(--red)', borderColor: 'rgba(255,68,85,.35)', padding: '6px 12px' }}
                onClick={deleteWO}
                title="Hapus work order">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
