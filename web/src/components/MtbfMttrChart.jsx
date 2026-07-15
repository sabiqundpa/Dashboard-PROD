import LineTrendChart from './LineTrendChart.jsx';

export default function MtbfMttrChart({ data, lineLabel, year, lines = [], mtbfLine = '', setMtbfLine }) {
  const scope = lineLabel ? ` — LINE ${lineLabel.toUpperCase()}` : '';
  return (
    <>
      {lines.length > 0 && setMtbfLine && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>Filter Line MTBF/MTTR:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            <button
              onClick={() => setMtbfLine('')}
              style={{
                fontSize: 10.5, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${!mtbfLine ? 'var(--accent)' : 'var(--border)'}`,
                background: !mtbfLine ? 'var(--accent)' : 'var(--s2)',
                color: !mtbfLine ? '#fff' : 'var(--muted)',
              }}
            >
              Semua
            </button>
            {lines.map((l) => (
              <button
                key={l}
                onClick={() => setMtbfLine(mtbfLine === l ? '' : l)}
                style={{
                  fontSize: 10.5, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                  border: `1px solid ${mtbfLine === l ? 'var(--accent)' : 'var(--border)'}`,
                  background: mtbfLine === l ? 'var(--accent)' : 'var(--s2)',
                  color: mtbfLine === l ? '#fff' : 'var(--text)',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      <LineTrendChart
        title={`MTBF${scope}`}
        data={data} valueKey="mtbf" targetKey="mtbfTarget"
        color="#a855f7" unit="jam"
        targetColor="#f0b429"
        legendItems={[
          { type: 'dot', color: '#a855f7', label: 'MTBF (jam)' },
          { type: 'line', color: '#f0b429', label: 'Target MTBF' },
        ]}
      />
      <LineTrendChart
        title={`MTTR${scope}`}
        data={data} valueKey="mttr" targetKey="mttrTarget"
        color="#f0b429" overTargetColor="#ff4455" unit="jam"
        targetColor="#f0b429"
        legendItems={[
          { type: 'dot', color: '#f0b429', label: 'MTTR (jam)' },
          { type: 'line', color: '#f0b429', label: 'Target ≤1 jam' },
        ]}
      />
    </>
  );
}
