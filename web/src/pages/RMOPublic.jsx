import { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Maximize2, Minimize2, ChevronDown } from 'lucide-react';

const API = '/api';

function fmtDate(str) {
  if (!str) return '—';
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : str;
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTime()  { return new Date().toTimeString().slice(0, 5); }

/* ── Dropdown pencarian mesin ───────────────────────── */
function MachineSelect({ machines, value, onChange, onPick, inputStyle, errStyle, hasError, inputRef }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const filtered = machines
    .filter((m) => !value || m.name.toLowerCase().includes(value.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30);

  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function handleChange(e) { onChange(e.target.value); setOpen(true); }

  function pick(name) { onChange(name); onPick(name); setOpen(false); }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          style={{ ...(hasError ? errStyle : inputStyle), paddingRight: 40 }}
          placeholder="Ketik atau pilih nama mesin…"
          autoComplete="off"
        />
        <ChevronDown
          size={18}
          style={{
            position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--muted)', pointerEvents: 'none',
            transition: 'transform .2s', rotate: open ? '180deg' : '0deg',
          }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 10, maxHeight: 230, overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,.14)',
        }}>
          {filtered.map((m) => (
            <div
              key={m.name}
              onMouseDown={() => pick(m.name)}
              style={{
                padding: '11px 16px', cursor: 'pointer', fontSize: 15,
                borderBottom: '1px solid var(--border)',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
            >
              <div style={{ fontWeight: 500 }}>{m.name}</div>
              {(m.cluster || m.line) && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {[m.cluster, m.line ? `Line ${m.line}` : ''].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Layar sukses setelah submit ────────────────────── */
function SuccessView({ data, onReset }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', textAlign: 'center' }}>
      <CheckCircle2 size={64} style={{ color: 'var(--green)', marginBottom: 16 }} />
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.4px', marginBottom: 10 }}>
        Work Order Berhasil Dikirim!
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 24, maxWidth: 420 }}>
        Laporan kerusakan untuk <strong style={{ color: 'var(--text)' }}>{data.machine}</strong> telah diterima dan diteruskan ke tim Maintenance.
      </div>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 24, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          ['Tanggal Lapor', fmtDate(data.date) + (data.start ? ' · ' + data.start : '')],
          ['Mesin', data.machine],
          ['Cluster / Line', [data.cluster, data.line].filter(Boolean).join(' / ') || '—'],
          ['Problem', data.cause],
          ['Grup Head Produksi', data.picGh || '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
            <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{k}</span>
            <span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
      <button className="btn primary" style={{ width: '100%', maxWidth: 480, padding: '14px', fontSize: 16 }} onClick={onReset}>
        Buat Laporan Baru
      </button>
    </div>
  );
}

/* ── Label helper ───────────────────────────────────── */
function FL({ children, sub }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 7, display: 'block' }}>
      {children}
      {sub && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: .55, marginLeft: 5, fontSize: 11 }}>{sub}</span>}
    </label>
  );
}

