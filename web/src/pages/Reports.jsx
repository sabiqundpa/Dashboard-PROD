import { useUI } from '../UIContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiDownload } from '../api.js';

const REPORT_NAMES = { availability: 'Rangkuman Availability', breakdown: 'Analisis Breakdown', pm: 'Jadwal Preventive Maintenance' };

export default function Reports() {
  const { openModal } = useUI();
  const showToast = useToast();
  const { logout } = useAuth();

  function genReport(t) {
    const n = REPORT_NAMES[t] || t;
    showToast(`📊 Mengadakan ${n}…`, 'green');
    setTimeout(() => showToast(`✅ ${n} siap — Sambung backend untuk PDF`, 'green'), 1400);
  }

  async function doExport() {
    try {
      await apiDownload('/exports/machines', `mesin-history-${new Date().toISOString().slice(0, 10)}.csv`, logout);
      showToast('✅ Diekspor ke CSV', 'green');
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
  }

  return (
    <div className="page-view active">
      <div className="page-header"><div><div className="page-title">Reports</div></div></div>
      <div className="report-grid">
        <div className="report-card" onClick={() => genReport('availability')}>
          <div className="report-icon">📊</div><div className="report-title">Rangkuman Availability</div>
          <div className="report-desc">Availability per Mesin, MTBF, MTTR</div>
        </div>
        <div className="report-card" onClick={() => genReport('breakdown')}>
          <div className="report-icon">⚡</div><div className="report-title">Analisis Breakdown</div>
          <div className="report-desc">MTBF, MTTR, Penyebab Kerusakan (Pareto)</div>
        </div>
        <div className="report-card" onClick={() => openModal('import')}>
          <div className="report-icon">📂</div><div className="report-title">Import CSV</div>
          <div className="report-desc">Muat data Breakdown/Work Order atau Master Data Mesin dari file CSV</div>
        </div>
        <div className="report-card" onClick={doExport}>
          <div className="report-icon">📥</div><div className="report-title">Export Mesin (CSV)</div>
          <div className="report-desc">Master data setiap mesin beserta seluruh riwayat breakdown-nya (semua mesin, bukan hanya insiden terakhir)</div>
        </div>
        <div className="report-card" onClick={() => openModal('exportWorkOrders')}>
          <div className="report-icon">📑</div><div className="report-title">Export Log Work Order (CSV)</div>
          <div className="report-desc">Unduh seluruh riwayat RMO untuk Excel — sama dengan view "work_order_export" di pgAdmin</div>
        </div>
        <div className="report-card" onClick={() => genReport('pm')}>
          <div className="report-icon">🔧</div><div className="report-title">Jadwal Preventive Maintenance</div>
          <div className="report-desc">Rencana Pekerjaan Preventive Maintenance</div>
        </div>
      </div>
    </div>
  );
}
