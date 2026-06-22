import { useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';
import KpiRow from '../components/KpiRow.jsx';
import AvailabilityCard from '../components/AvailabilityCard.jsx';
import MtbfMttrChart from '../components/MtbfMttrChart.jsx';
import DowntimeTrend from '../components/DowntimeTrend.jsx';
import MachineTable from '../components/MachineTable.jsx';
import Timeline from '../components/Timeline.jsx';
import ParetoList from '../components/ParetoList.jsx';

export default function Dashboard() {
  const { kpi, machines, breakdowns, pareto, paretoMachines, downtime, mtbfMttrTrend, period, setPeriod, refDate, setRefDate, lastUpdate, loadAll } = useApp();
  const { navigate, openModal } = useUI();

  useEffect(() => { loadAll(); }, [period, refDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Monitoring</div>
          <div className="page-sub">Real-time performance · {lastUpdate}</div>
        </div>
        <div className="header-actions">
          <select className="btn" style={{ padding: '7px 10px' }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Harian</option>
            <option value="week">Mingguan</option>
            <option value="month">Bulanan</option>
          </select>
          <input type="date" className="btn" style={{ padding: '7px 10px' }} min="2026-01-01" value={refDate} onChange={(e) => setRefDate(e.target.value)} title="Pilih tanggal acuan" />
          <button className="btn-icon" title="Refresh" onClick={() => loadAll()}>↻</button>
          <button className="btn primary" onClick={() => openModal('addBreakdown')}>+ RMO</button>
        </div>
      </div>

      <KpiRow kpi={kpi} />

      <div className="row2">
        <AvailabilityCard kpi={kpi} />
        <DowntimeTrend days={downtime} />
      </div>

      <div className="row2-equal">
        <MtbfMttrChart kpi={kpi} data={mtbfMttrTrend} />
      </div>

      <MachineTable machines={machines} limit={5} />

      <div className="row4">
        <div className="card">
          <div className="card-header"><div><div className="card-title">Breakdown Terbaru</div></div><button className="card-action" onClick={() => navigate('maintenance')}>All ›</button></div>
          <Timeline items={breakdowns} limit={5} />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Top Penyebab Kerusakan</div><div className="card-sub">Pareto</div></div></div>
          <ParetoList data={pareto} labelKey="cause" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Frekuensi Breakdown per Mesin</div><div className="card-sub">Top 10 · Pareto</div></div></div>
          <ParetoList data={paretoMachines} labelKey="machine" />
        </div>
      </div>
    </div>
  );
}
