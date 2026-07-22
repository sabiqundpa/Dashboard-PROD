import { CheckCircle2 } from 'lucide-react';
import InfoTip from './InfoTip.jsx';

export default function GaugeCard({ title, value, target, infoText }) {
  const v = value ?? 0;
  const isOk   = v >= target;
  const isWarn = v >= target * 0.85 && !isOk;
  const colVar = isOk ? 'var(--green)' : isWarn ? 'var(--yellow)' : 'var(--red)';
  const colHex = isOk ? '#00d084'      : isWarn ? '#f0a500'        : '#ff4455';

  const r    = 66;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(v / 100, 1) * circ;

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="card-title">{title}</div>
          {infoText && <InfoTip text={infoText} />}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
        <svg width={174} height={174} viewBox="0 0 174 174" style={{ overflow: 'visible' }}>
          <circle cx={87} cy={87} r={r} fill="none" stroke="var(--s3)" strokeWidth={13} />
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
          <text x={87} y={87} textAnchor="middle" dominantBaseline="middle"
            fill={colHex}
            style={{ fontSize: 30, fontWeight: 700, fontFamily: 'Inter,sans-serif', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
            {v.toFixed(1)}%
          </text>
        </svg>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        {isOk ? (
          <>
            <CheckCircle2 size={13} style={{ color: colVar, flexShrink: 0 }} />
            <span style={{ color: colVar }}>Target {target}% — terlampaui</span>
          </>
        ) : (
          <span style={{ color: 'var(--muted)' }}>Target {target}% — belum tercapai</span>
        )}
      </div>
    </div>
  );
}
