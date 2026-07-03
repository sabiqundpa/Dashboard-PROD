import { LayoutDashboard, Cog, AlertTriangle, FileText, BarChart2 } from 'lucide-react';
import { useUI } from '../UIContext.jsx';

const NAV_ITEMS = [
  { page: 'dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { page: 'machines',    label: 'Mesin',       icon: Cog },
  { page: 'maintenance', label: 'Breakdown',   icon: AlertTriangle },
  { page: 'reports',     label: 'Laporan',     icon: FileText },
  { page: 'analytics',  label: 'Analitik',    icon: BarChart2 },
];

export default function AppSidebar() {
  const { page, navigate } = useUI();
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
    </aside>
  );
}
