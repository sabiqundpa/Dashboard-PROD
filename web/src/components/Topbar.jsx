import { useEffect, useRef, useState } from 'react';
import { Menu, Sun, Moon, ClipboardList, Bell, LogOut } from 'lucide-react';
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
  { page: 'dashboard', label: 'Dashboard' },
  { page: 'machines', label: 'Mesin' },
  { page: 'maintenance', label: 'Breakdown' },
  { page: 'reports', label: 'Laporan' },
  { page: 'analytics', label: 'Analitik' },
];

export default function Topbar() {
  const { page, navigate, toggleDrawer, toggleNotif, toggleTodo } = useUI();
  const { connected, notifications, breakdowns } = useApp();
  const { username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [clock, setClock] = useState(tickLabel());
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);

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
      <div className="brand-nav">
        <div className="logo" onClick={() => navigate('dashboard')}>Maintenance<span> Dashboard</span></div>
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