/* ── Popup konfirmasi batal ─────────────────────────── */
function CancelModal({ onConfirm, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onDismiss}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '36px 32px', maxWidth: 380, width: '88%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.4)',
      }} onClick={(e) => e.stopPropagation()}>
        <AlertTriangle size={44} style={{ color: 'var(--red)', marginBottom: 16 }} />
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, letterSpacing: '-.3px' }}>
          Batalkan Input RMO?
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 28 }}>
          Semua data yang sudah diisi akan dihapus dan tidak tersimpan.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" style={{ flex: 1, padding: '12px', fontSize: 15 }} onClick={onDismiss}>
            Tidak, Lanjutkan
          </button>
          <button className="btn"
            style={{ flex: 1, padding: '12px', fontSize: 15, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}
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
  const [machines, setMachines]         = useState([]);
  const [date, setDate]                 = useState(todayStr());
  const [start, setStart]               = useState(nowTime());
  const [machine, setMachine]           = useState('');
  const [cause, setCause]               = useState('');
  const [picGh, setPicGh]               = useState('');
  const [busy, setBusy]                 = useState(false);
  const [errM, setErrM]                 = useState('');
  const [errC, setErrC]                 = useState('');
  const [done, setDone]                 = useState(null);
  const [cancelWarn, setCancelWarn]     = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timeRef    = useRef(null);
  const machineRef = useRef(null);
  const causeRef   = useRef(null);
  const picGhRef   = useRef(null);
  const submitRef  = useRef(null);

  /* Tab title + force light theme */
  useEffect(() => {
    document.title = 'RMO';
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      document.title = 'MTN-DPA Monitoring';
      if (prev) document.documentElement.setAttribute('data-theme', prev);
      else document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  /* Fullscreen */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }, []);

  /* Fetch machines */
  useEffect(() => {
    fetch(`${API}/machines-public`).then((r) => r.json()).then(setMachines).catch(() => {});
  }, []);

  const machineObj   = machines.find((m) => m.name === machine.trim());
  const validMachine = !!machineObj;
  const hasInput     = !!(machine || cause || picGh);

  function handleMachinePick(name) {
    setErrM('');
    setTimeout(() => causeRef.current?.focus(), 80);
  }
  function handleCancel() { if (hasInput) setCancelWarn(true); else reset(); }
  function reset() {
    setDate(todayStr()); setStart(nowTime());
    setMachine(''); setCause(''); setPicGh('');
    setErrM(''); setErrC(''); setDone(null); setCancelWarn(false);
  }
  async function submit() {
    const m = machine.trim(), c = cause.trim();
    setErrM(m ? (validMachine ? '' : 'Mesin tidak ditemukan dalam daftar') : 'Wajib diisi');
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

  /* Styles — diperbesar */
  const inp = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 9, padding: '12px 16px', color: 'var(--text)',
    fontSize: 16, outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font)', transition: 'border-color .15s',
  };
  const inpErr = { ...inp, borderColor: 'var(--red)' };
  const ta     = { ...inp, resize: 'none', lineHeight: 1.6 };
  const taErr  = { ...ta,  borderColor: 'var(--red)' };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', overflow: 'hidden' }}>

      {/* ── Header orange ─────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', padding: '18px 32px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '.1em', textTransform: 'uppercase', textAlign: 'center' }}>
          Repair Machine Order
        </div>
      </div>

      {/* ── Konten ────────────────────────────────────── */}
      {done ? (
        <SuccessView data={done} onReset={reset} />
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '22px 44px 18px', maxWidth: 960, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {/* Grid form */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 32px', alignContent: 'start' }}>

            {/* Tanggal Lapor */}
            <div>
              <FL>Tanggal Lapor *</FL>
              <input type="date" lang="id" style={inp} value={date}
                onChange={(e) => setDate(e.target.value)} />
            </div>

            {/* Waktu */}
            <div>
              <FL>Waktu Lapor</FL>
              <input ref={timeRef} type="time" style={inp} value={start}
                onChange={(e) => setStart(e.target.value)} />
            </div>

            {/* Mesin — searchable dropdown, full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FL>Nama Mesin *</FL>
              <MachineSelect
                machines={machines}
                value={machine}
                onChange={setMachine}
                onPick={handleMachinePick}
                inputRef={machineRef}
                inputStyle={inp}
                errStyle={inpErr}
                hasError={!!(machine && !validMachine) || !!errM}
              />
              {errM && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{errM}</div>}
            </div>

            {/* Problem — 2 baris, full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FL>Problem Identifikasi *</FL>
              <textarea
                ref={causeRef}
                rows={2}
                style={!cause.trim() && errC ? taErr : ta}
                value={cause}
                onChange={(e) => setCause(e.target.value)}
              />
              {errC && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{errC}</div>}
            </div>

            {/* Grup Head Produksi */}
            <div>
              <FL>Grup Head Produksi</FL>
              <input
                ref={picGhRef}
                type="text"
                style={inp}
                value={picGh}
                onChange={(e) => setPicGh(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitRef.current?.click(); } }}
              />
            </div>

          </div>

          {/* ── Footer ──────────────────────────────────── */}
          <div style={{ flexShrink: 0, paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 16, display: 'flex', gap: 12 }}>
            <button className="btn"
              style={{ flex: '0 0 auto', padding: '14px 32px', fontSize: 16, borderRadius: 10 }}
              onClick={handleCancel}>
              Batal
            </button>
            <button ref={submitRef} className="btn primary"
              style={{ flex: 1, padding: '14px', fontSize: 16, borderRadius: 10 }}
              disabled={busy} onClick={submit}>
              {busy ? 'Menyimpan…' : 'Simpan Work Order'}
            </button>
          </div>

        </div>
      )}

      {/* ── Tombol fullscreen ─────────────────────────── */}
      <button className="login-fs-btn" onClick={toggleFullscreen}
        title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>

      {/* ── Popup konfirmasi batal ────────────────────── */}
      {cancelWarn && <CancelModal onConfirm={reset} onDismiss={() => setCancelWarn(false)} />}

    </div>
  );
}
