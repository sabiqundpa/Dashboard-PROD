// Pie chart mini satu-nilai (full-fill, bukan ring/donut) — dipakai untuk
// pie chart per Cluster (AD/BC/EF/FI) di samping pie chart utama pada
// halaman detail AR.
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Wedge dari pusat sampai tepi (bukan busur/arc tipis) supaya pie-nya
// terisi penuh dengan warna, bukan cincin.
function wedgePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

export default function MiniRing({ label, value, size = 50, color = '#0e5a52' }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const r = size / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const angle = (v / 100) * 360;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="var(--s3)" />
        {v > 0 && (
          v >= 100
            ? <circle cx={cx} cy={cy} r={r} fill={color} />
            : <path d={wedgePath(cx, cy, r, 0, angle)} fill={color} />
        )}
      </svg>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{v}%</div>
      </div>
    </div>
  );
}
