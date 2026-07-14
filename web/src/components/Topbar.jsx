import { useEffect, useRef, useState } from 'react';
import { Menu, Sun, Moon, ClipboardList, Bell, LogOut, Maximize2, Minimize2, PanelLeft } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useTheme } from '../ThemeContext.jsx';

// Gear cluster logo — 3 interlocking gears (gray, orange, teal).
// Background: black in dark theme (blends with topbar), white in light theme.
function BrandIcon({ size = 26 }) {
  const { theme } = useTheme();
  const bg  = theme === 'dark' ? '#0d0d0d' : '#f0f0f0';
  const hub = bg;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0, borderRadius: 3 }}>
      {/* Background circle */}
      <circle cx="50" cy="50" r="49" fill={bg}/>
      {/* Gray gear */}
      <path fill="#A2A2A2" d="M54,48 L50,53 L49.3,59.3 L43,60 L38,64 L33,60 L26.7,59.3 L26,53 L22,48 L26,43 L26.7,36.7 L33,36 L38,32 L43,36 L49.3,36.7 L50,43 Z"/>
      <circle cx="38" cy="48" r="6" fill={hub}/>
      {/* Orange gear */}
      <path fill="#E88D0A" d="M69,30 L65.4,34.3 L63.5,39.5 L58,38.5 L52.5,39.5 L50.6,34.3 L47,30 L50.6,25.7 L52.5,20.5 L58,21.5 L63.5,20.5 L65.4,25.7 Z"/>
      <circle cx="58" cy="30" r="4" fill={hub}/>
      {/* Teal gear */}
      <path fill="#1499AA" d="M68,65 L64.9,69 L63,73.7 L58,73 L53,73.7 L51.1,69 L48,65 L51.1,61 L53,56.3 L58,57 L63,56.3 L64.9,61 Z"/>
      <circle cx="58" cy="65" r="3.5" fill={hub}/>
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
  const { connected, notifications, breakdowns, isLoading } = useApp();
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
      <div className={`top-load-bar${isLoading ? ' active' : ''}`} />
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
