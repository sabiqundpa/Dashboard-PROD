import { useEffect, useMemo, useState } from 'react';
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
  const {
    kpi, machines, breakdowns, pareto, paretoMachines, downtime, mtbfMttrTrend,
    period, setPeriod, refDate, setRefDate, selectedMachine, setSelectedMachine,
    lastUpdate, loadAll,
  } = useApp();
  const { navigate, openModal } = useUI();
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, [period, refDate, selectedMachine]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.trim().toLowerCase();
  const filteredBreakdowns = useMemo(() => {
    if (!q) return breakdowns;
    return breakdowns.filter((b) => [b.machine, b.cause, b.category, b.pic_gh, b.pic_mtn, b.resolution, b.action]
      .some((v) => (v || '').toLowerCase().includes(q)));
  }, [breakdowns, q]);
  const filteredPareto = useMemo(() => (!q ? pareto : pareto.filter((p) => p.cause.toLowerCase().includes(q))), [pareto, q]);
  const filteredParetoMachines = useMemo(() => (!q ? paretoMachines : paretoMachines.filter((p) => p.machine.toLowerCase().includes(q))), [paretoMachines, q]);

  const selectedMachineObj = machines.find((m) => m.name === selectedMachine);
  const year = refDate ? new Date(refDate).getFullYear() : new Date().getFullYear();

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

      <div className="header-actions" style={{ flexWrap: 'wrap' }}>
        <select className="btn" style={{ padding: '7px 10px' }} value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)} title="Filter dashboard per mesin">
          <option value="">Semua Mesin</option>
          {machines.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
        </select>
        <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Cari mesin, problem, PIC, penyebab…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <KpiRow kpi={kpi} />

      <div className="row2">
        <AvailabilityCard kpi={kpi} />
        <DowntimeTrend days={downtime} />
      </div>

      <div className="row2-equal">
        <MtbfMttrChart data={mtbfMttrTrend} lineLabel={selectedMachineObj?.line} year={year} />
      </div>

      <MachineTable machines={machines} limit={5} search={search} onSearchChange={setSearch} />

      <div className="row4">
        <div className="card">
          <div className="card-header"><div><div className="card-title">Breakdown Terbaru</div></div><button className="card-action" onClick={() => navigate('maintenance')}>All ›</button></div>
          <Timeline items={filteredBreakdowns} limit={5} />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Top Penyebab Kerusakan</div><div className="card-sub">Pareto</div></div></div>
          <ParetoList data={filteredPareto} labelKey="cause" />
        </div>
        <div className="card">
          <div className="card-header"><div><div className="card-title">Frekuensi Breakdown per Mesin</div><div className="card-sub">Top 10 · Pareto</div></div></div>
          <ParetoList data={filteredParetoMachines} labelKey="machine" />
        </div>
      </div>
    </div>
  );
}
