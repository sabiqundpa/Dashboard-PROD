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

function Row({ label, value, valueStyle }) {
  return (
    <div className="wo-detail-row">
      <span className="wo-detail-key">{label}</span>
      <span className="wo-detail-val" style={valueStyle}>{value ?? '—'}</span>
    </div>
  );
}

export default function WOPanel() {
  const { detailWO, closeWODetail, openModal } = useUI();
  const { loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});

  const wo     = detailWO;
  const isOpen = wo?.status === 'open';

  // Edit mode: only initial Grup Head fields (identifikasi problem, jenis, tanggal lapor, GH)
  function startEdit() {
    setForm({
      cause:      wo.cause      || '',
      category:   wo.category   || CATEGORIES[0],
      pic_gh:     wo.pic_gh     || '',
      date:       wo.date       || '',
      start_time: wo.start      || '',
    });
    setEditMode(true);
  }

  function cancelEdit() { setEditMode(false); setForm({}); }
  function set(k) { return (e) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function saveEdit() {
    if (!form.cause?.trim()) { showToast('Identifikasi problem wajib diisi', 'red'); return; }
    setSaving(true);
    try {
      await apiSend(`/breakdown/${wo.id}`, 'PUT', {
        cause:      form.cause,
        category:   form.category,
        pic_gh:     form.pic_gh,
        date:       form.date,
        start_time: form.start_time,
      }, logout);
      showToast('RMO diperbarui', 'green');
      cancelEdit();
      await loadAll();
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'red'); }
    setSaving(false);
  }

  async function deleteWO() {
    if (!window.confirm(`Hapus work order ini?\n\n"${wo.cause}"\n${wo.machine} · ${fmtDate(wo.date)}\n\nData tidak bisa dikembalikan.`)) return;
    try {
      await apiSend(`/breakdown/${wo.id}`, 'DELETE', undefined, logout);
      showToast('Work order dihapus', 'yellow');
      closeWODetail();
      loadAll();
    } catch (e) { showToast(e.message || 'Gagal menghapus', 'red'); }
  }

  function handleTutupRMO() {
    openModal('closeWO', { id: wo.id, machine: wo.machine, cause: wo.cause });
  }

  return (
    <div className={`detail-panel${wo ? ' show' : ''}`} id="woPanel">
      {!wo ? null : editMode ? (
        /* ── Edit mode: Laporan Awal (Grup Head) ───── */
        <>
          <div className="detail-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-title">Edit Laporan Awal</div>
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
              <label className="form-label">Identifikasi Problem *</label>
              <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={form.cause} onChange={set('cause')} />
            </div>
            <div className="form-group">
              <label className="form-label">Jenis Problem</label>
              <select className="form-input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
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
            </div>
            <div className="form-group">
              <label className="form-label">Grup Head Produksi</label>
              <input className="form-input" value={form.pic_gh} onChange={set('pic_gh')} placeholder="Nama GH Produksi" />
            </div>
          </div>
        </>
      ) : (
        /* ── View mode ──────────────────────────────────── */
        <>
          <div className="detail-header">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-title">{wo.machine}</div>
              {(wo.cluster || wo.line) && (
                <div className="detail-subtitle">{[wo.cluster, wo.line].filter(Boolean).join(' · ')}</div>
              )}
            </div>
            <button className="detail-nav-btn" onClick={startEdit} title="Edit laporan awal">
              <Pencil size={14} />
            </button>
            <button className="modal-close" onClick={closeWODetail}><X size={18} /></button>
          </div>

          <div className="detail-body">
            {/* Status */}
            <span className={`wo-badge ${isOpen ? 'open' : 'closed'}`} style={{ alignSelf: 'flex-start' }}>
              <span className="wo-badge-dot"></span>
              {isOpen ? 'OPEN' : 'CLOSE'}
            </span>

            {/* Info grid */}
            <div className="wo-detail-grid">
              <Row label="Tanggal Lapor"
                value={`${fmtDate(wo.date)}${wo.start ? ' · ' + wo.start : ''}`} />
              <Row label="Tanggal Mulai Repair"
                value={wo.repair_date ? `${fmtDate(wo.repair_date)}${wo.repair_time ? ' · ' + wo.repair_time : ''}` : null} />
              <Row label="Tanggal Selesai"
                value={wo.end_date ? `${fmtDate(wo.end_date)}${wo.end_time ? ' · ' + wo.end_time : ''}` : null} />
              <Row label="Waktu Pengerjaan"
                value={wo.akumulasiRepair != null ? fmtHrs(wo.akumulasiRepair) : null}
                valueStyle={{ color: 'var(--yellow)', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }} />
              <Row label="Downtime"
                value={fmtHrs(wo.durationHrs)}
                valueStyle={{ color: wo.durationHrs > 0 ? 'var(--red)' : 'var(--muted)', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums' }} />
              <Row label="Grup Head Produksi" value={wo.pic_gh || null} />
              <Row label="PIC MTN" value={wo.pic_mtn || null} />
              <Row label="Jenis Problem" value={wo.category || null} />
            </div>

            {/* Identifikasi Problem */}
            <div className="detail-section">
              <div className="detail-section-title">Identifikasi Problem</div>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>{wo.cause || '—'}</div>
            </div>

            {/* Penyelesaian */}
            <div className="detail-section">
              <div className="detail-section-title">Penyelesaian</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: wo.resolution ? 'var(--text)' : 'var(--muted)' }}>
                {wo.resolution || 'Belum ada penyelesaian'}
              </div>
            </div>

            {/* Permanent Action */}
            <div className="detail-section">
              <div className="detail-section-title">Permanent Action</div>
              <div style={{ fontSize: 13, lineHeight: 1.55, color: wo.action ? 'var(--text)' : 'var(--muted)' }}>
                {wo.action || 'Belum ada permanent action'}
              </div>
            </div>

            {/* Buttons — pushed to bottom */}
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
              {isOpen && wo.id && (
                <button className="btn primary" style={{ flex: 1 }} onClick={handleTutupRMO}>
                  Tutup RMO
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
