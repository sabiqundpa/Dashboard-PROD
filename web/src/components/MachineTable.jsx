import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useUI } from '../UIContext.jsx';

export default function MachineTable({ machines, limit, search: controlledSearch, onSearchChange }) {
  const { showDetail, navigate } = useUI();
  const [internalSearch, setInternalSearch] = useState('');
  const controlled = onSearchChange !== undefined;
  const search = controlled ? controlledSearch : internalSearch;
  const setSearch = controlled ? onSearchChange : setInternalSearch;
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState(1);

  function sortBy(k) {
    setSortDir(sortKey === k ? -sortDir : 1);
    setSortKey(k);
  }
  const arrow = (k) => sortKey === k
    ? (sortDir === 1
        ? <ChevronUp size={10} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
        : <ChevronDown size={10} style={{ verticalAlign: 'middle', marginLeft: 2 }} />)
    : null;
  const thCls = (k) => sortKey === k ? 'sorted' : '';

  const data = useMemo(() => {
    const q = (search || '').toLowerCase();
    let d = machines.filter((m) => !q ||
      m.name.toLowerCase().includes(q) || m.cluster.toLowerCase().includes(q) ||
      m.line.toLowerCase().includes(q) ||
      (m.last_incident || '').toLowerCase().includes(q));
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
          {!controlled && (
            <div className="search-wrap" style={{ minWidth: 130 }}>
              <span className="search-icon"><Search size={14} /></span>
              <input className="search-input" placeholder="Cari Mesin…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
          <button className="card-action" onClick={() => navigate('machines')}>Semua ›</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="machine-table" style={{ minWidth: 400 }}>
          <thead>
            <tr>
              <th className={thCls('name')} onClick={() => sortBy('name')}>Mesin {arrow('name')}</th>
              <th className={thCls('cluster')} onClick={() => sortBy('cluster')}>Cluster {arrow('cluster')}</th>
              <th className={thCls('line')} onClick={() => sortBy('line')}>Line {arrow('line')}</th>
              <th className={thCls('active')} style={{ textAlign: 'center' }} onClick={() => sortBy('active')}>Aktif {arrow('active')}</th>
              <th className={thCls('availability')} onClick={() => sortBy('availability')} style={{ textAlign: 'center' }}>Avail % {arrow('availability')}</th>
              <th className={thCls('breakdowns')} onClick={() => sortBy('breakdowns')} style={{ textAlign: 'center' }}>BD {arrow('breakdowns')}</th>
              <th className={thCls('downtime_hrs')} onClick={() => sortBy('downtime_hrs')} style={{ textAlign: 'right' }}>DT Jam {arrow('downtime_hrs')}</th>
              <th className={thCls('last_incident')} onClick={() => sortBy('last_incident')}>Last Incident {arrow('last_incident')}</th>
            </tr>
          </thead>
          <tbody>
            {!data.length ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No results</td></tr>
            ) : data.map((m) => {
              const av = m.availability ?? 0;
              const bc = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
              const nameList = data.map((d) => d.name);
              return (
                <tr key={m.name} onClick={() => showDetail(m.name, nameList)}>
                  <td><strong style={{ fontSize: 12 }}>{m.name}</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{m.cluster || '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{m.line || '—'}</td>
                  <td style={{ textAlign: 'center' }}><span className={`aktif-pill ${m.active ? 'aktif' : 'nonaktif'}`}><span className="aktif-dot"></span>{m.active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{av.toFixed(1)}%</span>
                    <span className="pct-bar"><span className="pct-fill" style={{ width: `${av}%`, background: bc }}></span></span>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'center', color: m.breakdowns > 3 ? 'var(--red)' : 'var(--text)' }}>{m.breakdowns}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{m.downtime_hrs?.toFixed(1)}</td>
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
