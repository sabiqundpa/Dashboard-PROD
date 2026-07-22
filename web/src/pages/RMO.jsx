import { useState, useRef } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiSend } from '../api.js';
import { fmtDate } from '../utils/fmt.js';

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function SuccessView({ data, onReset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 16, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
      <CheckCircle2 size={56} style={{ color: 'var(--green)' }} />
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.4px' }}>Work Order Berhasil Dibuat</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>
        RMO untuk <strong style={{ color: 'var(--text)' }}>{data.machine}</strong> telah tercatat dan diteruskan ke tim Produksi.
      </div>
      <div className="card" style={{ width: '100%', padding: '14px 16px', gap: 8, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        {[
          ['Tanggal Lapor', fmtDate(data.date) + (data.start ? ' · ' + data.start : '')],
          ['Mesin', data.machine],
          ['Cluster / Line', [data.cluster, data.line].filter(Boolean).join(' / ') || '—'],
          ['Problem', data.cause],
          ['PIC GH', data.picGh || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>{k}</span>
            <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 240 }}>{v}</span>
          </div>
        ))}
      </div>
      <button className="btn primary" style={{ width: '100%', padding: 11 }} onClick={onReset}>
        Buat RMO Baru
      </button>
    </div>
  );
}

export default function RMO() {
  const { machines, addNotif, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [date, setDate]       = useState(todayStr());
  const [start, setStart]     = useState(nowTime());
  const [machine, setMachine] = useState('');
  const [cause, setCause]     = useState('');
  const [picGh, setPicGh]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [errM, setErrM]       = useState('');
  const [errC, setErrC]       = useState('');
  const [done, setDone]       = useState(null);

  const timeRef    = useRef(null);
  const machineRef = useRef(null);
  const causeRef   = useRef(null);
  const picGhRef   = useRef(null);
  const submitRef  = useRef(null);

  const machineObj   = machines.find((m) => m.name === machine.trim());
  const validMachine = !!machineObj;

  function onEnter(ref) {
    return (e) => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.focus(); } };
  }

  function handleMachineChange(e) {
    const val = e.target.value;
    setMachine(val);
    if (machines.some((m) => m.name === val.trim())) {
      setErrM('');
      setTimeout(() => causeRef.current?.focus(), 80);
    }
  }

  function reset() {
    setDate(todayStr()); setStart(nowTime());
    setMachine(''); setCause(''); setPicGh('');
    setErrM(''); setErrC(''); setDone(null);
  }

  async function submit() {
    const m = machine.trim(), c = cause.trim();
    setErrM(m ? (validMachine ? '' : 'Mesin tidak ditemukan dalam master data') : 'Wajib diisi');
    setErrC(c ? '' : 'Wajib diisi');
    if (!m || !validMachine || !c) return;

    setBusy(true);
    try {
      await apiSend('/breakdown', 'POST', {
        machine_code: m, breakdown_date: date, start_time: start,
        failure_cause: c, failure_category: 'Mechanical', pic_gh: picGh, severity: 'warning',
      }, logout);
      addNotif?.(`${m}: ${c}`, 'yellow');
      loadAll();
      setDone({ machine: m, date, start, cause: c, picGh, cluster: machineObj?.cluster || '', line: machineObj?.line || '' });
    } catch (e) {
      showToast(e.message, 'red');
    }
    setBusy(false);
  }

  if (done) return <SuccessView data={done} onReset={reset} />;

  return (
    <div className="page-view active">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <div className="page-title">Repair Machine Order</div>
            <div className="page-sub">Laporan kerusakan mesin untuk tim Produksi</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640, width: '100%' }}>
        <div className="rmo-form">

          {/* Tanggal + Waktu */}
          <div className="form-group">
            <label className="form-label">Tanggal *</label>
            <input type="date" className="form-input" value={date}
              onChange={(e) => setDate(e.target.value)} onKeyDown={onEnter(timeRef)} />
          </div>
          <div className="form-group">
            <label className="form-label">Waktu Lapor</label>
            <input ref={timeRef} type="time" className="form-input" value={start}
              onChange={(e) => setStart(e.target.value)} onKeyDown={onEnter(machineRef)} />
          </div>

          {/* Mesin */}
          <div className="form-group rmo-full">
            <label className="form-label">Nama Mesin *</label>
            <input
              ref={machineRef}
              type="text"
              className={'form-input' + (machine && !validMachine ? ' error' : '')}
              list="rmo-machine-list"
              placeholder="Ketik nama mesin…"
              autoComplete="off"
              value={machine}
              onChange={handleMachineChange}
              onKeyDown={onEnter(causeRef)}
            />
            <datalist id="rmo-machine-list">
              {machines.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}{m.cluster ? ` — ${m.cluster}` : ''}{m.line ? ` / Line ${m.line}` : ''}
                </option>
              ))}
            </datalist>
            <div className="form-error">{errM}</div>
          </div>

          {/* Cluster + Line (auto-fill) */}
          <div className="form-group">
            <label className="form-label">Cluster <span style={{ fontSize: 10, fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>— otomatis</span></label>
            <input type="text" className={`form-input auto-fill${validMachine && machineObj?.cluster ? ' has-value' : ''}`}
              value={machineObj?.cluster || ''} readOnly placeholder="Otomatis" tabIndex={-1} />
          </div>
          <div className="form-group">
            <label className="form-label">Line <span style={{ fontSize: 10, fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>— otomatis</span></label>
            <input type="text" className={`form-input auto-fill${validMachine && machineObj?.line ? ' has-value' : ''}`}
              value={machineObj?.line || ''} readOnly placeholder="Otomatis" tabIndex={-1} />
          </div>

          {/* Problem */}
          <div className="form-group rmo-full">
            <label className="form-label">Problem / Kerusakan *</label>
            <input
              ref={causeRef}
              type="text"
              className={'form-input' + (!cause.trim() && errC ? ' error' : '')}
              placeholder="contoh: Spindle tidak bisa berputar"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              onKeyDown={onEnter(picGhRef)}
            />
            <div className="form-error">{errC}</div>
          </div>

          {/* PIC GH */}
          <div className="form-group">
            <label className="form-label">PIC GH (Pelapor)</label>
            <input
              ref={picGhRef}
              type="text"
              className="form-input"
              placeholder="Nama pelapor"
              value={picGh}
              onChange={(e) => setPicGh(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRef.current?.click(); } }}
            />
          </div>

        </div>

        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <button ref={submitRef} className="btn primary" style={{ width: '100%', padding: 11 }}
            disabled={busy} onClick={submit}>
            {busy ? 'Menyimpan…' : 'Kirim ke Produksi'}
          </button>
        </div>
      </div>
    </div>
  );
}
