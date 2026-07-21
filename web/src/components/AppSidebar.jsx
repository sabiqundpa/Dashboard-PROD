import { useRef } from 'react';
import { BarChart3, FolderUp, Download, FileText, Factory, SlidersHorizontal, LogOut } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { useTargets } from '../TargetsContext.jsx';
import { apiDownload } from '../api.js';

export default function AppSidebar() {
  const { navigate, openModal } = useUI();
  const { logout } = useAuth();
  const showToast = useToast();
  const { openAdmin } = useTargets();
  const clickCount = useRef(0);
  const clickTimer = useRef(null);

  function onVersionClick() {
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 600);
    if (clickCount.current >= 3) { clickCount.current = 0; openAdmin(); }
  }

  async function doExport() {
    try {
      await apiDownload('/export-machines', `mesin-history-${new Date().toISOString().slice(0, 10)}.csv`, logout);
      showToast('Diekspor ke CSV', 'green');
    } catch (e) { showToast(e.message, 'red'); }
  }

  return (
    <aside className="app-sidebar">
      <div className="sb-section">Gambaran Umum</div>
      <div className="sb-item" onClick={() => navigate('analytics')}>
        <span className="sb-icon"><BarChart3 size={15} /></span>Analitik
      </div>

      <div className="sb-section">Data</div>
      <div className="sb-item" onClick={() => openModal('import')}>
        <span className="sb-icon"><FolderUp size={15} /></span>Import CSV
      </div>
      <div className="sb-item" onClick={doExport}>
        <span className="sb-icon"><Download size={15} /></span>Export Mesin (CSV)
      </div>
      <div className="sb-item" onClick={() => openModal('exportWorkOrders')}>
        <span className="sb-icon"><FileText size={15} /></span>Export Log Work Order
      </div>
      <div className="sb-item" onClick={() => openModal('addMachine')}>
        <span className="sb-icon"><Factory size={15} /></span>Tambah Mesin
      </div>

      <div className="sb-section">Akun</div>
      <div className="sb-item" onClick={() => navigate('settings')}>
        <span className="sb-icon"><SlidersHorizontal size={15} /></span>Pengaturan
      </div>
      <div className="sb-item" onClick={logout}>
        <span className="sb-icon"><LogOut size={15} /></span>Log Out
      </div>

      <div className="asb-version" onClick={onVersionClick}>v1.0</div>
    </aside>
  );
}
