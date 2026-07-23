import { useEffect, useRef, useState } from 'react';
import { Menu, Sun, Moon, ClipboardList, Bell, LogOut, Maximize2, Minimize2, PanelLeft } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useTheme } from '../ThemeContext.jsx';

function tickLabel() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' +
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const NAV_ITEMS = [
  { page: 'dashboard',     label: 'Dashboard' },
  { page: 'dataproduksi',  label: 'Data Produksi' },
  { page: 'problemlog',    label: 'Problem & Root Cause' },
  { page: 'masterdata',    label: 'Master Data' },
  { href: '/rmo',          label: 'RESUME CONTROL HARIAN PRODUKSI' },
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
          Produksi<span> - DPA</span>
        </div>
        <nav className="nav-links">
          {NAV_ITEMS.map((n) => (
            <span
              key={n.page || n.href}
              className={'nav-item' + (n.page && page === n.page ? ' active' : '')}
              onClick={() => n.href ? window.open(n.href, '_blank') : navigate(n.page)}
            >{n.label}</span>
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
