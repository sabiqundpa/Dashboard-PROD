import { useToast } from '../ToastContext.jsx';

export default function ParetoList({ data, labelKey, valueKey = 'count', valueUnit = 'x' }) {
  const showToast = useToast();
  if (!data.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12 }}>Tidak ada data</div>;
  }
  const max = Math.max(...data.map((p) => p.pct));

  return (
    <>
      {data.map((p, i) => {
        const val = p[valueKey];
        const display = typeof val === 'number' ? val.toFixed(val % 1 === 0 ? 0 : 1) : val;
        return (
          <div className="pareto-row" key={i} onClick={() => showToast(`${p[labelKey]}: ${display}${valueUnit} (${p.pct}%)`, 'green')}>
            <div className="pareto-rank">{i + 1}</div>
            <div className="pareto-name">{p[labelKey]}</div>
            <div className="pareto-bar-wrap"><div className="pareto-bar-fill" style={{ width: `${(p.pct / max) * 100}%` }}></div></div>
            <div className="pareto-pct">{p.pct}%</div>
            <div className="pareto-count">{display}{valueUnit}</div>
          </div>
        );
      })}
    </>
  );
}
