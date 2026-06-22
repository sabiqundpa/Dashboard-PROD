import { useState, useMemo } from 'react';
import { useUI } from '../UIContext.jsx';

export default function MachineTable({ machines, limit }) {
  const { showDetail, navigate } = useUI();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState(1);

  function sortBy(k) {
    setSortDir(sortKey === k ? -sortDir : 1);
    setSortKey(k);
  }

  const data = useMemo(() => {
    const q = search.toLowerCase();
    let d = machines.filter((m) => !q || m.name.toLowerCase().includes(q) || m.cluster.toLowerCase().includes(q) || m.line.toLowerCase().includes(q));
    d.sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      return sortDir * (typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv)));
    });
    return limit ? d.slice(0, limit) : d;
  }, [machines, search, sortKey, sortDir, limit]);

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div><div className="card-title">Status Mesin</div><div className="card-sub">{limit && machines.length > limit ? `Menampilkan ${limit} dari ${machines.length} mesin` : `${machines.length} mesin termonitor`}</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ minWidth: 130 }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Cari Mesin…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="card-action" onClick={() => navigate('machines')}>Semua ›</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="machine-table" style={{ minWidth: 400 }}>
          <thead>
            <tr>
              <th onClick={() => sortBy('name')}>Mesin</th>
              <th onClick={() => sortBy('cluster')}>Cluster</th>
              <th onClick={() => sortBy('line')}>Line</th>
              <th>Status</th>
              <th onClick={() => sortBy('availability')}>Avail %</th>
              <th onClick={() => sortBy('breakdowns')}>BD</th>
              <th onClick={() => sortBy('downtime_hrs')}>DT Jam</th>
              <th>Last Incident</th>
            </tr>
          </thead>
          <tbody>
            {!data.length ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No results</td></tr>
            ) : data.map((m) => {
              const av = m.availability ?? 0;
              const bc = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
              return (
                <tr key={m.name} onClick={() => showDetail(m.name)}>
                  <td><strong style={{ fontSize: 12 }}>{m.name}</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{m.cluster || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{m.line || '—'}</td>
                  <td><span className={'status-pill ' + m.status}><span className="status-dot"></span>{m.status}</span></td>
                  <td>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{av.toFixed(1)}%</span>
                    <span className="pct-bar"><span className="pct-fill" style={{ width: `${av}%`, background: bc }}></span></span>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', color: m.breakdowns > 3 ? 'var(--red)' : 'var(--text)' }}>{m.breakdowns}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>{m.downtime_hrs?.toFixed(1)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.last_incident}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
