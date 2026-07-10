import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, CalendarCheck, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';
import { fmtDate } from '../utils/fmt.js';
import KpiRow from '../components/KpiRow.jsx';
import AvailabilityCard from '../components/AvailabilityCard.jsx';
import MtbfMttrChart from '../components/MtbfMttrChart.jsx';
import DowntimeTrend from '../components/DowntimeTrend.jsx';
import MachineTable from '../components/MachineTable.jsx';
import Timeline from '../components/Timeline.jsx';
import ParetoList from '../components/ParetoList.jsx';
import DonutChart from '../components/DonutChart.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';

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
                <div style={{ fontSize: 9.5, color: 'var(--muted)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', flexShrink: 0 }}>
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
  const {
    kpi, machines, breakdowns, pareto, paretoMachines, downtime, mtbfMttrTrend,
    period, setPeriod, refDate, setRefDate, selectedMachine, setSelectedMachine,
    lastUpdate, loadAll,
  } = useApp();
  const { navigate, openModal, presentMode, togglePresentMode } = useUI();

  useEffect(() => { loadAll(); }, [period, refDate, selectedMachine]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMachineObj = machines.find((m) => m.name === selectedMachine);
  const year = refDate ? new Date(refDate).getFullYear() : new Date().getFullYear();

  return (
    <div className="page-view active">

      {/* ── Page header ────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">Monitoring</div>
          <div className="page-sub">Performa real-time · {lastUpdate}</div>
        </div>
        <div className="header-actions">
          {/* Machine filter */}
          <select
            className="btn"
            style={{ padding: '6px 10px' }}
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            title="Filter per mesin"
          >
            <option value="">Semua Mesin</option>
            {machines.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>

          <PeriodPicker
            period={period} setPeriod={setPeriod}
            refDate={refDate} setRefDate={setRefDate}
          />
          <button className="btn-icon" title="Refresh data" onClick={() => loadAll()}>
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
          <div className="row2-equal">
            <MtbfMttrChart data={mtbfMttrTrend} lineLabel={selectedMachineObj?.line} year={year} />
          </div>
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
            <div><div className="card-title">Log Breakdown Terbaru</div></div>
            <button className="card-action" onClick={() => navigate('maintenance')}>All ›</button>
          </div>
          <Timeline items={breakdowns} limit={5} />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Top Penyebab Kerusakan</div></div></div>
          <DonutChart data={pareto} labelKey="cause" />
          <ParetoList data={pareto} labelKey="cause" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Frekuensi Breakdown per Mesin</div></div></div>
          <ParetoList data={paretoMachines} labelKey="machine" />
        </div>
      </div>
    </div>
  );
}
