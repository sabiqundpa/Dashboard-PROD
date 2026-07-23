import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../AuthContext.jsx';
import { useTargets } from '../TargetsContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { openAdmin } = useTargets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const logoClickCount = useRef(0);
  const logoClickTimer = useRef(null);

  function onLogoClick() {
    logoClickCount.current += 1;
    clearTimeout(logoClickTimer.current);
    logoClickTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 600);
    if (logoClickCount.current >= 3) {
      logoClickCount.current = 0;
      openAdmin();
    }
  }

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

  async function submit() {
    setErr('');
    if (!username.trim() || !password) { setErr('Username dan password wajib diisi'); return; }
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') submit();
  }

  return (
    <div className="login-page">
      <button className="login-fs-btn" onClick={toggleFullscreen}
        title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
      <div className="login-card">
        <div className="logo" style={{ marginBottom: 20, cursor: 'default', userSelect: 'none' }} onClick={onLogoClick}>Produksi<span> Dashboard</span></div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Username</label>
          <div className="input-icon-wrap">
            <User size={15} className="input-icon" />
            <input className="form-input has-icon" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKeyDown} autoComplete="username" />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <label className="form-label">Password</label>
          <div className="input-icon-wrap">
            <Lock size={15} className="input-icon" />
            <input className="form-input has-icon" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKeyDown} autoComplete="current-password" />
          </div>
        </div>
        <button className="btn primary" style={{ width: '100%', padding: 11 }} disabled={busy} onClick={submit}>
          {busy ? 'Memproses…' : 'Masuk'}
        </button>
        <div className="login-err">{err}</div>
      </div>
    </div>
  );
}
