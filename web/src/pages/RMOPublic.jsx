import { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';

const API = '/api';

function fmtDate(str) {
  if (!str) return '—';
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTime()  { return new Date().toTimeString().slice(0, 5); }

/* ── Layar sukses setelah submit ────────────────────── */
function SuccessView({ data, onReset }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      <CheckCircle2 size={60} style={{ color: 'var(--green)', marginBottom: 14 }} />
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.4px', marginBottom: 8 }}>
        Work Order Berhasil Dikirim!
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20, maxWidth: 400 }}>
        Laporan kerusakan untuk <strong style={{ color: 'var(--text)' }}>{data.machine}</strong> telah diterima dan diteruskan ke tim Maintenance.
      </div>
      <div style={{ width: '100%', maxWidth: 440, background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
      <button className="btn primary" style={{ width: '100%', maxWidth: 440, padding: '13px', fontSize: 15 }} onClick={onReset}>
        Buat Laporan Baru
      </button>
    </div>
  );
}

/* ── Label helper ───────────────────────────────────── */
function FL({ children, sub }) {
  return (
    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5, display: 'block' }}>
      {children}
      {sub && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: .55, marginLeft: 5, fontSize: 10 }}>{sub}</span>}
    </label>
  );
}

/* ── Popup konfirmasi batal — di tengah layar ─────── */
function CancelModal({ onConfirm, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onDismiss}
    >
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '32px 28px', maxWidth: 360, width: '88%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.4)',
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <AlertTriangle size={40} style={{ color: 'var(--red)', marginBottom: 14 }} />
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, letterSpacing: '-.3px' }}>
          Batalkan Input RMO?
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Semua data yang sudah diisi akan dihapus dan tidak tersimpan.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1, padding: '11px', fontSize: 14 }} onClick={onDismiss}>
            Tidak, Lanjutkan
          </button>
          <button className="btn"
            style={{ flex: 1, padding: '11px', fontSize: 14, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}
            onClick={onConfirm}>
            Ya, Batalkan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Halaman utama ──────────────────────────────────── */
export default function RMOPublic() {
  const [machines, setMachines]     = useState([]);
  const [date, setDate]             = useState(todayStr());
  const [start, setStart]           = useState(nowTime());
  const [machine, setMachine]       = useState('');
  const [cause, setCause]           = useState('');
  const [picGh, setPicGh]           = useState('');
  const [busy, setBusy]             = useState(false);
  const [errM, setErrM]             = useState('');
  const [errC, setErrC]             = useState('');
  const [done, setDone]             = useState(null);
  const [cancelWarn, setCancelWarn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timeRef    = useRef(null);
  const machineRef = useRef(null);
  const causeRef   = useRef(null);
  const picGhRef   = useRef(null);
  const submitRef  = useRef(null);

  /* Tab title */
  useEffect(() => {
    document.title = 'RMO';
    return () => { document.title = 'MTN-DPA Monitoring'; };
  }, []);

  /* Fullscreen listener */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  /* Fetch machines */
  useEffect(() => {
    fetch(`${API}/machines-public`)
      .then((r) => r.json())
      .then(setMachines)
      .catch(() => {});
  }, []);

  const machineObj   = machines.find((m) => m.name === machine.trim());
  const validMachine = !!machineObj;
  const hasInput     = !!(machine || cause || picGh);

  function onEnter(ref) {
    return (e) => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.focus(); } };
  }
  function handleMachineChange(e) {
    setMachine(e.target.value);
    if (machines.some((m) => m.name === e.target.value.trim())) {
      setErrM('');
      setTimeout(() => causeRef.current?.focus(), 80);
    }
  }
  function handleCancel() {
    if (hasInput) { setCancelWarn(true); } else { reset(); }
  }
  function reset() {
    setDate(todayStr()); setStart(nowTime());
    setMachine(''); setCause(''); setPicGh('');
    setErrM(''); setErrC(''); setDone(null); setCancelWarn(false);
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
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  /* Styles */
  const inp = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 8, padding: '10px 13px', color: 'var(--text)',
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font)', transition: 'border-color .15s',
  };
  const inpRO  = { ...inp, opacity: .55, cursor: 'default' };
  const inpErr = { ...inp, borderColor: 'var(--red)' };
  /* Textarea Problem — 2 baris tetap, tidak fleksibel */
  const ta = { ...inp, resize: 'none', lineHeight: 1.55 };
  const taErr = { ...ta, borderColor: 'var(--red)' };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', overflow: 'hidden' }}>

      {/* ── Header orange ─────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', padding: '16px 28px', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-.4px' }}>Repair Machine Order</div>
      </div>

      {/* ── Konten ────────────────────────────────────── */}
      {done ? (
        <SuccessView data={done} onReset={reset} />
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '20px 40px 16px', maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {/* Grid form — 2 kolom */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', alignContent: 'start' }}>

            {/* Tanggal */}
            <div>
              <FL>Tanggal *</FL>
              <input type="date" lang="id" style={inp} value={date}
                onChange={(e) => setDate(e.target.value)} onKeyDown={onEnter(timeRef)} />
            </div>

            {/* Waktu */}
            <div>
              <FL>Waktu Lapor</FL>
              <input ref={timeRef} type="time" style={inp} value={start}
                onChange={(e) => setStart(e.target.value)} onKeyDown={onEnter(machineRef)} />
            </div>

            {/* Mesin — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FL>Nama Mesin *</FL>
              <input
                ref={machineRef}
                type="text"
                style={machine && !validMachine ? inpErr : inp}
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
              {errM && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errM}</div>}
            </div>

            {/* Cluster */}
            <div>
              <FL sub="— otomatis">Cluster</FL>
              <input type="text" style={inpRO} value={machineObj?.cluster || ''} readOnly tabIndex={-1} />
            </div>

            {/* Line */}
            <div>
              <FL sub="— otomatis">Line</FL>
              <input type="text" style={inpRO} value={machineObj?.line || ''} readOnly tabIndex={-1} />
            </div>

            {/* Problem — 2 baris tetap, full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FL>Problem Identifikasi *</FL>
              <textarea
                ref={causeRef}
                rows={2}
                style={!cause.trim() && errC ? taErr : ta}
                value={cause}
                onChange={(e) => setCause(e.target.value)}
              />
              {errC && <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{errC}</div>}
            </div>

            {/* PIC GH */}
            <div>
              <FL>PIC GH (Pelapor)</FL>
              <input
                ref={picGhRef}
                type="text"
                style={inp}
                placeholder="Nama PIC GH"
                value={picGh}
                onChange={(e) => setPicGh(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRef.current?.click(); } }}
              />
            </div>

          </div>

          {/* ── Footer ──────────────────────────────────── */}
          <div style={{ flexShrink: 0, paddingTop: 14, borderTop: '1px solid var(--border)', marginTop: 14, display: 'flex', gap: 12 }}>
            <button className="btn"
              style={{ flex: '0 0 auto', padding: '13px 28px', fontSize: 15, borderRadius: 10 }}
              onClick={handleCancel}>
              Batal
            </button>
            <button ref={submitRef} className="btn primary"
              style={{ flex: 1, padding: '13px', fontSize: 15, borderRadius: 10 }}
              disabled={busy} onClick={submit}>
              {busy ? 'Menyimpan…' : 'Simpan Work Order'}
            </button>
          </div>

        </div>
      )}

      {/* ── Tombol fullscreen — pojok kanan bawah ─────── */}
      <button className="login-fs-btn" onClick={toggleFullscreen}
        title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>

      {/* ── Popup konfirmasi batal — di tengah layar ─── */}
      {cancelWarn && (
        <CancelModal onConfirm={reset} onDismiss={() => setCancelWarn(false)} />
      )}

    </div>
  );
}
