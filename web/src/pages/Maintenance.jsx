import { useState, useMemo, useEffect } from 'react';
import { Search, Circle, CheckCircle2, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Close' },
];

const center = { textAlign: 'center' };
const right = { textAlign: 'right' };

function fmtHrs(hrs) {
  if (!hrs && hrs !== 0) return '—';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export default function Maintenance() {
  const {
    breakdowns, kpi, machines,
    period, setPeriod, refDate, setRefDate,
    selectedMachine, setSelectedMachine,
    loadAll,
  } = useApp();
  const { openModal } = useUI();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(-1);

  useEffect(() => { loadAll(); }, [period, refDate, selectedMachine]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = breakdowns.filter((b) => b.status === 'open').length;
  const resolved = breakdowns.filter((b) => b.status === 'resolved').length;

  function sortBy(k) {
    setSortDir(sortKey === k ? -sortDir : 1);
    setSortKey(k);
  }

  const data = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = breakdowns.filter((b) => {
      const ms = !q || b.machine.toLowerCase().includes(q) || b.cause.toLowerCase().includes(q);
      const ss = filter === 'all' || b.status === filter;
      return ms && ss;
    });
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      return sortDir * String(av).localeCompare(String(bv));
    });
  }, [breakdowns, search, filter, sortKey, sortDir]);

  const arrow = (k) => (sortKey === k ? (sortDir === 1 ? <ChevronUp size={12} style={{ verticalAlign: 'middle' }} /> : <ChevronDown size={12} style={{ verticalAlign: 'middle' }} />) : null);
  const thCls = (k) => (sortKey === k ? 'sorted' : '');

  return (
    <div className="page-view active">
      <div className="page-header">
        <div><div className="page-title">Log Work Order Maintenance</div></div>
        <div className="header-actions">
          <select
            className="btn"
            style={{ padding: '6px 10px' }}
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            title="Filter per mesin"
          >
            <option value="">Semua Mesin</option>
            {machines.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
          </select>
          <PeriodPicker
            period={period} setPeriod={setPeriod}
            refDate={refDate} setRefDate={setRefDate}
          />
          <button className="btn-icon" title="Refresh data" onClick={() => loadAll()}>
            <RefreshCw size={14} />
          </button>
          <button className="btn primary" onClick={() => openModal('addBreakdown')}>+ RMO</button>
        </div>
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
            <span className="search-icon"><Search size={14} /></span>
            <input className="search-input" placeholder="Cari log…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-row">
            {FILTERS.map((f) => (
              <span key={f.key} className={'filter-chip' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)}>{f.label}</span>
            ))}
          </div>
        </div>
        <div className="table-scroll">
          <table className="machine-table" style={{ minWidth: 1400 }}>
            <thead>
              <tr>
                <th style={center}>NO</th>
                <th className={thCls('date')} onClick={() => sortBy('date')}>Tanggal Lapor{arrow('date')}</th>
                <th style={center}>Waktu Lapor</th>
                <th className={thCls('machine')} onClick={() => sortBy('machine')}>Nama Mesin{arrow('machine')}</th>
                <th className={thCls('cluster')} onClick={() => sortBy('cluster')}>Cluster{arrow('cluster')}</th>
                <th className={thCls('line')} onClick={() => sortBy('line')}>Line{arrow('line')}</th>
                <th>Problem Identifikasi</th>
                <th>Penyelesaian</th>
                <th style={center}>Tanggal Mulai</th>
                <th style={center}>Waktu Mulai</th>
                <th style={center}>Tanggal Selesai</th>
                <th style={center}>Waktu Selesai</th>
                <th style={right}>Waktu Pengerjaan</th>
                <th style={right}>Breakdown Time</th>
                <th style={center}>Status</th>
                <th style={center}>PIC MTN</th>
                <th style={center}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {!data.length ? (
                <tr><td colSpan={17} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Tidak Ada Kasus</td></tr>
              ) : data.map((b, i) => {
                const isOpen = b.status === 'open';
                return (
                  <tr key={b.id ?? i}>
                    <td style={center}>{i + 1}</td>
                    <td>{b.date || '—'}</td>
                    <td style={center}>{b.start || '—'}</td>
                    <td>{b.machine}</td>
                    <td style={{ color: 'var(--muted)' }}>{b.cluster || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{b.line || '—'}</td>
                    <td>{b.cause}</td>
                    <td>{b.resolution || '—'}</td>
                    <td style={center}>{b.date || '—'}</td>
                    <td style={center}>{b.start || '—'}</td>
                    <td style={center}>{b.end_date || '—'}</td>
                    <td style={center}>{b.end_time || '—'}</td>
                    <td style={right}>{fmtHrs(b.durationHrs)}</td>
                    <td style={right}>{b.durationHrs != null ? `${b.durationHrs.toFixed(1)} jam` : '—'}</td>
                    <td style={center}>
                      {isOpen
                        ? <span style={{ color: 'var(--red)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Circle size={9} fill="var(--red)" stroke="none" />OPEN</span>
                        : <span style={{ color: 'var(--green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={13} />CLOSE</span>}
                    </td>
                    <td style={center}>{b.pic_mtn || '—'}</td>
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
