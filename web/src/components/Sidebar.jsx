import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { exportCSV } from '../lib/exportCSV.js';

export default function Sidebar() {
  const { page, navigate, openModal } = useUI();
  const { kpi, machines } = useApp();
  const showToast = useToast();

  function doExport() {
    exportCSV(machines);
    showToast('✅ Diekspor ke CSV', 'green');
  }

  return (
    <aside className="sidebar">
      <div className="sb-section">Gambaran Umum</div>
      <div className={'sb-item' + (page === 'dashboard' ? ' active' : '')} onClick={() => navigate('dashboard')}><span className="sb-icon">📊</span>Dashboard</div>
      <div className={'sb-item' + (page === 'machines' ? ' active' : '')} onClick={() => navigate('machines')}><span className="sb-icon">📋</span>Semua Mesin</div>
      <div className={'sb-item' + (page === 'maintenance' ? ' active' : '')} onClick={() => navigate('maintenance')}><span className="sb-icon">⚠️</span>Breakdowns<span className="sb-badge">{kpi.breakdowns ?? '—'}</span></div>
      <div className={'sb-item' + (page === 'reports' ? ' active' : '')} onClick={() => navigate('reports')}><span className="sb-icon">📈</span>Laporan</div>
      <div className="sb-section">Data</div>
      <div className="sb-item" onClick={() => openModal('import')}><span className="sb-icon">📥</span>Import CSV</div>
      <div className="sb-item" onClick={doExport}><span className="sb-icon">📤</span>Export Mesin (CSV)</div>
      <div className="sb-item" onClick={() => openModal('exportWorkOrders')}><span className="sb-icon">📑</span>Export Log Work Order</div>
      <div className="sb-item" onClick={() => openModal('addBreakdown')}><span className="sb-icon">➕</span>Repair Machine Order</div>
      <div className="sb-item" onClick={() => openModal('addMachine')}><span className="sb-icon">🏭</span>Tambah Mesin</div>
    </aside>
  );
}
