import { Zap, Timer, Activity, RefreshCw, Wrench } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';

function trendDir(v, target, lowerBetter = false) {
  if (v == null) return 'neutral';
  if (lowerBetter) return v <= target ? 'up' : 'down';
  return v >= target ? 'up' : 'down';
}

function KpiCard({ icon: Icon, label, value, unit, color, trendLabel, trendDir: dir, onClick }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }} onClick={onClick}>
      {/* top accent stripe */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="kpi-icon-bg" style={{ background: color + '1f' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <div className="kpi-label" style={{ margin: 0 }}>{label}</div>
      </div>
      <div>
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
      <div className={`kpi-trend ${dir}`} style={{ marginTop: 6 }}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : ''} {trendLabel}
      </div>
    </div>
  );
}

export default function KpiRow({ kpi }) {
  const { navigate } = useUI();
  const breakdowns = useAnimatedNumber(kpi.breakdowns, 0);
  const downtime = useAnimatedNumber(kpi.downtime_hrs, 1);
  const availability = useAnimatedNumber(kpi.availability, 1);
  const mtbf = useAnimatedNumber(kpi.mtbf, 1);
  const mttr = useAnimatedNumber(kpi.mttr, 1);

  return (
    <div className="kpi-row">
      <KpiCard
        icon={Zap} label="Breakdown" color="var(--red)"
        value={breakdowns} unit="kasus"
        trendDir="neutral" trendLabel={`${kpi.breakdowns} kasus periode ini`}
        onClick={() => navigate('maintenance')}
      />
      <KpiCard
        icon={Timer} label="Downtime" color="var(--accent2)"
        value={downtime} unit="jam"
        trendDir={trendDir(kpi.downtime_hrs, 8, true)}
        trendLabel={`${(kpi.downtime_hrs ?? 0).toFixed(1)} jam periode ini`}
      />
      <KpiCard
        icon={Activity} label="Availability" color="var(--green)"
        value={availability} unit="%"
        trendDir={trendDir(kpi.availability, 90)}
        trendLabel={`${(kpi.availability ?? 0).toFixed(1)}% · target 90%`}
      />
      <KpiCard
        icon={RefreshCw} label="MTBF" color="var(--purple)"
        value={mtbf} unit="jam"
        trendDir="neutral" trendLabel="jam antar breakdown"
      />
      <KpiCard
        icon={Wrench} label="MTTR" color="var(--yellow)"
        value={mttr} unit="jam"
        trendDir={trendDir(kpi.mttr, 4, true)}
        trendLabel={`${(kpi.mttr ?? 0).toFixed(1)} jam · target ≤4`}
      />
    </div>
  );
}
