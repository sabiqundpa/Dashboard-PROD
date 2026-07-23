import { CLUSTER_COLORS } from './ClusterBarList.jsx';

// Ranked vertical bar chart — tiap batang mewakili satu Line Produksi,
// diwarnai sesuai Cluster-nya (4 warna), dengan legend cluster di bawah.
export default function VerticalBarList({ data, showLegend = true }) {
  if (!data.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12 }}>Belum ada data.</div>;
  }
  const max = Math.max(...data.map((d) => d.ar), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180, padding: '0 4px' }}>
        {data.map((d, i) => {
          const color = CLUSTER_COLORS[d.cluster] || 'var(--accent)';
          const hPct = (d.ar / max) * 100;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{d.ar}%</div>
              <div style={{ width: '100%', maxWidth: 34, height: `${hPct}%`, minHeight: 2, background: color, borderRadius: '5px 5px 0 0', transition: 'height .6s ease' }}></div>
              <div
                style={{ width: '100%', fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={d.line}
              >{d.line}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color, marginTop: 2 }}>{d.cluster}</span>
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
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
