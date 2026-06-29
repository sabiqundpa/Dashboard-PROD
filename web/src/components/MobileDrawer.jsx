import { useUI } from '../UIContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiDownload } from '../api.js';

export default function MobileDrawer() {
  const { drawerOpen, setDrawerOpen, navigate, openModal } = useUI();
  const showToast = useToast();
  const { logout } = useAuth();

  function go(page) {
    navigate(page);
    setDrawerOpen(false);
  }
  function open(modal) {
    openModal(modal);
    setDrawerOpen(false);
  }
  async function doExport() {
    setDrawerOpen(false);
    try {
      await apiDownload('/export/machines', `mesin-history-${new Date().toISOString().slice(0, 10)}.csv`, logout);
      showToast('✅ Diekspor ke CSV', 'green');
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
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
        <div className="sb-item" onClick={() => go('reports')}><span className="sb-icon">📈</span>Laporan</div>
        <div className="sb-section">Data</div>
        <div className="sb-item" onClick={() => open('import')}><span className="sb-icon">📥</span>Import CSV</div>
        <div className="sb-item" onClick={doExport}><span className="sb-icon">📤</span>Export Mesin (CSV)</div>
        <div className="sb-item" onClick={() => open('exportWorkOrders')}><span className="sb-icon">📑</span>Export Log Work Order</div>
        <div className="sb-item" onClick={() => open('addMachine')}><span className="sb-icon">🏭</span>Tambah Mesin</div>
      </div>
    </div>
  );
}
