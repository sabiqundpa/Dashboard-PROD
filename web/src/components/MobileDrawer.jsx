import { LogOut, X } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useAuth } from '../AuthContext.jsx';

export default function MobileDrawer() {
  const { drawerOpen, setDrawerOpen } = useUI();
  const { logout } = useAuth();

  return (
    <div className={'mobile-drawer' + (drawerOpen ? ' show' : '')}>
      <div className="mobile-overlay" onClick={() => setDrawerOpen(false)}></div>
      <div className="mobile-sidebar">
        <div className="drawer-header">
          <div className="logo">Produksi<span> Dashboard</span></div>
          <button className="modal-close" onClick={() => setDrawerOpen(false)}><X size={20} /></button>
        </div>

        <div className="sb-section">Akun</div>
        <div className="sb-item" onClick={logout}>
          <span className="sb-icon"><LogOut size={16} /></span>Log Out
        </div>
      </div>
    </div>
  );
}
