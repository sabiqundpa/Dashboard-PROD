import { LayoutDashboard, Table2, ClipboardList, AlertTriangle, Database } from 'lucide-react';
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
      <div className={'bn-item' + (page === 'dataproduksi' ? ' active' : '')} onClick={() => navigate('dataproduksi')}>
        <span className="bn-icon"><Table2 size={20} /></span>
        <span className="bn-label">Data Produksi</span>
      </div>
      <div className={'bn-item' + (page === 'problemlog' ? ' active' : '')} onClick={() => navigate('problemlog')}>
        <span className="bn-icon"><AlertTriangle size={20} /></span>
        <span className="bn-label">Problem Log</span>
      </div>
      <div className={'bn-item' + (page === 'masterdata' ? ' active' : '')} onClick={() => navigate('masterdata')}>
        <span className="bn-icon"><Database size={20} /></span>
        <span className="bn-label">Master Data</span>
      </div>
      <div className="bn-item" onClick={() => window.open('/lhp', '_blank')}>
        <span className="bn-icon"><ClipboardList size={20} /></span>
        <span className="bn-label">RC Produksi</span>
      </div>
    </nav>
  );
}
