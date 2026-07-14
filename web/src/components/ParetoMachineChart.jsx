import { useMemo } from 'react';

export default function ParetoMachineChart({ machines }) {
  const top = useMemo(() => {
    const sorted = [...machines]
      .filter(m => (m.breakdowns || 0) > 0)
      .sort((a, b) => b.breakdowns - a.breakdowns)
      .slice(0, 10);
    if (!sorted.length) return [];
    const total = sorted.reduce((s, m) => s + m.breakdowns, 0);
    let cumul = 0;
    return sorted.map(m => {
      cumul += m.breakdowns;
      return { name: m.name, bd: m.breakdowns, cumPct: Math.round((cumul / total) * 100) };
    });
  }, [machines]);

  if (!top.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 0' }}>Tidak ada data breakdown</div>;
  }

  const W = 240, H = 170;
  const ml = 22, mr = 6, mt = 12, mb = 54;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = top.length;
  const bGap = 3;
  const bW = (cW - bGap * (n - 1)) / n;
  const maxBD = top[0].bd;

  function barFill(i) {
    if (i === 0) return 'var(--accent)';
    if (i <= 2) return 'var(--yellow)';
    return 'var(--dim)';
  }

  const linePoints = top
    .map((d, i) => `${ml + i * (bW + bGap) + bW / 2},${mt + cH * (1 - d.cumPct / 100)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Grid lines + left Y labels */}
      {[0, 25, 50, 75, 100].map(p => {
        const y = mt + cH * (1 - p / 100);
        return (
          <g key={p}>
            <line x1={ml} y1={y} x2={ml + cW} y2={y} style={{ stroke: 'var(--border)' }} strokeWidth={0.5} />
            <text x={ml - 2} y={y + 3} textAnchor="end" style={{ fontSize: '5.5px', fill: 'var(--muted)', fontFamily: 'Inter,sans-serif' }}>
              {Math.round(maxBD * p / 100)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {top.map((d, i) => {
        const x = ml + i * (bW + bGap);
        const bh = Math.max(1, (d.bd / maxBD) * cH);
        const y = mt + cH - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bh} rx={1.5}
              style={{ fill: barFill(i), fillOpacity: 1 - i * 0.05 }} />
            {bh > 14
              ? <text x={x + bW / 2} y={y + 10} textAnchor="middle" style={{ fontSize: '6.5px', fill: 'var(--bg)', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>{d.bd}</text>
              : <text x={x + bW / 2} y={y - 2} textAnchor="middle" style={{ fontSize: '5.5px', fill: 'var(--text)', fontFamily: 'Inter,sans-serif' }}>{d.bd}</text>
            }
          </g>
        );
      })}

      {/* Cumulative % line */}
      <polyline points={linePoints} fill="none" style={{ stroke: 'var(--red)' }} strokeWidth={1.5} />

      {/* Cumulative % dots + labels */}
      {top.map((d, i) => {
        const cx = ml + i * (bW + bGap) + bW / 2;
        const cy = mt + cH * (1 - d.cumPct / 100);
        const showLabel = i === 0 || i === top.length - 1;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={2} style={{ fill: 'var(--red)' }} />
            {showLabel && (
              <text x={i === 0 ? cx + 2 : cx} y={cy - 3} textAnchor={i === 0 ? 'start' : 'middle'}
                style={{ fontSize: '5px', fill: 'var(--red)', fontFamily: 'Inter,sans-serif' }}>
                {d.cumPct}%
              </text>
            )}
          </g>
        );
      })}

      {/* Rotated machine name labels */}
      {top.map((d, i) => {
        const x = ml + i * (bW + bGap) + bW / 2;
        const label = d.name.length > 10 ? d.name.slice(0, 9) + '…' : d.name;
        return (
          <text key={i} x={x} y={mt + cH + 5} textAnchor="end"
            style={{ fontSize: '5px', fill: 'var(--muted)', fontFamily: 'Inter,sans-serif' }}
            transform={`rotate(-40 ${x} ${mt + cH + 5})`}>
            {label}
          </text>
        );
      })}
    </svg>
  );
}
