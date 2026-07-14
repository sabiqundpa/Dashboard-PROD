import LineTrendChart from './LineTrendChart.jsx';

export default function MtbfMttrChart({ data, lineLabel, year }) {
  const scope = lineLabel ? ` — LINE ${lineLabel.toUpperCase()}` : '';
  return (
    <>
      <LineTrendChart
        title={`MTBF${scope}`}
        data={data} valueKey="mtbf" targetKey={null}
        color="#a855f7" unit="jam"
        showMovingAvg={true} movingAvgColor="#f0a500"
        legendItems={[
          { type: 'dot', color: '#a855f7', label: 'MTBF (jam)' },
          { type: 'line', color: '#f0a500', label: 'Average' },
        ]}
      />
      <LineTrendChart
        title={`MTTR${scope}`}
        data={data} valueKey="mttr" targetKey="mttrTarget"
        color="#f0b429" overTargetColor="#ff4455" unit="jam"
        legendItems={[
          { type: 'dot', color: '#f0b429', label: 'MTTR (jam)' },
          { type: 'dash', color: 'rgba(150,150,180,.7)', label: 'Target ≤1 jam' },
        ]}
      />
    </>
  );
}
