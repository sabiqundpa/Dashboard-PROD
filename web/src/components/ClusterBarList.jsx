export const CLUSTER_COLORS = { AD: '#0e5a52', BC: '#4488ff', EF: '#f0a500', FI: '#a855f7' };

// Ranked horizontal bar list — tiap baris (Line Produksi) diwarnai sesuai
// Cluster-nya (4 warna), dengan legend cluster di bawah.
export default function ClusterBarList({ data, showLegend = true }) {
  if (!data.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12 }}>Belum ada data.</div>;
  }
  const max = Math.max(...data.map((d) => d.ar), 1);

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((d, i) => {
          const color = CLUSTER_COLORS[d.cluster] || 'var(--accent)';
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, textAlign: 'center', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{i + 1}</div>
              <div style={{ width: 100, fontSize: 12, color: 'var(--text)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.line}>{d.line}</div>
              <div style={{ flex: 1, background: 'var(--s2)', borderRadius: 4, height: 16, overflow: 'hidden' }}>
                <div style={{ width: `${(d.ar / max) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .6s ease' }}></div>
              </div>
              <div style={{ width: 46, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>{d.ar}%</div>
              <span style={{ width: 26, textAlign: 'center', fontSize: 10.5, fontWeight: 700, color, flexShrink: 0 }}>{d.cluster}</span>
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          {Object.entries(CLUSTER_COLORS).map(([cluster, color]) => (
            <div key={cluster} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></span>
              <span style={{ color: 'var(--muted)' }}>Cluster {cluster}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
