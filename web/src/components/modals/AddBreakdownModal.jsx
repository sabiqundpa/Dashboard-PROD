import { useState, useRef } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

const SEVERITIES = [
  { key: 'critical', notifColor: 'red' },
  { key: 'warning', notifColor: 'yellow' },
  { key: 'info', notifColor: 'blue' },
];

export default function AddBreakdownModal() {
  const { closeModal } = useUI();
  const { machines, addNotif, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [machine, setMachine] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState('');
  const [cause, setCause] = useState('');
  const [picGh, setPicGh] = useState('');
  const [errM, setErrM] = useState('');
  const [errC, setErrC] = useState('');
  const [busy, setBusy] = useState(false);

  // Auto-fill cluster & line from machine master data
  const machineObj = machines.find((m) => m.name === machine.trim());
  const validMachine = !!machineObj;
  const autoCluster = machineObj?.cluster || '';
  const autoLine = machineObj?.line || '';

  // Refs for Enter-key sequential navigation
  const dateRef     = useRef(null);
  const timeRef     = useRef(null);
  const machineRef  = useRef(null);
  const causeRef    = useRef(null);
  const picGhRef    = useRef(null);
  const submitRef   = useRef(null);

  // Focus next field on Enter key
  function onEnter(nextRef) {
    return (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nextRef.current?.focus();
      }
    };
  }

  function handleMachineChange(e) {
    const val = e.target.value;
    setMachine(val);
    // Auto-advance to Problem Identifikasi if exact match selected
    if (machines.some((m) => m.name === val.trim())) {
      setErrM('');
      setTimeout(() => causeRef.current?.focus(), 80);
    }
  }

  async function submit() {
    const m = machine.trim(), c = cause.trim();
    setErrM(m ? (validMachine ? '' : 'Mesin tidak ditemukan dalam master data') : 'Wajib diisi');
    setErrC(c ? '' : 'Wajib diisi');
    if (!m || !validMachine || !c) return;

    setBusy(true);
    try {
      // category & severity are filled by MTN staff when closing the WO
      await apiSend('/breakdown', 'POST', {
        machine_code: m, breakdown_date: date, start_time: start,
        failure_cause: c, failure_category: 'Mechanical', pic_gh: picGh, severity: 'warning',
      }, logout);
      const notifColor = 'yellow';
      addNotif(`${m}: ${c}`, notifColor);
      showToast(`Logged: ${m} — ${c}`, 'green');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(e.message, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Repair Machine Order" onClose={closeModal} fullscreen>
      <div className="rmo-form">

        {/* ── Baris 1: Tanggal + Waktu ─────────────────── */}
        <div className="form-group">
          <label className="form-label">Tanggal *</label>
          <input
            ref={dateRef}
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onKeyDown={onEnter(timeRef)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Waktu Mulai</label>
          <input
            ref={timeRef}
            type="time"
            className="form-input"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            onKeyDown={onEnter(machineRef)}
          />
        </div>

        {/* ── Baris 2: Mesin (full width) ──────────────── */}
        <div className="form-group rmo-full">
          <label className="form-label">Mesin *</label>
          <input
            ref={machineRef}
            type="text"
            className={'form-input' + (machine && !validMachine ? ' error' : '')}
            list="bd-machine-list"
            placeholder="Ketik nama mesin…"
            autoComplete="off"
            value={machine}
            onChange={handleMachineChange}
            onKeyDown={onEnter(causeRef)}
          />
          <datalist id="bd-machine-list">
            {machines.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}{m.cluster ? ` — ${m.cluster}` : ''}{m.line ? ` / Line ${m.line}` : ''}
              </option>
            ))}
          </datalist>
          <div className="form-error">{errM}</div>
        </div>

        {/* ── Baris 3: Cluster + Line (read-only auto-fill) */}
        <div className="form-group">
          <label className="form-label">
            Cluster
            <span style={{ fontSize: 10, fontWeight: 400, opacity: .55, marginLeft: 5, textTransform: 'none', letterSpacing: 0 }}>
              — terisi otomatis
            </span>
          </label>
          <input
            type="text"
            className={`form-input auto-fill${validMachine && autoCluster ? ' has-value' : ''}`}
            value={autoCluster}
            readOnly
            placeholder="Otomatis dari mesin"
            tabIndex={-1}
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Line
            <span style={{ fontSize: 10, fontWeight: 400, opacity: .55, marginLeft: 5, textTransform: 'none', letterSpacing: 0 }}>
              — terisi otomatis
            </span>
          </label>
          <input
            type="text"
            className={`form-input auto-fill${validMachine && autoLine ? ' has-value' : ''}`}
            value={autoLine}
            readOnly
            placeholder="Otomatis dari mesin"
            tabIndex={-1}
          />
        </div>

        {/* ── Baris 4: Problem Identifikasi (full width) ── */}
        <div className="form-group rmo-full">
          <label className="form-label">Problem Identifikasi *</label>
          <input
            ref={causeRef}
            type="text"
            className={'form-input' + (!cause.trim() && errC ? ' error' : '')}
            placeholder="contoh. Spindle rusak"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
            onKeyDown={onEnter(picGhRef)}
          />
          <div className="form-error">{errC}</div>
        </div>

        {/* ── Baris 5: PIC GH ─────────────────────────── */}
        <div className="form-group">
          <label className="form-label">PIC GH</label>
          <input
            ref={picGhRef}
            type="text"
            className="form-input"
            placeholder="Nama PIC GH"
            value={picGh}
            onChange={(e) => setPicGh(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRef.current?.click(); } }}
          />
        </div>

      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button ref={submitRef} className="btn primary" disabled={busy} onClick={submit}>
          {busy ? 'Menyimpan…' : 'Simpan Work Order'}
        </button>
      </div>
    </Modal>
  );
}
