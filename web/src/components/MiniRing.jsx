// Cincin persentase mini satu-nilai — dipakai untuk 4 pie chart per Cluster
// (AD/BC/EF/FI) di samping pie chart utama pada halaman detail AR.
export default function MiniRing({ label, value, size = 50, color = '#0e5a52' }) {
  const v = value ?? 0;
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(v / 100, 1) * circ;
  const cx = size / 2, cy = size / 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--s3)" strokeWidth={5} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{v}%</div>
      </div>
    </div>
  );
}
