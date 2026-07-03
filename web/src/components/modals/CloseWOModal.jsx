import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

const CATEGORIES = ['Mechanical', 'Electrical', 'Hydraulic', 'Operator', 'Preventive'];
const SEVERITIES = [
  { key: 'critical', label: 'Kritis' },
  { key: 'warning',  label: 'Waspada' },
  { key: 'info',     label: 'Info' },
];

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function CloseWOModal({ payload }) {
  const { closeModal } = useUI();
  const { loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [endTime, setEndTime] = useState(nowTime());
  const [picMtn, setPicMtn] = useState('');
  const [category, setCategory] = useState('Mechanical');
  const [severity, setSeverity] = useState('warning');
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await apiSend('/breakdown-close', 'POST', {
        id: payload.id,
        end_date: endDate,
        end_time: endTime,
        resolution,
        action,
        pic_mtn: picMtn,
        failure_category: category,
        severity,
      }, logout);
      showToast('Work order ditutup', 'green');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(e.message, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Tutup Work Order" onClose={closeModal}>
      {/* WO info header */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 13px', marginBottom: 14, fontSize: 13 }}>
        <span style={{ fontWeight: 600 }}>{payload.machine}</span>
        <span style={{ color: 'var(--muted)', marginLeft: 8 }}>— {payload.cause}</span>
      </div>

      <div className="form-grid">
        {/* Tanggal + Waktu Selesai */}
        <div className="form-group">
          <label className="form-label">Tanggal Selesai *</label>
          <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Waktu Selesai *</label>
          <input type="time" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        {/* PIC MTN */}
        <div className="form-group">
          <label className="form-label">PIC MTN</label>
          <input type="text" className="form-input" placeholder="Nama PIC MTN" value={picMtn} onChange={(e) => setPicMtn(e.target.value)} />
        </div>

        {/* Jenis Problem (dipindah dari RMO — diisi MTN saat tutup WO) */}
        <div className="form-group">
          <label className="form-label">Jenis Problem</label>
          <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Level Bahaya (dipindah dari RMO — diisi MTN saat tutup WO) */}
        <div className="form-group">
          <label className="form-label">Level Bahaya</label>
          <select className="form-input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Penyelesaian + Action */}
        <div className="form-group full">
          <label className="form-label">Penyelesaian Problem</label>
          <textarea className="form-input" placeholder="Bagaimana problem diselesaikan…" value={resolution} onChange={(e) => setResolution(e.target.value)} />
        </div>
        <div className="form-group full">
          <label className="form-label">Action</label>
          <textarea className="form-input" placeholder="Tindakan yang dilakukan…" value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Batal</button>
        <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Menyimpan…' : 'Tutup WO'}</button>
      </div>
    </Modal>
  );
}
