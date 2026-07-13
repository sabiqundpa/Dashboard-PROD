import { LayoutDashboard, Settings, Wrench, ClipboardList, TrendingUp } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';

export default function BottomNav() {
  const { page, navigate } = useUI();
  const { kpi } = useApp();
  const hasAlert = (kpi.breakdowns ?? 0) > 0;

  return (
    <nav className="bottom-nav">
      <div className={'bn-item' + (page === 'dashboard' ? ' active' : '')} onClick={() => navigate('dashboard')}>
        <div className="bn-dot"></div><span className="bn-icon"><LayoutDashboard size={20} /></span><span className="bn-label">Dashboard</span>
      </div>
      <div className={'bn-item' + (page === 'machines' ? ' active' : '')} onClick={() => navigate('machines')}>
        <span className="bn-icon"><Settings size={20} /></span><span className="bn-label">Mesin</span>
      </div>
      <div className={'bn-item' + (hasAlert ? ' has-alert' : '') + (page === 'maintenance' ? ' active' : '')} onClick={() => navigate('maintenance')}>
        <div className="bn-dot"></div><span className="bn-icon"><Wrench size={20} /></span><span className="bn-label">Maintenance</span>
      </div>
      <div className={'bn-item' + (page === 'rmo' ? ' active' : '')} onClick={() => navigate('rmo')}>
        <span className="bn-icon"><ClipboardList size={20} /></span><span className="bn-label">RMO</span>
      </div>
      <div className={'bn-item' + (page === 'reports' ? ' active' : '')} onClick={() => navigate('reports')}>
        <span className="bn-icon"><TrendingUp size={20} /></span><span className="bn-label">Laporan</span>
      </div>
    </nav>
  );
}
