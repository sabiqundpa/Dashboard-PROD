import { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

const API = '/api';

function fmtDate(str) {
  if (!str) return '—';
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function SuccessView({ data, onReset }) {
  return (
    <div className="fullscreen-body" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        <CheckCircle2 size={64} style={{ color: 'var(--green)', marginBottom: 16 }} />
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.4px', marginBottom: 10 }}>
          Work Order Berhasil Dikirim!
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          Laporan kerusakan untuk <strong style={{ color: 'var(--text)' }}>{data.machine}</strong> telah diterima dan diteruskan ke tim Maintenance.
        </div>
        <div className="card" style={{ padding: '14px 18px', marginBottom: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Tanggal Lapor', fmtDate(data.date) + (data.start ? ' · ' + data.start : '')],
            ['Mesin', data.machine],
            ['Cluster / Line', [data.cluster, data.line].filter(Boolean).join(' / ') || '—'],
            ['Problem', data.cause],
            ['PIC GH', data.picGh || '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{k}</span>
              <span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
        <button className="btn primary" style={{ width: '100%', padding: '13px', fontSize: 15 }} onClick={onReset}>
          Buat Laporan Baru
        </button>
      </div>
    </div>
  );
}

export default function RMOPublic() {
  const [machines, setMachines] = useState([]);
  const [date, setDate]         = useState(todayStr());
  const [start, setStart]       = useState(nowTime());
  const [machine, setMachine]   = useState('');
  const [cause, setCause]       = useState('');
  const [picGh, setPicGh]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [errM, setErrM]         = useState('');
  const [errC, setErrC]         = useState('');
  const [done, setDone]         = useState(null);

  const timeRef    = useRef(null);
  const machineRef = useRef(null);
  const causeRef   = useRef(null);
  const picGhRef   = useRef(null);
  const submitRef  = useRef(null);

  useEffect(() => {
    fetch(`${API}/machines-public`)
      .then((r) => r.json())
      .then(setMachines)
      .catch(() => {});
  }, []);

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
    setErrM(m ? (validMachine ? '' : 'Mesin tidak ditemukan') : 'Wajib diisi');
    setErrC(c ? '' : 'Wajib diisi');
    if (!m || !validMachine || !c) return;

    setBusy(true);
    try {
      const r = await fetch(`${API}/public-rmo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_code: m, breakdown_date: date, start_time: start, failure_cause: c, pic_gh: picGh }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Gagal mengirim');
      setDone({ machine: m, date, start, cause: c, picGh, cluster: machineObj?.cluster || '', line: machineObj?.line || '' });
    } catch (e) {
      alert(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="overlay show fullscreen" style={{ position: 'fixed', inset: 0 }}>
      <div className="modal fullscreen">
        {/* Orange header — sama dengan AddBreakdownModal */}
        <div className="fullscreen-header">
          <div className="modal-title">Repair Machine Order</div>
          <button className="modal-close" onClick={() => window.close()} title="Tutup tab">
            <X size={24} />
          </button>
        </div>

        {done ? (
          <SuccessView data={done} onReset={reset} />
        ) : (
          <div className="fullscreen-body">
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
                  list="rmo-pub-machine-list"
                  placeholder="Ketik nama mesin…"
                  autoComplete="off"
                  value={machine}
                  onChange={handleMachineChange}
                  onKeyDown={onEnter(causeRef)}
                />
                <datalist id="rmo-pub-machine-list">
                  {machines.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}{m.cluster ? ` — ${m.cluster}` : ''}{m.line ? ` / Line ${m.line}` : ''}
                    </option>
                  ))}
                </datalist>
                <div className="form-error">{errM}</div>
              </div>

              {/* Cluster + Line auto-fill */}
              <div className="form-group">
                <label className="form-label">
                  Cluster <span style={{ fontSize: 10, fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>— otomatis</span>
                </label>
                <input type="text" className={`form-input auto-fill${validMachine && machineObj?.cluster ? ' has-value' : ''}`}
                  value={machineObj?.cluster || ''} readOnly placeholder="Otomatis dari mesin" tabIndex={-1} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Line <span style={{ fontSize: 10, fontWeight: 400, opacity: .5, textTransform: 'none', letterSpacing: 0 }}>— otomatis</span>
                </label>
                <input type="text" className={`form-input auto-fill${validMachine && machineObj?.line ? ' has-value' : ''}`}
                  value={machineObj?.line || ''} readOnly placeholder="Otomatis dari mesin" tabIndex={-1} />
              </div>

              {/* Problem */}
              <div className="form-group rmo-full">
                <label className="form-label">Problem Identifikasi *</label>
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

            {/* Footer */}
            <div className="modal-footer">
              <button ref={submitRef} className="btn primary" disabled={busy} onClick={submit}>
                {busy ? 'Menyimpan…' : 'Simpan Work Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
