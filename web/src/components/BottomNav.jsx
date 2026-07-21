import { LayoutDashboard, Cog, Wrench, ClipboardList, BarChart2 } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';

export default function BottomNav() {
  const { page, navigate } = useUI();
  const { kpi } = useApp();
  const hasAlert = (kpi.breakdowns ?? 0) > 0;

  return (
    <nav className="bottom-nav">
      <div className={'bn-item' + (page === 'dashboard' ? ' active' : '')} onClick={() => navigate('dashboard')}>
        <div className="bn-dot"></div>
        <span className="bn-icon"><LayoutDashboard size={20} /></span>
        <span className="bn-label">Dashboard</span>
      </div>
      <div className={'bn-item' + (page === 'machines' ? ' active' : '')} onClick={() => navigate('machines')}>
        <span className="bn-icon"><Cog size={20} /></span>
        <span className="bn-label">Mesin</span>
      </div>
      <div className={'bn-item' + (hasAlert ? ' has-alert' : '') + (page === 'maintenance' ? ' active' : '')} onClick={() => navigate('maintenance')}>
        <div className="bn-dot"></div>
        <span className="bn-icon"><Wrench size={20} /></span>
        <span className="bn-label">Breakdown</span>
      </div>
      <div className="bn-item" onClick={() => window.open('/rmo', '_blank')}>
        <span className="bn-icon"><ClipboardList size={20} /></span>
        <span className="bn-label">RMO</span>
      </div>
      <div className={'bn-item' + (page === 'analytics' ? ' active' : '')} onClick={() => navigate('analytics')}>
        <span className="bn-icon"><BarChart2 size={20} /></span>
        <span className="bn-label">Analitik</span>
      </div>
    </nav>
  );
}
