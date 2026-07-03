import { useEffect, useRef, useState } from 'react';
import { Menu, Sun, Moon, ClipboardList, Bell, LogOut, Maximize2, Minimize2, PanelLeft } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useTheme } from '../ThemeContext.jsx';

// Inline SVG: gear + wrench + down-arrow maintenance icon
// Uses currentColor so it adapts to dark/light theme automatically.
function BrandIcon({ size = 26 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="10"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {/* ── Gear (upper-left) ── */}
      <circle cx="76" cy="70" r="34" />
      <circle cx="76" cy="70" r="15" />
      {/* 8 gear teeth — filled rectangles so they appear solid */}
      {/* N */}
      <rect x="69" y="27" width="14" height="12" rx="3" fill="currentColor" stroke="none" />
      {/* S */}
      <rect x="69" y="101" width="14" height="12" rx="3" fill="currentColor" stroke="none" />
      {/* W */}
      <rect x="27" y="63" width="12" height="14" rx="3" fill="currentColor" stroke="none" />
      {/* E */}
      <rect x="101" y="63" width="12" height="14" rx="3" fill="currentColor" stroke="none" />
      {/* NW */}
      <rect x="39" y="38" width="12" height="12" rx="3" fill="currentColor" stroke="none"
        transform="rotate(-45 45 44)" />
      {/* NE */}
      <rect x="99" y="38" width="12" height="12" rx="3" fill="currentColor" stroke="none"
        transform="rotate(45 105 44)" />
      {/* SW */}
      <rect x="39" y="90" width="12" height="12" rx="3" fill="currentColor" stroke="none"
        transform="rotate(45 45 96)" />
      {/* SE */}
      <rect x="99" y="90" width="12" height="12" rx="3" fill="currentColor" stroke="none"
        transform="rotate(-45 105 96)" />

      {/* ── Wrench (diagonal lower-left → upper-right) ── */}
      {/* Long handle shaft */}
      <line x1="32" y1="178" x2="138" y2="52" strokeWidth="12" />
      {/* Open-end head at upper-right */}
      <path d="M126 40 Q156 24 168 44 Q176 62 160 76 L148 58" strokeWidth="9" />
      {/* Ball end at lower-left */}
      <circle cx="24" cy="186" r="11" strokeWidth="10" />

      {/* ── Down arrow (right side) ── */}
      <line x1="168" y1="90" x2="168" y2="160" strokeWidth="10" />
      <polyline points="154,146 168,165 182,146" strokeWidth="10" />
    </svg>
  );
}

function tickLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'machines', label: 'Mesin' },
  { page: 'maintenance', label: 'Breakdown' },
  { page: 'reports', label: 'Laporan' },
  { page: 'analytics', label: 'Analitik' },
];

export default function Topbar() {
  const { page, navigate, toggleDrawer, toggleNotif, toggleTodo, toggleSidebar } = useUI();
  const { connected, notifications, breakdowns } = useApp();
  const { username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [clock, setClock] = useState(tickLabel());
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const avatarRef = useRef(null);
  // Track whether the exit was triggered by the button (true) or Esc (false).
  // Browser Fullscreen API cannot be told to ignore Esc — instead we detect
  // an unintended exit and immediately re-enter fullscreen.
  const intentionalExitRef = useRef(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      intentionalExitRef.current = true;
      document.exitFullscreen().catch(() => {});
    }
  }

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement && !intentionalExitRef.current) {
        // Esc was pressed — re-enter fullscreen to lock it to button-only exit
        document.documentElement.requestFullscreen().catch(() => {});
        return;
      }
      intentionalExitRef.current = false;
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(tickLabel()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (avatarOpen && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [avatarOpen]);

  const unread = notifications.filter((n) => n.unread).length;
  const openWorkOrders = breakdowns.filter((b) => b.status === 'open').length;

  return (
    <header className="topbar">
      <button className="hamburger" onClick={toggleDrawer} aria-label="Menu"><Menu size={20} /></button>
      <button className="btn-icon sidebar-toggle" onClick={toggleSidebar} title="Toggle sidebar">
        <PanelLeft size={16} />
      </button>
      <div className="brand-nav">
        <div className="logo" onClick={() => navigate('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <BrandIcon size={24} />
          Maintenance<span> - DPA</span>
        </div>
        <nav className="nav-links">
          {NAV_ITEMS.map((n) => (
            <span key={n.page} className={'nav-item' + (page === n.page ? ' active' : '')} onClick={() => navigate(n.page)}>{n.label}</span>
          ))}
        </nav>
      </div>
      <div className="topbar-right">
        <span><span className={'conn-dot' + (connected ? '' : ' off')}></span><span className="conn-label">{connected ? 'Live' : 'Offline'}</span></span>
        <span className="date-label">{clock}</span>
        <button className="btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          className="btn-icon"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Keluar fullscreen (Esc)' : 'Tampilan fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <div className="notif-btn todo-btn" onClick={toggleTodo} title="To-Do · Work Order">
          <ClipboardList size={18} />
          {openWorkOrders > 0 && <span className="notif-badge">{openWorkOrders}</span>}
        </div>
        <div className="notif-btn" onClick={toggleNotif}>
          <Bell size={18} />
          {unread > 0 && <span className="notif-badge">{unread}</span>}
        </div>
        <div className="avatar-wrap" ref={avatarRef}>
          <div className="avatar" onClick={() => setAvatarOpen((v) => !v)} title={username || 'Admin'}>
            {(username || 'OP').slice(0, 2).toUpperCase()}
          </div>
          <div className={'avatar-menu' + (avatarOpen ? ' show' : '')}>
            <div className="avatar-menu-item" onClick={logout}><LogOut size={14} /> Log Out</div>
          </div>
        </div>
      </div>
    </header>
  );
}
