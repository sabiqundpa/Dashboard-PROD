import { useState, useMemo } from 'react';
import { FolderUp, Factory, Search } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';

export default function Machines() {
  const { machines } = useApp();
  const { showDetail, openModal } = useUI();
  const [search, setSearch] = useState('');
  const [filterCluster, setFilterCluster] = useState('');
  const [filterLine, setFilterLine] = useState('');

  const clusters = useMemo(() => [...new Set(machines.map((m) => m.cluster).filter(Boolean))].sort(), [machines]);
  const lines = useMemo(() => {
    const src = filterCluster ? machines.filter((m) => m.cluster === filterCluster) : machines;
    return [...new Set(src.map((m) => m.line).filter(Boolean))].sort();
  }, [machines, filterCluster]);

  const data = useMemo(() => {
    const q = search.toLowerCase();
    return machines.filter((m) =>
      (!q || m.name.toLowerCase().includes(q) || (m.cluster || '').toLowerCase().includes(q) || (m.line || '').toLowerCase().includes(q)) &&
      (!filterCluster || m.cluster === filterCluster) &&
      (!filterLine || m.line === filterLine)
    );
  }, [machines, search, filterCluster, filterLine]);

  return (
    <div className="page-view active" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="page-header">
        <div><div className="page-title">Semua Mesin</div></div>
        <div className="header-actions">
          <button className="btn" onClick={() => openModal('import')}><FolderUp size={14} /> Import CSV</button>
          <button className="btn" onClick={() => openModal('addMachine')}><Factory size={14} /> Tambah Mesin</button>
        </div>
      </div>
      <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 140 }}>
            <span className="search-icon"><Search size={14} /></span>
            <input className="search-input" placeholder="Cari Mesin…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="btn" style={{ padding: '6px 10px' }} value={filterCluster}
            onChange={(e) => { setFilterCluster(e.target.value); setFilterLine(''); }}>
            <option value="">Semua Cluster</option>
            {clusters.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="btn" style={{ padding: '6px 10px' }} value={filterLine}
            onChange={(e) => setFilterLine(e.target.value)}>
            <option value="">Semua Line</option>
            {lines.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="table-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <table className="machine-table" style={{ minWidth: 1020 }}>
            <thead><tr><th>Mesin</th><th>Nomor Asset</th><th>Type</th><th>Merk</th><th>Tahun</th><th>Daya</th><th>Cluster</th><th>Line</th><th>Shift</th><th style={{ textAlign: 'center' }}>Aktif</th><th style={{ textAlign: 'center' }}>Avail %</th><th style={{ textAlign: 'center' }}>Freq</th><th style={{ textAlign: 'right' }}>Waktu DT</th></tr></thead>
            <tbody>
              {!data.length ? (
                <tr><td colSpan={13} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No machines match</td></tr>
              ) : data.map((m) => {
                const av = m.availability ?? 0;
                const bc = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
                const nameList = data.map((d) => d.name);
                return (
                  <tr key={m.name} onClick={() => showDetail(m.name, nameList)}>
                    <td><strong>{m.name}</strong></td>
                    <td style={{ color: 'var(--muted)' }}>{m.assetNumber || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.type || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.brand || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.yearMachine || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.power || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.cluster || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.line || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{m.shift || '—'}</td>
                    <td style={{ textAlign: 'center' }}><span className={`aktif-pill ${m.active ? 'aktif' : 'nonaktif'}`}><span className="aktif-dot"></span>{m.active ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{av.toFixed(1)}%</span>
                      <span className="pct-bar"><span className="pct-fill" style={{ width: `${av}%`, background: bc }}></span></span>
                    </td>
                    <td style={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.breakdowns}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.downtime_hrs?.toFixed(1)}</td>
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
