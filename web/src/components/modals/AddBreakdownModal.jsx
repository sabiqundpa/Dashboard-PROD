import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

const CATEGORIES = ['Mechanical', 'Electrical', 'Hydraulic', 'Operator', 'Preventive'];
const SEVERITIES = [
  { key: 'critical', label: 'Kritis', notifColor: 'red' },
  { key: 'warning', label: 'Waspada', notifColor: 'yellow' },
  { key: 'info', label: 'Info', notifColor: 'blue' },
];

export default function AddBreakdownModal() {
  const { closeModal } = useUI();
  const { machines, addNotif, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [machine, setMachine] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('');
  const [category, setCategory] = useState('Mechanical');
  const [severity, setSeverity] = useState('warning');
  const [cause, setCause] = useState('');
  const [picGh, setPicGh] = useState('');
  const [errM, setErrM] = useState('');
  const [errC, setErrC] = useState('');
  const [busy, setBusy] = useState(false);

  const validMachine = machines.some((m) => m.name === machine.trim());

  async function submit() {
    const m = machine.trim(), c = cause.trim();
    setErrM(m ? (validMachine ? '' : 'Mesin tidak ditemukan') : 'Required');
    setErrC(c ? '' : 'Required');
    if (!m || !validMachine || !c) return;

    setBusy(true);
    try {
      await apiSend('/breakdown', 'POST', {
        machine_code: m, breakdown_date: date, start_time: start,
        failure_cause: c, failure_category: category, pic_gh: picGh, severity,
      }, logout);
      const notifColor = SEVERITIES.find((s) => s.key === severity)?.notifColor || 'yellow';
      addNotif(`⚡ ${m}: ${c}`, notifColor);
      showToast(`✅ Logged: ${m} — ${c}`, 'green');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Repair Machine Order" onClose={closeModal} fullscreen>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Mesin *</label>
          <input type="text" className={'form-input' + (machine && !validMachine ? ' error' : '')} list="bd-machine-list" placeholder="Ketik nama mesin…" autoComplete="off" value={machine} onChange={(e) => setMachine(e.target.value)} />
          <datalist id="bd-machine-list">
            {machines.map((m) => <option key={m.name} value={m.name}>{m.name}{m.cluster ? ` (${m.cluster})` : ''}</option>)}
          </datalist>
          <div className="form-error">{errM}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Tanggal *</label>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Waktu Mulai</label>
          <input type="time" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jenis Problem</label>
          <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Level Bahaya</label>
          <select className="form-input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div className="form-group full">
          <label className="form-label">Problem Identifikasi *</label>
          <input type="text" className={'form-input' + (!cause.trim() && errC ? ' error' : '')} placeholder="contoh. Spindle rusak" value={cause} onChange={(e) => setCause(e.target.value)} />
          <div className="form-error">{errC}</div>
        </div>
        <div className="form-group">
          <label className="form-label">PIC GH</label>
          <input type="text" className="form-input" placeholder="Nama PIC GH" value={picGh} onChange={(e) => setPicGh(e.target.value)} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Simpan Work Order'}</button>
      </div>
    </Modal>
  );
}
