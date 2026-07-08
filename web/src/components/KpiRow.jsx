import { Zap, Timer, RefreshCw, Wrench } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';
import InfoTip from './InfoTip.jsx';
import { useTargets } from '../TargetsContext.jsx';

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const KPI_INFO = {
  Breakdown: 'Jumlah kejadian kerusakan mesin yang dicatat sebagai Work Order dalam periode ini.',
  Downtime:  'Total waktu mesin berhenti beroperasi akibat gangguan atau kerusakan (dalam jam).',
  MTBF: 'Mean Time Between Failures — rata-rata selang waktu antar dua kerusakan (jam). Nilai lebih tinggi berarti mesin lebih andal.',
  MTTR: 'Mean Time To Repair — rata-rata waktu perbaikan per kerusakan (jam). Target ≤ 4 jam. Nilai lebih rendah lebih baik.',
};

function sparkPoints(data, W = 64, H = 26) {
  if (!data || data.length < 2) return '';
  const max = Math.max(...data, 0.001);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  return data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - 2 - ((v - min) / range) * (H - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function Sparkline({ data, color }) {
  const pts = sparkPoints(data);
  if (!pts) return null;
  return (
    <svg className="kpi-spark" width="64" height="26" viewBox="0 0 64 26" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value, unit, color, delta, sparkData, sparkColor, onClick }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div className="kpi-icon-bg" style={{ background: color + '1f' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <div className="kpi-label" style={{ margin: 0 }}>{label}</div>
          <InfoTip text={KPI_INFO[label]} />
        </div>
      </div>
      <div>
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit"> {unit}</span>}
      </div>
      {delta && (
        <span className={`kpi-delta ${delta.isGood ? 'good' : 'bad'}`}>
          {delta.label}
        </span>
      )}
      {sparkData && sparkData.length >= 2 && (
        <Sparkline data={sparkData} color={sparkColor || color} />
      )}
    </div>
  );
}

export default function KpiRow({ kpi, downtime, mtbfMttrTrend, period, refDate }) {
  const { navigate } = useUI();
  const { mttrTarget } = useTargets();
  const breakdownsNum = useAnimatedNumber(kpi.breakdowns, 0);
  const downtimeNum   = useAnimatedNumber(kpi.downtime_hrs, 1);
  const mtbf          = useAnimatedNumber(kpi.mtbf, 1);
  const mttr          = useAnimatedNumber(kpi.mttr, 1);

  const isMonth = period === 'month';
  const currentMonthIdx = refDate ? new Date(refDate).getMonth() : new Date().getMonth();
  const prevMonthIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
  const prevMonthName = MONTH_ABBR[prevMonthIdx];

  // Trend rows — exclude TOTAL row
  const trendRows = (mtbfMttrTrend || []).filter((d) => d.day !== 'TOTAL');

  // Derive monthly breakdown count: plannedHrs / (mtbf + mttr) when both known
  const breakdownCounts = trendRows.map((d) => {
    const denom = (d.mtbf || 0) + (d.mttr || 0);
    return denom > 0 ? Math.round((d.mtbfTarget || 0) / denom) : 0;
  });

  // Sparkline arrays up to current month
  const dtSparkData  = (downtime || []).slice(0, currentMonthIdx + 1).map((d) => d.hrs ?? 0);
  const mtbfSparkData = trendRows.slice(0, currentMonthIdx + 1).map((d) => d.mtbf ?? 0);
  const mttrSparkData = trendRows.slice(0, currentMonthIdx + 1).map((d) => d.mttr ?? 0);
  const bdSparkData  = breakdownCounts.slice(0, currentMonthIdx + 1);

  // Delta: Breakdown vs prev month
  const prevBDCount = breakdownCounts[prevMonthIdx] ?? 0;
  const bdDiff = (kpi.breakdowns ?? 0) - prevBDCount;
  const bdDelta = isMonth && prevBDCount > 0 ? {
    label: `${bdDiff <= 0 ? '▼' : '▲'} ${Math.abs(bdDiff)} vs ${prevMonthName}`,
    isGood: bdDiff <= 0,
  } : { label: `${kpi.breakdowns ?? 0} kasus periode ini`, isGood: true };

  // Delta: Downtime vs prev month
  const currDT = (downtime || [])[currentMonthIdx]?.hrs ?? 0;
  const prevDT = (downtime || [])[prevMonthIdx]?.hrs ?? 0;
  const dtPct = isMonth && prevDT > 0 ? ((currDT - prevDT) / prevDT) * 100 : null;
  const dtDelta = dtPct != null ? {
    label: `${dtPct <= 0 ? '▼' : '▲'} ${Math.abs(dtPct).toFixed(0)}% vs ${prevMonthName}`,
    isGood: dtPct <= 0,
  } : { label: `${(kpi.downtime_hrs ?? 0).toFixed(1)} jam periode ini`, isGood: true };

  // Delta: MTBF vs prev month
  const currMTBF = trendRows[currentMonthIdx]?.mtbf ?? 0;
  const prevMTBF = trendRows[prevMonthIdx]?.mtbf ?? 0;
  const mtbfPct = isMonth && prevMTBF > 0 ? ((currMTBF - prevMTBF) / prevMTBF) * 100 : null;
  const mtbfDelta = mtbfPct != null ? {
    label: `${mtbfPct >= 0 ? '▲' : '▼'} ${Math.abs(mtbfPct).toFixed(0)}% vs ${prevMonthName}`,
    isGood: mtbfPct >= 0,
  } : { label: 'jam antar breakdown', isGood: true };

  // Delta: MTTR vs prev month
  const currMTTR = trendRows[currentMonthIdx]?.mttr ?? 0;
  const prevMTTR = trendRows[prevMonthIdx]?.mttr ?? 0;
  const mttrAbs = isMonth && prevMTTR > 0 ? currMTTR - prevMTTR : null;
  const mttrDelta = mttrAbs != null ? {
    label: `${mttrAbs >= 0 ? '▲' : '▼'} ${Math.abs(mttrAbs).toFixed(1)} jam vs ${prevMonthName}`,
    isGood: mttrAbs <= 0,
  } : {
    label: `${(kpi.mttr ?? 0).toFixed(1)} jam · target ≤${mttrTarget}`,
    isGood: (kpi.mttr ?? 0) <= mttrTarget,
  };

  return (
    <div className="kpi-row">
      <KpiCard
        icon={Zap} label="Breakdown" color="var(--red)"
        value={breakdownsNum} unit="kasus"
        delta={bdDelta}
        sparkData={bdSparkData} sparkColor="var(--red)"
        onClick={() => navigate('maintenance')}
      />
      <KpiCard
        icon={Timer} label="Downtime" color="var(--accent2)"
        value={downtimeNum} unit="jam"
        delta={dtDelta}
        sparkData={dtSparkData} sparkColor="var(--accent2)"
      />
      <KpiCard
        icon={RefreshCw} label="MTBF" color="var(--purple)"
        value={mtbf} unit="jam"
        delta={mtbfDelta}
        sparkData={mtbfSparkData} sparkColor="var(--purple)"
      />
      <KpiCard
        icon={Wrench} label="MTTR" color="var(--yellow)"
        value={mttr} unit="jam"
        delta={mttrDelta}
        sparkData={mttrSparkData} sparkColor="var(--yellow)"
      />
    </div>
  );
}
