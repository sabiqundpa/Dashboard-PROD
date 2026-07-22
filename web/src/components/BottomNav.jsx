import { LayoutDashboard, ClipboardList } from 'lucide-react';
import { useUI } from '../UIContext.jsx';

export default function BottomNav() {
  const { page, navigate } = useUI();

  return (
    <nav className="bottom-nav">
      <div className={'bn-item' + (page === 'dashboard' ? ' active' : '')} onClick={() => navigate('dashboard')}>
        <div className="bn-dot"></div>
        <span className="bn-icon"><LayoutDashboard size={20} /></span>
        <span className="bn-label">Dashboard</span>
      </div>
      <div className="bn-item" onClick={() => window.open('/rmo', '_blank')}>
        <span className="bn-icon"><ClipboardList size={20} /></span>
        <span className="bn-label">RC Produksi</span>
      </div>
    </nav>
  );
}
