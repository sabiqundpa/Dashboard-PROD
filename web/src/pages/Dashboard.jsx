import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch } from '../api.js';
import GaugeCard from '../components/GaugeCard.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';

const EMPTY_SUMMARY = { availability: 0, performance: 0, yield: 0, ar: 0, oee: 0, entries: 0 };

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Dashboard() {
  // Only setIsLoading from global — everything else is local to Dashboard
  const { setIsLoading } = useApp();
  const { presentMode, togglePresentMode } = useUI();
  const { logout } = useAuth();

  const [period, setPeriod]               = useState('month');
  const [refDate, setRefDate]             = useState(todayStr());
  const [dashLastUpdate, setDashLastUpdate] = useState('—');
  const reqIdRef = useRef(0);

  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const loadDashboard = useCallback(() => {
    const myId = ++reqIdRef.current;
    setIsLoading(true);
    setDashLastUpdate('Updating…');
    const qs = period === 'all' ? 'period=all' : `period=${period}&date=${refDate}`;
    apiFetch(`/produksi-harian/summary?${qs}`, EMPTY_SUMMARY, logout).then((s) => {
      if (myId !== reqIdRef.current) return;
      setSummary(s);
      setDashLastUpdate('Updated ' + new Date().toLocaleTimeString());
      setIsLoading(false);
    }).catch(() => {
      if (myId !== reqIdRef.current) return;
      setDashLastUpdate('—');
      setIsLoading(false);
    });
  }, [period, refDate, logout, setIsLoading]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <div className="page-view active">

      {/* ── Page header ────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Monitoring</div>
          <div className="page-sub">Performa real-time · {dashLastUpdate}</div>
        </div>
      </div>

      <div className="group-box" style={{ marginBottom: 16 }}>
        <span className="group-box-title">Apply Filters</span>
        <div className="dash-filter-bar">
          <PeriodPicker
            pill
            period={period} setPeriod={setPeriod}
            refDate={refDate} setRefDate={setRefDate}
          />

          <button className="btn-icon" title="Refresh data" onClick={loadDashboard}>
            <RefreshCw size={14} />
          </button>
          <button
            className="btn-icon"
            onClick={togglePresentMode}
            title={presentMode ? 'Keluar mode layar penuh' : 'Mode layar penuh'}
          >
            {presentMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* ── KPI gauges ───────────────────────────────────── */}
      <div className="row5">
        <GaugeCard title="Availability" value={summary.availability} target={90}
          infoText="((Waktu Efektif × 0,9 × 60) − Breakdown Mesin) ÷ (Waktu Efektif × 60) × 100%. Target ≥ 90%." />
        <GaugeCard title="Performance" value={summary.performance} target={95}
          infoText="((Cycle Time × Total Hasil Produk × 1,05) ÷ 60) ÷ ((Waktu Efektif × 60) − Lost Time) × 100%. Target ≥ 95%." />
        <GaugeCard title="Yield" value={summary.yield} target={100}
          infoText="Total OK ÷ Total Proses × 100%. Target 100%." />
        <GaugeCard title="OEE" value={summary.oee} target={85}
          infoText="Availability × Performance × Yield. Target ≥ 85%." />
        <GaugeCard title="AR" value={summary.ar} target={100}
          infoText="Total Proses ÷ Plan Produksi × 100%. Target 100%." />
      </div>
    </div>
  );
}
