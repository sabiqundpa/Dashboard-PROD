import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { exportCSV } from '../lib/exportCSV.js';

export default function MobileDrawer() {
  const { drawerOpen, setDrawerOpen, navigate, openModal } = useUI();
  const { kpi, machines } = useApp();
  const showToast = useToast();

  function go(page) {
    navigate(page);
    setDrawerOpen(false);
  }
  function open(modal) {
    openModal(modal);
    setDrawerOpen(false);
  }
  function doExport() {
    exportCSV(machines);
    showToast('✅ Diekspor ke CSV', 'green');
    setDrawerOpen(false);
  }

  return (
    <div className={'mobile-drawer' + (drawerOpen ? ' show' : '')}>
      <div className="mobile-overlay" onClick={() => setDrawerOpen(false)}></div>
      <div className="mobile-sidebar">
        <div className="drawer-header">
          <div className="logo">Maintenance<span> Dashboard</span></div>
          <button className="modal-close" onClick={() => setDrawerOpen(false)}>×</button>
        </div>
        <div className="sb-section">Gambaran Umum</div>
        <div className="sb-item" onClick={() => go('dashboard')}><span className="sb-icon">📊</span>Dashboard</div>
        <div className="sb-item" onClick={() => go('machines')}><span className="sb-icon">📋</span>Semua Mesin</div>
        <div className="sb-item" onClick={() => go('maintenance')}><span className="sb-icon">⚠️</span>Breakdown<span className="sb-badge">{kpi.breakdowns ?? '—'}</span></div>
        <div className="sb-item" onClick={() => go('reports')}><span className="sb-icon">📈</span>Reports</div>
        <div className="sb-section">Data</div>
        <div className="sb-item" onClick={() => open('import')}><span className="sb-icon">📥</span>Import CSV</div>
        <div className="sb-item" onClick={doExport}><span className="sb-icon">📤</span>Export Mesin (CSV)</div>
        <div className="sb-item" onClick={() => open('exportWorkOrders')}><span className="sb-icon">📑</span>Export Log Work Order</div>
        <div className="sb-item" onClick={() => open('addBreakdown')}><span className="sb-icon">➕</span>RMO</div>
        <div className="sb-item" onClick={() => open('addMachine')}><span className="sb-icon">🏭</span>Tambah Mesin</div>
      </div>
    </div>
  );
}
