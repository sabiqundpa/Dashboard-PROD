import { useRef } from 'react';
import { LayoutDashboard, Cog, AlertTriangle, FileText, BarChart2, ClipboardList } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useTargets } from '../TargetsContext.jsx';

const NAV_ITEMS = [
  { page: 'dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { page: 'machines',    label: 'Mesin',       icon: Cog },
  { page: 'maintenance', label: 'Breakdown',   icon: AlertTriangle },
  { page: 'reports',     label: 'Laporan',     icon: FileText },
  { page: 'analytics',  label: 'Analitik',    icon: BarChart2 },
];

export default function AppSidebar() {
  const { page, navigate } = useUI();
  const { openAdmin } = useTargets();
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  function onVersionClick() {
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 600);
    if (clickCount.current >= 3) {
      clickCount.current = 0;
      openAdmin();
    }
  }

  return (
    <aside className="app-sidebar">
      <div className="asb-section">Navigasi</div>
      {NAV_ITEMS.map((n) => (
        <div
          key={n.page}
          className={`asb-item${page === n.page ? ' active' : ''}`}
          onClick={() => navigate(n.page)}
        >
          <n.icon size={15} />
          {n.label}
        </div>
      ))}
      <div className="asb-section" style={{ marginTop: 8 }}>Produksi</div>
      <div className="asb-item" onClick={() => window.open('/rmo', '_blank')} title="Buka di tab baru">
        <ClipboardList size={15} />
        RMO
      </div>
      <div className="asb-version" onClick={onVersionClick} title="">v1.0</div>
    </aside>
  );
}
