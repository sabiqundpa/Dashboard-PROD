import { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, ChevronUp, ChevronDown, FolderUp } from 'lucide-react';
import { useApp } from '../AppContext.jsx';
import { useUI } from '../UIContext.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';
import { fmtDate } from '../utils/fmt.js';

function fmtHrs(hrs) {
  if (hrs == null || hrs === '') return '—';
  const n = Number(hrs);
  if (isNaN(n)) return '—';
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export default function Maintenance() {
  const {
    breakdowns, kpi,
    period, setPeriod, refDate, setRefDate,
    loadAll,
  } = useApp();
  const { openModal, showWODetail, maintFilter, setMaintFilter } = useUI();

  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('');
  const [sortKey, setSortKey]           = useState('date');
  const [sortDir, setSortDir]           = useState(-1);

  useEffect(() => { loadAll(); }, [period, refDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply machine filter + switch to 'all' when navigating from machine detail panel
  useEffect(() => {
    if (!maintFilter) return;
    setMachineFilter(maintFilter);
    setPeriod('all');
    setMaintFilter('');
  }, [maintFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const machineOptions = useMemo(() =>
    [...new Set(breakdowns.map((b) => b.machine).filter(Boolean))].sort()
  , [breakdowns]);

  const open     = breakdowns.filter((b) => b.status === 'open').length;
  const resolved = breakdowns.filter((b) => b.status === 'resolved').length;

  function sortBy(k) {
    setSortDir(sortKey === k ? -sortDir : 1);
    setSortKey(k);
  }

  const data = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = breakdowns.filter((b) => {
      const ms = !q || b.machine.toLowerCase().includes(q) || b.cause.toLowerCase().includes(q);
      const ss = statusFilter === 'all' || b.status === statusFilter;
      const mc = !machineFilter || b.machine === machineFilter;
      return ms && ss && mc;
    });
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      return sortDir * String(av).localeCompare(String(bv));
    });
  }, [breakdowns, search, statusFilter, machineFilter, sortKey, sortDir]);

  const arrow = (k) => sortKey === k
    ? (sortDir === 1
        ? <ChevronUp size={11} style={{ verticalAlign: 'middle' }} />
        : <ChevronDown size={11} style={{ verticalAlign: 'middle' }} />)
    : null;
  const thCls = (k) => 'wo-th' + (sortKey === k ? ' sorted' : '');

  return (
    <div className="page-view active">
      {/* ── Header ───────────────────────────── */}
      <div className="page-header">
        <div><div className="page-title">Log Work Order Maintenance</div></div>
        <div className="header-actions">
          <button className="btn" onClick={() => openModal('import', { mode: 'workorder' })}>
            <FolderUp size={14} /> Import CSV RMO
          </button>
        </div>
      </div>

      {/* ── Summary cards ────────────────────── */}
      <div className="maint-grid">
        <div className="maint-card">
          <div className="maint-card-lbl">OPEN</div>
          <div className="maint-card-val" style={{ color: 'var(--red)' }}>{open}</div>
        </div>
        <div className="maint-card">
          <div className="maint-card-lbl">Rata-rata Repair</div>
          <div className="maint-card-val" style={{ color: 'var(--yellow)' }}>{kpi.mttr ?? '—'}</div>
          <div className="maint-card-unit">Jam</div>
        </div>
        <div className="maint-card">
          <div className="maint-card-lbl">CLOSE</div>
          <div className="maint-card-val" style={{ color: 'var(--green)' }}>{resolved}</div>
        </div>
      </div>

      {/* ── Table card ───────────────────────── */}
      <div className="card maint-table-card">
        {/* ── Filter bar ─────────────── */}
        <div className="wo-filter-bar">
          <div className="search-wrap" style={{ flex: '1 1 180px', minWidth: 140 }}>
            <span className="search-icon"><Search size={14} /></span>
            <input className="search-input" placeholder="Cari mesin atau problem…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="btn wo-filter-select" value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}>
            <option value="">Semua Mesin</option>
            {machineOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select className="btn wo-filter-select" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="resolved">Close</option>
          </select>
          <PeriodPicker
            period={period} setPeriod={setPeriod}
            refDate={refDate} setRefDate={setRefDate}
          />
          <button className="btn-icon" title="Refresh data" onClick={() => loadAll()}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="wo-result-count">
          {data.length > 0 ? `Menampilkan ${data.length} hasil` : ''}
        </div>

        {/* ── Table ─────────────────── */}
        <div className="table-scroll">
          <table className="wo-table">
            <thead>
              <tr>
                <th className={thCls('status')} onClick={() => sortBy('status')}>STATUS {arrow('status')}</th>
                <th className={thCls('machine')} onClick={() => sortBy('machine')}>MESIN {arrow('machine')}</th>
                <th className={thCls('date')} onClick={() => sortBy('date')}>TANGGAL LAPOR {arrow('date')}</th>
                <th className={thCls('cause')} onClick={() => sortBy('cause')}>IDENTIFIKASI PROBLEM {arrow('cause')}</th>
                <th className={thCls('resolution')} onClick={() => sortBy('resolution')}>PENYELESAIAN {arrow('resolution')}</th>
                <th className={thCls('repair_date')} onClick={() => sortBy('repair_date')}>TGL MULAI REPAIR {arrow('repair_date')}</th>
                <th className={thCls('end_date')} onClick={() => sortBy('end_date')}>TGL SELESAI {arrow('end_date')}</th>
                <th className={thCls('akumulasiRepair')} onClick={() => sortBy('akumulasiRepair')} style={{ textAlign: 'right' }}>WAKTU PENGERJAAN {arrow('akumulasiRepair')}</th>
                <th className={thCls('durationHrs')} onClick={() => sortBy('durationHrs')} style={{ textAlign: 'right' }}>DOWNTIME {arrow('durationHrs')}</th>
                <th className={thCls('pic_mtn')} onClick={() => sortBy('pic_mtn')} style={{ textAlign: 'center' }}>PIC MTN {arrow('pic_mtn')}</th>
              </tr>
            </thead>
            <tbody>
              {!data.length ? (
                <tr><td colSpan={10} className="wo-empty">Tidak ada kasus yang cocok</td></tr>
              ) : data.map((b, i) => (
                <tr key={b.id ?? i} className="wo-row" onClick={() => showWODetail(b)}>
                  {/* STATUS */}
                  <td>
                    <span className={`wo-badge ${b.status === 'open' ? 'open' : 'closed'}`}>
                      <span className="wo-badge-dot"></span>
                      {b.status === 'open' ? 'OPEN' : 'CLOSE'}
                    </span>
                  </td>

                  {/* MESIN */}
                  <td>
                    <div className="wo-machine-name">{b.machine}</div>
                    {(b.cluster || b.line) && (
                      <div className="wo-machine-sub">{[b.cluster, b.line].filter(Boolean).join(' · ')}</div>
                    )}
                  </td>

                  {/* TANGGAL LAPOR + WAKTU */}
                  <td>
                    <div className="wo-date">{fmtDate(b.date)}</div>
                    {b.start && <div className="wo-time">{b.start}</div>}
                  </td>

                  {/* IDENTIFIKASI PROBLEM */}
                  <td className="wo-problem">{b.cause || '—'}</td>

                  {/* PENYELESAIAN */}
                  <td className="wo-resolution">{b.resolution || '—'}</td>

                  {/* TGL MULAI + WAKTU (repair) */}
                  <td>
                    {b.repair_date
                      ? <><div className="wo-date">{fmtDate(b.repair_date)}</div>{b.repair_time && <div className="wo-time">{b.repair_time}</div>}</>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>

                  {/* TGL SELESAI + WAKTU */}
                  <td>
                    {b.end_date
                      ? <><div className="wo-date">{fmtDate(b.end_date)}</div>{b.end_time && <div className="wo-time">{b.end_time}</div>}</>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>

                  {/* WAKTU PENGERJAAN */}
                  <td style={{ textAlign: 'right' }}>
                    {b.akumulasiRepair != null
                      ? <span className="wo-dur-main">{fmtHrs(b.akumulasiRepair)}</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>

                  {/* DOWNTIME */}
                  <td style={{ textAlign: 'right' }}>
                    {b.durationHrs != null
                      ? <span className="wo-dur-main" style={{ color: b.durationHrs > 0 ? 'var(--red)' : undefined }}>{fmtHrs(b.durationHrs)}</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>

                  {/* PIC MTN */}
                  <td style={{ textAlign: 'center' }}>
                    {b.pic_mtn
                      ? <span className="wo-pic-chip">{b.pic_mtn}</span>
                      : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
