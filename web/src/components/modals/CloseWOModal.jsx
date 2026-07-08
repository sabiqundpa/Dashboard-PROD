import { useState, useRef } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

const CATEGORIES = [
  'Perbaikan MTN',
  'Rusak / Mesin Trouble',
  'Penggantian Spare Part',
  'Penggantian Oli dan Coolant',
  'Problem Oli / Coolant',
  'Problem Qualitas',
  'Preventive MTN',
  'Problem Angin',
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

  const [endDate, setEndDate]     = useState(new Date().toISOString().slice(0, 10));
  const [endTime, setEndTime]     = useState(nowTime());
  const [picMtn, setPicMtn]       = useState('');
  const [category, setCategory]   = useState(CATEGORIES[0]);
  const [resolution, setResolution] = useState('');
  const [action, setAction]       = useState('');
  const [busy, setBusy]           = useState(false);

  // Refs for keyboard navigation
  const timeRef       = useRef(null);
  const picRef        = useRef(null);
  const catRef        = useRef(null);
  const resolutionRef = useRef(null);
  const actionRef     = useRef(null);
  const submitRef     = useRef(null);

  function onEnter(nextRef) {
    return (e) => { if (e.key === 'Enter') { e.preventDefault(); nextRef.current?.focus(); } };
  }

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
        severity: 'warning',
      }, logout);
      showToast('Work order berhasil ditutup', 'green');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(e.message, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Tutup Work Order" onClose={closeModal} fullscreen headerVariant="blue">
      <div className="rmo-form">

        {/* ── WO info banner ─────────────────────── */}
        <div className="rmo-full cwo-info-banner">
          <span className="cwo-machine">{payload.machine}</span>
          <span className="cwo-sep">—</span>
          <span className="cwo-cause">{payload.cause}</span>
        </div>

        {/* ── Tanggal + Waktu Selesai ────────────── */}
        <div className="form-group">
          <label className="form-label">Tanggal Selesai *</label>
          <input type="date" className="form-input" value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onKeyDown={onEnter(timeRef)} />
        </div>
        <div className="form-group">
          <label className="form-label">Waktu Selesai *</label>
          <input ref={timeRef} type="time" className="form-input" value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            onKeyDown={onEnter(picRef)} />
        </div>

        {/* ── PIC MTN + Jenis Problem ────────────── */}
        <div className="form-group">
          <label className="form-label">PIC MTN</label>
          <input ref={picRef} type="text" className="form-input" placeholder="Nama PIC MTN"
            value={picMtn} onChange={(e) => setPicMtn(e.target.value)}
            onKeyDown={onEnter(catRef)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jenis Problem</label>
          <select ref={catRef} className="form-input" value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={onEnter(resolutionRef)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ── Penyelesaian Problem ───────────────── */}
        <div className="form-group rmo-full">
          <label className="form-label">Penyelesaian Problem</label>
          <textarea ref={resolutionRef} className="form-input cwo-textarea"
            placeholder="Bagaimana problem diselesaikan…"
            value={resolution} onChange={(e) => setResolution(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); actionRef.current?.focus(); } }} />
        </div>

        {/* ── Action ────────────────────────────── */}
        <div className="form-group rmo-full">
          <label className="form-label">Action / Tindakan</label>
          <textarea ref={actionRef} className="form-input cwo-textarea"
            placeholder="Tindakan yang dilakukan…"
            value={action} onChange={(e) => setAction(e.target.value)} />
        </div>

      </div>

      {/* ── Footer ────────────────────────────────── */}
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Batal</button>
        <button ref={submitRef} className="btn blue" disabled={busy} onClick={submit}>
          {busy ? 'Menyimpan…' : 'Tutup WO'}
        </button>
      </div>
    </Modal>
  );
}
