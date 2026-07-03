import { CheckCircle2 } from 'lucide-react';
import InfoTip from './InfoTip.jsx';

export default function AvailabilityCard({ kpi }) {
  const av      = kpi.availability ?? 0;
  const planned = kpi.planned_hours ?? 0;
  const downtime = kpi.downtime_hrs ?? 0;
  const uptime  = Math.max(0, planned - downtime);

  const isOk   = av >= 90;
  const isWarn = av >= 75 && av < 90;
  const colVar = isOk ? 'var(--green)' : isWarn ? 'var(--yellow)' : 'var(--red)';
  const colHex = isOk ? '#00d084'      : isWarn ? '#f0a500'        : '#ff4455';

  const r    = 66;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(av / 100, 1) * circ;

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="card-title">Availability</div>
          <InfoTip text="Persentase waktu mesin siap digunakan dalam periode ini: (Jam Kerja − Downtime) ÷ Jam Kerja × 100%. Target ≥ 90%." />
        </div>
      </div>

      {/* SVG circle gauge — nilai ditampilkan di stats row, bukan di tengah lingkaran */}
      <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
        <svg width={174} height={174} viewBox="0 0 174 174" style={{ overflow: 'visible' }}>
          {/* track */}
          <circle cx={87} cy={87} r={r} fill="none" stroke="var(--s3)" strokeWidth={13} />
          {/* arc */}
          <circle
            cx={87} cy={87} r={r}
            fill="none"
            stroke={colHex}
            strokeWidth={13}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            transform="rotate(-90 87 87)"
            style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)' }}
          />
          {/* percentage in center */}
          <text x={87} y={87} textAnchor="middle" dominantBaseline="middle"
            fill={colHex}
            style={{ fontSize: 30, fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>
            {av.toFixed(1)}%
          </text>
        </svg>
      </div>

      {/* target status */}
      <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        {isOk ? (
          <>
            <CheckCircle2 size={13} style={{ color: colVar, flexShrink: 0 }} />
            <span style={{ color: colVar }}>Target 90% — terlampaui</span>
          </>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Target 90% — belum tercapai</span>
        )}
      </div>

      {/* stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700 }}>{planned.toFixed(1)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Jam Kerja</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>{downtime.toFixed(1)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Downtime</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{uptime.toFixed(1)}</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>Uptime</div>
        </div>
      </div>
    </div>
  );
}
