import { useState, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'running', label: 'Running' },
  { key: 'down', label: 'Stop' },
  { key: 'idle', label: 'Idle' },
];

export default function Machines() {
  const { machines } = useApp();
  const { showDetail, openModal } = useUI();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const data = useMemo(() => {
    const q = search.toLowerCase();
    return machines.filter((m) =>
      (!q || m.name.toLowerCase().includes(q) || m.cluster.toLowerCase().includes(q) || m.line.toLowerCase().includes(q)) &&
      (filter === 'all' || m.status === filter)
    );
  }, [machines, search, filter]);

  return (
    <div className="page-view active">
      <div className="page-header">
        <div><div className="page-title">Semua Mesin</div><div className="page-sub">Tekan baris untuk melihat detail</div></div>
        <button className="btn primary" onClick={() => openModal('addBreakdown')}>+ RMO</button>
      </div>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 140 }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Cari Mesin…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-row">
            {FILTERS.map((f) => (
              <span key={f.key} className={'filter-chip' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>{f.label}</span>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="machine-table" style={{ minWidth: 400 }}>
            <thead><tr><th>Mesin</th><th>Cluster</th><th>Line</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'center' }}>Avail %</th><th style={{ textAlign: 'center' }}>Freq</th><th style={{ textAlign: 'right' }}>Waktu DT</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
            <tbody>
              {!data.length ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No machines match</td></tr>
              ) : data.map((m) => {
                const av = m.availability ?? 0;
                const bc = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
                return (
                  <tr key={m.name} onClick={() => showDetail(m.name)}>
                    <td><strong>{m.name}</strong></td>
                    <td style={{ color: 'var(--muted)' }}>{m.cluster || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.line || '—'}</td>
                    <td style={{ textAlign: 'center' }}><span className={'status-pill ' + m.status}><span className="status-dot"></span>{m.status}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{av.toFixed(1)}%</span>
                      <span className="pct-bar"><span className="pct-fill" style={{ width: `${av}%`, background: bc }}></span></span>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', textAlign: 'center' }}>{m.breakdowns}</td>
                    <td style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>{m.downtime_hrs?.toFixed(1)}</td>
                    <td style={{ textAlign: 'center' }}><button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); showDetail(m.name); }}>Details</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
