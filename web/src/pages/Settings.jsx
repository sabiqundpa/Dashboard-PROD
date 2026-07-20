import { useState, useEffect, useCallback } from 'react';
import { Target, Calendar, User, Save, RefreshCw, KeyRound, CheckCircle2, RotateCcw } from 'lucide-react';
import { useTargets, DEFAULTS } from '../TargetsContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend } from '../api.js';

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// ── Section header ───────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function NumInput({ value, onChange, min, max, step, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 180 }}>
      <input
        type="number" min={min} max={max} step={step ?? 1}
        className="form-input"
        style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', flex: 1 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{suffix}</span>}
    </div>
  );
}

// ── Tab 1: Target KPI ────────────────────────────────────
function TargetSection() {
  const { availabilityTarget, mttrTarget, mtbfTarget, workHoursPerDay, workDaysPerMonth, saveTargets } = useTargets();
  const showToast = useToast();
  const [form, setForm] = useState({ availabilityTarget, mttrTarget, mtbfTarget, workHoursPerDay, workDaysPerMonth });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ availabilityTarget, mttrTarget, mtbfTarget, workHoursPerDay, workDaysPerMonth });
  }, [availabilityTarget, mttrTarget, mtbfTarget, workHoursPerDay, workDaysPerMonth]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSave() {
    const next = {
      availabilityTarget: Math.max(0, Math.min(100, Number(form.availabilityTarget) || DEFAULTS.availabilityTarget)),
      mttrTarget:         Math.max(0, Number(form.mttrTarget) || DEFAULTS.mttrTarget),
      mtbfTarget:         Math.max(0, Number(form.mtbfTarget) || 0),
      workHoursPerDay:    Math.max(1, Math.min(24, Number(form.workHoursPerDay) || DEFAULTS.workHoursPerDay)),
      workDaysPerMonth:   Math.max(1, Math.min(31, Number(form.workDaysPerMonth) || DEFAULTS.workDaysPerMonth)),
    };
    saveTargets(next);
    showToast('Target KPI disimpan', 'green');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const plannedPreview = (Number(form.workHoursPerDay) || 0) * (Number(form.workDaysPerMonth) || 0);

  return (
    <div>
      <SectionHeader icon={Target} title="Target KPI" sub="Nilai target yang digunakan sebagai batas evaluasi performa mesin" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
        <FieldRow label="Availability Target" hint="Mesin dianggap OK jika availability ≥ nilai ini">
          <NumInput value={form.availabilityTarget} onChange={(v) => set('availabilityTarget', v)} min={0} max={100} step={0.5} suffix="%" />
        </FieldRow>

        <FieldRow label="MTTR Target" hint="Waktu perbaikan target per kejadian breakdown">
          <NumInput value={form.mttrTarget} onChange={(v) => set('mttrTarget', v)} min={0} step={0.5} suffix="jam" />
        </FieldRow>

        <FieldRow label="MTBF Target Minimal" hint="0 = gunakan jam kerja dari database mesin (otomatis)">
          <NumInput value={form.mtbfTarget} onChange={(v) => set('mtbfTarget', v)} min={0} step={1} suffix="jam" />
        </FieldRow>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Parameter Jam Operasional</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <FieldRow label="Jam Kerja per Hari">
            <NumInput value={form.workHoursPerDay} onChange={(v) => set('workHoursPerDay', v)} min={1} max={24} step={0.5} suffix="jam/hari" />
          </FieldRow>
          <FieldRow label="Hari Kerja per Bulan (default)" hint={`≈ ${plannedPreview} jam kerja per mesin per bulan`}>
            <NumInput value={form.workDaysPerMonth} onChange={(v) => set('workDaysPerMonth', v)} min={1} max={31} step={1} suffix="hari/bln" />
          </FieldRow>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          onClick={() => setForm({ ...DEFAULTS })}>
          <RotateCcw size={12} /> Reset Default
        </button>
        <button className="btn primary" style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={handleSave}>
          {saved ? <><CheckCircle2 size={12} /> Tersimpan!</> : <><Save size={12} /> Simpan Target</>}
        </button>
      </div>
    </div>
  );
}

