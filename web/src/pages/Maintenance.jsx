import { useState, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Close' },
];

const center = { textAlign: 'center' };
const right = { textAlign: 'right' };

export default function Maintenance() {
  const { breakdowns, kpi } = useApp();
  const { openModal } = useUI();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const open = breakdowns.filter((b) => b.status === 'open').length;
  const resolved = breakdowns.filter((b) => b.status === 'resolved').length;

  const data = useMemo(() => {
    const q = search.toLowerCase();
    return breakdowns.filter((b) => {
      const ms = !q || b.machine.toLowerCase().includes(q) || b.cause.toLowerCase().includes(q);
      const ss = filter === 'all' || b.status === filter;
      return ms && ss;
    });
  }, [breakdowns, search, filter]);

  return (
    <div className="page-view active">
      <div className="page-header">
        <div><div className="page-title">Log Work Order Maintenance</div></div>
        <button className="btn primary" onClick={() => openModal('addBreakdown')}>+ RMO</button>
      </div>
      <div className="maint-grid">
        <div className="maint-card">
          <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>OPEN</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--red)' }}>{open}</div>
        </div>
        <div className="maint-card">
          <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Rata-rata Repair</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--yellow)' }}>{kpi.mttr ?? '—'}</div>
          <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>Jam</div>
        </div>
        <div className="maint-card">
          <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>CLOSE</div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--green)' }}>{resolved}</div>
        </div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: 140 }}>
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Cari log…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-row">
            {FILTERS.map((f) => (
              <span key={f.key} className={'filter-chip' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>{f.label}</span>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="machine-table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>Mesin</th><th style={center}>Status</th><th style={center}>Tanggal</th>
                <th>Jenis Problem</th><th>Problem Identifikasi</th><th style={center}>PIC GH</th>
                <th style={center}>Tanggal Selesai</th><th>Penyelesaian / Action</th><th style={center}>PIC MTN</th>
                <th style={right}>Durasi</th><th style={center}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!data.length ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Tidak Ada Kasus</td></tr>
              ) : data.map((b, i) => {
                const isOpen = b.status === 'open';
                const penyelesaian = [b.resolution, b.action].filter(Boolean).join(' · ') || '—';
                return (
                  <tr key={b.id ?? i}>
                    <td>{b.machine}</td>
                    <td style={center}>{isOpen ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>● OPEN</span> : <span style={{ color: 'var(--green)', fontWeight: 600 }}>✔ CLOSE</span>}</td>
                    <td style={center}>{b.date} · {b.start || '—'}</td>
                    <td>{b.category || '—'}</td>
                    <td>{b.cause}</td>
                    <td style={center}>{b.pic_gh || '—'}</td>
                    <td style={center}>{b.end_date ? b.end_date + ' · ' + (b.end_time || '') : '—'}</td>
                    <td>{penyelesaian}</td>
                    <td style={center}>{b.pic_mtn || '—'}</td>
                    <td style={right}>{b.duration}</td>
                    <td style={center}>
                      {isOpen && b.id ? (
                        <button className="btn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => openModal('closeWO', { id: b.id, machine: b.machine, cause: b.cause })}>Tutup WO</button>
                      ) : '—'}
                    </td>
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
