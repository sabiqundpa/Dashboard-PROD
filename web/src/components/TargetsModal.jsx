import { useState, useEffect } from 'react';
import { X, Lock, RotateCcw, Save } from 'lucide-react';
import { useTargets, DEFAULTS } from '../TargetsContext.jsx';

export default function TargetsModal() {
  const {
    adminOpen, closeAdmin,
    availabilityTarget, mttrTarget, mtbfTarget, workHoursPerDay, workDaysPerMonth,
    saveTargets, checkPassword,
  } = useTargets();

  const [step, setStep]         = useState('pwd');
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [form, setForm]         = useState({ ...DEFAULTS });
  const [newPwd, setNewPwd]     = useState('');
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    if (adminOpen) {
      setStep('pwd');
      setPwdInput('');
      setPwdError('');
      setForm({ availabilityTarget, mttrTarget, mtbfTarget, workHoursPerDay, workDaysPerMonth });
      setNewPwd('');
      setSaved(false);
    }
  }, [adminOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!adminOpen) return null;

  function handleLogin(e) {
    e.preventDefault();
    if (checkPassword(pwdInput)) {
      setStep('edit');
      setPwdError('');
    } else {
      setPwdError('Password salah. Silakan coba lagi.');
      setPwdInput('');
    }
  }

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSave() {
    const next = {
      availabilityTarget: Math.max(0, Math.min(100, Number(form.availabilityTarget) || DEFAULTS.availabilityTarget)),
      mttrTarget:         Math.max(0, Number(form.mttrTarget)         || DEFAULTS.mttrTarget),
      mtbfTarget:         Math.max(0, Number(form.mtbfTarget)         || 0),
      workHoursPerDay:    Math.max(1, Math.min(24, Number(form.workHoursPerDay) || DEFAULTS.workHoursPerDay)),
      workDaysPerMonth:   Math.max(1, Math.min(31, Number(form.workDaysPerMonth) || DEFAULTS.workDaysPerMonth)),
    };
    saveTargets(next, newPwd.trim() || undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const plannedPreview = (Number(form.workHoursPerDay) || 0) * (Number(form.workDaysPerMonth) || 0);

  return (
    <div className="admin-overlay" onClick={closeAdmin}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="admin-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={14} />
            <span>{step === 'pwd' ? 'Panel Admin' : 'Pengaturan Target'}</span>
          </div>
          <button className="admin-close" onClick={closeAdmin} title="Tutup"><X size={14} /></button>
        </div>

        {/* Step 1 — Password */}
        {step === 'pwd' && (
          <form className="admin-body" onSubmit={handleLogin}>
            <p className="admin-hint" style={{ marginBottom: 16 }}>
              Masukkan password admin untuk mengakses pengaturan target KPI.
            </p>
            <div className="admin-field">
              <label>Password</label>
              <input
                type="password" autoFocus
                value={pwdInput}
                onChange={(e) => { setPwdInput(e.target.value); setPwdError(''); }}
                placeholder="••••••••"
              />
              {pwdError && <span className="admin-error">{pwdError}</span>}
            </div>
            <button type="submit" className="btn primary" style={{ width: '100%', marginTop: 12 }}>
              Masuk →
            </button>
          </form>
        )}

        {/* Step 2 — Edit Targets */}
        {step === 'edit' && (
          <div className="admin-body">

            <div className="admin-section-label">Target KPI</div>

            <div className="admin-field">
              <label>Availability Target</label>
              <div className="admin-input-row">
                <input type="number" min="0" max="100" step="0.5"
                  value={form.availabilityTarget}
                  onChange={(e) => set('availabilityTarget', e.target.value)} />
                <span className="admin-suffix">%</span>
              </div>
              <span className="admin-hint">Mesin dianggap OK jika availability ≥ nilai ini</span>
            </div>

            <div className="admin-field">
              <label>MTTR Target</label>
              <div className="admin-input-row">
                <input type="number" min="0" step="0.5"
                  value={form.mttrTarget}
                  onChange={(e) => set('mttrTarget', e.target.value)} />
                <span className="admin-suffix">jam</span>
              </div>
              <span className="admin-hint">Waktu perbaikan target per kejadian breakdown</span>
            </div>

            <div className="admin-field">
              <label>
                MTBF Target Minimal&nbsp;
                <span className="admin-optional">(0 = otomatis dari data)</span>
              </label>
              <div className="admin-input-row">
                <input type="number" min="0" step="1"
                  value={form.mtbfTarget}
                  onChange={(e) => set('mtbfTarget', e.target.value)} />
                <span className="admin-suffix">jam</span>
              </div>
              <span className="admin-hint">0 = gunakan jam kerja dari database mesin</span>
            </div>

            <div className="admin-section-label">Jam Operasional (Referensi)</div>

            <div className="admin-field">
              <label>Jam Kerja / Hari</label>
              <div className="admin-input-row">
                <input type="number" min="1" max="24" step="0.5"
                  value={form.workHoursPerDay}
                  onChange={(e) => set('workHoursPerDay', e.target.value)} />
                <span className="admin-suffix">jam</span>
              </div>
            </div>

            <div className="admin-field">
              <label>Hari Kerja / Bulan</label>
              <div className="admin-input-row">
                <input type="number" min="1" max="31" step="1"
                  value={form.workDaysPerMonth}
                  onChange={(e) => set('workDaysPerMonth', e.target.value)} />
                <span className="admin-suffix">hari</span>
              </div>
              <span className="admin-hint">
                Perkiraan <strong>{plannedPreview}</strong> jam/bulan per mesin (per shift)
              </span>
            </div>

            <div className="admin-section-label">Keamanan</div>

            <div className="admin-field">
              <label>
                Password Baru&nbsp;
                <span className="admin-optional">(kosongkan = tidak berubah)</span>
              </label>
              <input type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Password baru…" />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn" onClick={() => setForm({ ...DEFAULTS })}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <RotateCcw size={12} /> Reset
              </button>
              <button className="btn primary" onClick={handleSave}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                {saved ? '✓ Tersimpan!' : <><Save size={12} /> Simpan</>}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
