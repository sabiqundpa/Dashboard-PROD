import LineTrendChart from './LineTrendChart.jsx';

export default function MtbfMttrChart({ data, lineLabel, year }) {
  const scope = lineLabel ? ` — LINE ${lineLabel.toUpperCase()}` : '';
  return (
    <>
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
