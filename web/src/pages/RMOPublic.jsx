import { useState, useRef, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

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

/* ── Halaman utama ──────────────────────────────────── */
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

  /* input style yang kompak */
  const inp = {
    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
    borderRadius: 8, padding: '10px 13px', color: 'var(--text)',
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
    fontFamily: 'var(--font)', transition: 'border-color .15s',
  };
  const inpRO = { ...inp, opacity: .55, cursor: 'default' };
  const inpErr = { ...inp, borderColor: 'var(--red)' };

  return (
    /* Shell: full viewport, flex column, tidak scroll */
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', overflow: 'hidden' }}>

      {/* ── Header orange ─────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', padding: '16px 28px', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#000', letterSpacing: '-.4px' }}>Repair Machine Order</div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,.55)', marginTop: 2 }}>Laporan kerusakan mesin — tim Produksi</div>
      </div>

      {/* ── Konten (tidak scroll) ──────────────────────── */}
      {done ? (
        <SuccessView data={done} onReset={reset} />
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '20px 40px 16px', maxWidth: 900, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

          {/* Grid form — 2 kolom */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', alignContent: 'start' }}>

            {/* Tanggal */}
            <div>
              <FL>Tanggal *</FL>
              <input type="date" style={inp} value={date}
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
              <input type="text" style={inpRO} value={machineObj?.cluster || ''} readOnly placeholder="Otomatis dari mesin" tabIndex={-1} />
            </div>

            {/* Line */}
            <div>
              <FL sub="— otomatis">Line</FL>
              <input type="text" style={inpRO} value={machineObj?.line || ''} readOnly placeholder="Otomatis dari mesin" tabIndex={-1} />
            </div>

            {/* Problem — full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FL>Problem Identifikasi *</FL>
              <input
                ref={causeRef}
                type="text"
                style={!cause.trim() && errC ? inpErr : inp}
                placeholder="contoh: Spindle tidak bisa berputar"
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                onKeyDown={onEnter(picGhRef)}
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

          {/* ── Footer / Tombol simpan ───────────────────── */}
          <div style={{ flexShrink: 0, paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 16 }}>
            <button ref={submitRef} className="btn primary"
              style={{ width: '100%', padding: '13px', fontSize: 15, borderRadius: 10 }}
              disabled={busy} onClick={submit}>
              {busy ? 'Menyimpan…' : 'Simpan Work Order'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