// ── Tab 2: Kalender Kerja ────────────────────────────────
function CalendarSection() {
  const showToast = useToast();
  const { logout } = useAuth();
  const thisYear = new Date().getFullYear();
  const [calYear, setCalYear] = useState(thisYear);
  const [days, setDays] = useState(Array(12).fill(22));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/working-calendar?year=${calYear}`, null, logout);
      if (data?.records) {
        const d = Array(12).fill(22);
        for (const r of data.records) d[r.month - 1] = r.workingDays;
        setDays(d);
      }
    } catch (_) {}
    setLoading(false);
  }, [calYear, logout]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  function setMonth(idx, val) {
    const v = Math.max(1, Math.min(31, parseInt(val) || 1));
    setDays((prev) => { const n = [...prev]; n[idx] = v; return n; });
  }

  async function saveAll() {
    setSaving(true);
    try {
      for (let m = 0; m < 12; m++) {
        await apiSend('/working-calendar', 'PUT', { year: calYear, month: m + 1, workingDays: days[m] }, logout);
      }
      showToast(`Kalender kerja ${calYear} disimpan`, 'green');
    } catch (e) { showToast(e.message || 'Gagal menyimpan', 'red'); }
    setSaving(false);
  }

  const totalDays = days.reduce((s, d) => s + d, 0);

  return (
    <div>
      <SectionHeader icon={Calendar} title="Kalender Kerja" sub="Hari kerja aktual per bulan — digunakan untuk kalkulasi Availability, MTBF, dan MTTR" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <select className="form-input" style={{ width: 96 }} value={calYear}
          onChange={(e) => setCalYear(parseInt(e.target.value))}>
          {[thisYear - 2, thisYear - 1, thisYear, thisYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button className="btn primary" onClick={saveAll} disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: 13, padding: '16px 0' }}>Memuat…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 12 }}>
            {MONTH_NAMES.map((name, idx) => (
              <div key={idx} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 10px 8px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 6 }}>{name.slice(0, 3)}</div>
                <input
                  type="number" min={1} max={31} className="form-input"
                  style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', padding: '4px 4px', width: '100%' }}
                  value={days[idx]}
                  onChange={(e) => setMonth(idx, e.target.value)}
                />
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4, textAlign: 'center' }}>hari</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            Total {calYear}: <strong style={{ color: 'var(--text)' }}>{totalDays} hari kerja</strong>
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            Rata-rata <strong style={{ color: 'var(--text)' }}>{(totalDays / 12).toFixed(1)} hari/bulan</strong>
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab 3: Akun & Keamanan ───────────────────────────────
function AccountSection() {
  const showToast = useToast();
  const { username, logout } = useAuth();
  const [curPwd, setCurPwd]   = useState('');
  const [newPwd, setNewPwd]   = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [busy, setBusy]       = useState(false);

  async function handleChangePwd(e) {
    e.preventDefault();
    if (!curPwd || !newPwd) { showToast('Semua field wajib diisi', 'red'); return; }
    if (newPwd.length < 6) { showToast('Password baru minimal 6 karakter', 'red'); return; }
    if (newPwd !== confPwd) { showToast('Konfirmasi password tidak cocok', 'red'); return; }
    setBusy(true);
    try {
      await apiSend('/change-password', 'POST', { currentPassword: curPwd, newPassword: newPwd }, logout);
      showToast('Password berhasil diubah — silakan login kembali', 'green');
      setCurPwd(''); setNewPwd(''); setConfPwd('');
      setTimeout(() => logout(), 1800);
    } catch (e) { showToast(e.message || 'Gagal mengubah password', 'red'); }
    setBusy(false);
  }

  return (
    <div>
      <SectionHeader icon={User} title="Akun & Keamanan" sub="Kelola kredensial login untuk panel admin" />

      <div style={{ background: 'var(--s2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Login aktif sebagai</div>
        <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 800 }}>
            {(username || 'OP').slice(0, 2).toUpperCase()}
          </span>
          {username}
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', marginBottom: 16 }}>
        <KeyRound size={11} style={{ verticalAlign: 'middle', marginRight: 5 }} />
        Ganti Password
      </div>

      <form onSubmit={handleChangePwd}>
        <div style={{ maxWidth: 380 }}>
          <FieldRow label="Password Saat Ini">
            <input type="password" className="form-input" value={curPwd}
              onChange={(e) => setCurPwd(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </FieldRow>
          <FieldRow label="Password Baru" hint="Minimal 6 karakter">
            <input type="password" className="form-input" value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </FieldRow>
          <FieldRow label="Konfirmasi Password Baru">
            <input type="password" className="form-input" value={confPwd}
              onChange={(e) => setConfPwd(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </FieldRow>
          <button type="submit" className="btn primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} disabled={busy}>
            {busy ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Menyimpan…</> : <><KeyRound size={12} /> Ubah Password</>}
          </button>
        </div>
      </form>

      <div style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>Lupa username?</strong> Cek tabel Admin di Supabase SQL Editor:<br />
          <code style={{ background: 'var(--s2)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5 }}>SELECT username FROM "Admin";</code>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings page ───────────────────────────────────
const TABS = [
  { key: 'targets',  label: 'Target KPI',      icon: Target },
  { key: 'calendar', label: 'Kalender Kerja',   icon: Calendar },
  { key: 'account',  label: 'Akun',             icon: User },
];

export default function Settings() {
  const [tab, setTab] = useState('targets');

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Pengaturan</div>
          <div className="page-sub">Konfigurasi target, kalender kerja, dan akun admin</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', fontSize: 13, fontWeight: active ? 700 : 400,
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1, borderRadius: 0, transition: 'color .15s',
              }}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ maxWidth: 780 }}>
        <div style={{ padding: '4px 0' }}>
          {tab === 'targets'  && <TargetSection />}
          {tab === 'calendar' && <CalendarSection />}
          {tab === 'account'  && <AccountSection />}
        </div>
      </div>
    </div>
  );
}
