import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AlertCircle, CheckCircle2, CalendarCheck, RefreshCw, Maximize2, Minimize2, ChevronDown, RotateCcw } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch } from '../api.js';
import { fmtDate } from '../utils/fmt.js';
import KpiRow from '../components/KpiRow.jsx';
import AvailabilityCard from '../components/AvailabilityCard.jsx';
import MtbfMttrChart from '../components/MtbfMttrChart.jsx';
import DowntimeTrend from '../components/DowntimeTrend.jsx';
import MachineTable from '../components/MachineTable.jsx';
import ParetoList from '../components/ParetoList.jsx';
import DonutChart from '../components/DonutChart.jsx';
import ParetoMachineChart from '../components/ParetoMachineChart.jsx';
import RecentClosedWO from '../components/RecentClosedWO.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';

const EMPTY_KPI = { breakdowns: 0, downtime_hrs: 0, planned_hours: 0, planned_hours_per_day: 0, planned_hours_minutes: 0, availability: 0, mtbf: 0, mttr: 0 };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function BreakdownSidebarCard({ items, onMore }) {
  const recent = (items || []).slice(0, 4);

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">Breakdown Terbaru</div></div>
        <button className="card-action" onClick={onMore}>Semua ›</button>
      </div>

      {!recent.length ? (
        <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 0' }}>Tidak ada kasus</div>
      ) : recent.map((b) => {
        const isPM = b.category === 'Preventive';
        const isOpen = b.status === 'open';
        const statusLabel = isPM ? 'PM' : isOpen ? 'Proses' : 'Selesai';
        const statusClass = isPM ? 'pm' : isOpen ? 'proses' : 'selesai';
        const iconColor = isPM ? 'var(--purple)' : isOpen ? 'var(--red)' : 'var(--green)';
        const iconBg = isPM ? 'rgba(168,85,247,.12)' : isOpen ? 'rgba(255,68,85,.12)' : 'rgba(0,208,132,.12)';
        const IconComp = isPM ? CalendarCheck : isOpen ? AlertCircle : CheckCircle2;

        return (
          <div key={b.id} className="bd-item">
            <div className="bd-icon" style={{ background: iconBg }}>
              <IconComp size={15} style={{ color: iconColor }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginBottom: 3 }}>
                <div style={{ fontWeight: 600, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {b.machine} — {b.cause}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {fmtDate(b.date)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.pic_gh ? `PIC: ${b.pic_gh}` : ''}
                  {b.duration ? ` · ${b.duration}` : ''}
                </div>
                <span className={`bd-badge ${statusClass}`}>{statusLabel}</span>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={onMore}
        style={{
          width: '100%', textAlign: 'center', padding: '8px 0 2px',
          fontSize: 12, color: 'var(--accent)', background: 'none',
          border: 'none', cursor: 'pointer', marginTop: 4,
        }}
      >
        Lihat semua riwayat →
      </button>
    </div>
  );
}

export default function Dashboard() {
  // Only setIsLoading from global — everything else is local to Dashboard
  const { setIsLoading } = useApp();
  const { navigate, presentMode, togglePresentMode } = useUI();
  const { logout } = useAuth();

  // Dashboard-local filter state — isolated from Mesin / Breakdown pages
  const [period, setPeriod]               = useState('month');
  const [refDate, setRefDate]             = useState(todayStr());
  const [selectedMachine, setSelectedMachine] = useState('');
  const [selectedLine, setSelectedLine]       = useState('');
  const [mtbfLine, setMtbfLine]               = useState('');
  const [dashLastUpdate, setDashLastUpdate]   = useState('—');
  const reqIdRef    = useRef(0);
  const mtbfReqRef  = useRef(0);

  // Dashboard-local data state
  const [kpi, setKpi]                     = useState(EMPTY_KPI);
  const [machines, setMachines]           = useState([]);
  const [breakdowns, setBreakdowns]       = useState([]);
  const [pareto, setPareto]               = useState([]);
  const [paretoMachines, setParetoMachines] = useState([]);
  const [downtime, setDowntime]           = useState([]);
  const [mtbfMttrTrend, setMtbfMttrTrend] = useState([]);

  const loadDashboard = useCallback(() => {
    const myId = ++reqIdRef.current;
    setIsLoading(true);
    setDashLastUpdate('Updating…');
    const qs = period === 'all' ? 'period=all' : `period=${period}&date=${refDate}`;
    const filterQs = selectedMachine
      ? `${qs}&machine=${encodeURIComponent(selectedMachine)}`
      : selectedLine
      ? `${qs}&line=${encodeURIComponent(selectedLine)}`
      : qs;
    const machinesQs = selectedLine ? `${qs}&line=${encodeURIComponent(selectedLine)}` : qs;
    Promise.all([
      apiFetch(`/kpi?${filterQs}`, EMPTY_KPI, logout),
      apiFetch(`/machines?${machinesQs}`, [], logout),
      apiFetch(`/breakdowns?${filterQs}`, [], logout),
      apiFetch(`/pareto?${filterQs}`, [], logout),
      apiFetch(`/pareto-machines?${filterQs}`, [], logout),
      apiFetch(`/downtime-by-day?${filterQs}`, [], logout),
    ]).then(([k, m, b, pr, pm, dt]) => {
      if (myId !== reqIdRef.current) return;
      setKpi(k); setMachines(m); setBreakdowns(b); setPareto(pr); setParetoMachines(pm); setDowntime(dt);
      setDashLastUpdate('Updated ' + new Date().toLocaleTimeString());
      setIsLoading(false);
    }).catch(() => {
      if (myId !== reqIdRef.current) return;
      setDashLastUpdate('—');
      setIsLoading(false);
    });
  }, [period, refDate, selectedMachine, selectedLine, logout, setIsLoading]);

  const loadMtbfMttr = useCallback(() => {
    const myId = ++mtbfReqRef.current;
    const qs = period === 'all' ? 'period=all' : `period=${period}&date=${refDate}`;
    const mtbfQs = mtbfLine
      ? `${qs}&line=${encodeURIComponent(mtbfLine)}`
      : selectedMachine
      ? `${qs}&machine=${encodeURIComponent(selectedMachine)}`
      : selectedLine
      ? `${qs}&line=${encodeURIComponent(selectedLine)}`
      : qs;
    apiFetch(`/mtbf-mttr-trend?${mtbfQs}`, [], logout).then((data) => {
      if (myId !== mtbfReqRef.current) return;
      setMtbfMttrTrend(data);
    }).catch(() => {});
  }, [period, refDate, mtbfLine, selectedMachine, selectedLine, logout]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadMtbfMttr(); }, [loadMtbfMttr]);

  function resetFilters() {
    setPeriod('month');
    setRefDate(todayStr());
    setSelectedMachine('');
    setSelectedLine('');
    setMtbfLine('');
  }

  const lines = useMemo(
    () => [...new Set(machines.map((m) => m.line).filter(Boolean))].sort(),
    [machines],
  );

  const selectedMachineObj = machines.find((m) => m.name === selectedMachine);
  const year = refDate ? new Date(refDate).getFullYear() : new Date().getFullYear();
  const hasFilter = !!selectedMachine || !!selectedLine || !!mtbfLine || period !== 'month';

  return (
    <div className="page-view active">

      {/* ── Page header ────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Monitoring</div>
          <div className="page-sub">Performa real-time · {dashLastUpdate}</div>
        </div>

        {/* GrabCAD-style filter bar */}
        <div className="dash-filter-bar">
          {/* Machine filter pill */}
          <div className="gc-pill-wrap">
            <select
              className={`gc-pill-select${selectedMachine ? ' selected' : ''}`}
              value={selectedMachine}
              onChange={(e) => { setSelectedMachine(e.target.value); setSelectedLine(''); }}
            >
              <option value="">Semua Mesin</option>
              {machines.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
            <ChevronDown size={11} className="gc-caret" />
          </div>

          {/* Line filter pill — only visible when no specific machine is selected */}
          {!selectedMachine && lines.length > 0 && (
            <div className="gc-pill-wrap">
              <select
                className={`gc-pill-select${selectedLine ? ' selected' : ''}`}
                value={selectedLine}
                onChange={(e) => { setSelectedLine(e.target.value); setSelectedMachine(''); }}
              >
                <option value="">Semua Line</option>
                {lines.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <ChevronDown size={11} className="gc-caret" />
            </div>
          )}

          <PeriodPicker
            pill
            period={period} setPeriod={setPeriod}
            refDate={refDate} setRefDate={setRefDate}
          />

          {hasFilter && (
            <button className="gc-reset-btn" onClick={resetFilters} title="Reset semua filter">
              <RotateCcw size={11} /> Reset
            </button>
          )}

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

      {/* ── Main grid: content + sidebar ──────────────── */}
      <div className="dash-grid">

        {/* Left: main charts */}
        <div className="dash-main">
          <KpiRow kpi={kpi} downtime={downtime} mtbfMttrTrend={mtbfMttrTrend} period={period} refDate={refDate} />
          <DowntimeTrend days={downtime} year={year} />
          <MtbfMttrChart
            data={mtbfMttrTrend}
            lineLabel={mtbfLine || selectedMachineObj?.line}
            year={year}
            lines={lines}
            mtbfLine={mtbfLine}
            setMtbfLine={setMtbfLine}
          />
        </div>

        {/* Right: sidebar */}
        <div className="dash-sidebar">
          <AvailabilityCard kpi={kpi} />
          <BreakdownSidebarCard items={breakdowns} onMore={() => navigate('maintenance')} />
        </div>
      </div>

      {/* ── Full-width bottom section ──────────────────── */}
      <MachineTable machines={machines} limit={5} />

      <div className="row4">
        <div className="card">
          <div className="card-header">
            <div><div className="card-title">Breakdown Selesai Terbaru</div></div>
            <button className="card-action" onClick={() => navigate('maintenance')}>All ›</button>
          </div>
          <RecentClosedWO items={breakdowns} />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Top Penyebab Kerusakan</div></div></div>
          <DonutChart data={pareto} labelKey="cause" />
          <ParetoList data={pareto} labelKey="cause" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Pareto Breakdown per Mesin</div></div></div>
          <ParetoMachineChart machines={machines} />
        </div>
      </div>
    </div>
  );
}
