import { useState, useMemo, useEffect } from 'react';
import { Search, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
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

function fmtDateTime(date, time) {
  if (!date) return '—';
  return time ? `${date} · ${time}` : date;
}

export default function Maintenance() {
  const {
    breakdowns, kpi,
    period, setPeriod, refDate, setRefDate,
    rangeStart, setRangeStart, rangeEnd, setRangeEnd,
    loadAll,
  } = useApp();
  const { openModal, showWODetail } = useUI();

  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('');
  const [sortKey, setSortKey]         = useState('date');
  const [sortDir, setSortDir]         = useState(-1);

  useEffect(() => { loadAll(); }, [period, refDate, rangeStart, rangeEnd]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="card" style={{ overflow: 'visible' }}>
        {/* ── Unified filter bar ─────────────── */}
        <div className="wo-filter-bar">
          {/* Search */}
          <div className="search-wrap" style={{ flex: '1 1 180px', minWidth: 140 }}>
            <span className="search-icon"><Search size={14} /></span>
            <input className="search-input" placeholder="Cari mesin atau problem…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Machine filter */}
          <select className="btn wo-filter-select" value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}>
            <option value="">Semua Mesin</option>
            {machineOptions.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>

          {/* Status filter — dropdown instead of chips */}
          <select className="btn wo-filter-select" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="open">Open</option>
            <option value="resolved">Close</option>
          </select>

          {/* Period picker + refresh */}
          <PeriodPicker
            period={period} setPeriod={setPeriod}
            refDate={refDate} setRefDate={setRefDate}
            rangeStart={rangeStart} setRangeStart={setRangeStart}
            rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
          />
          <button className="btn-icon" title="Refresh data" onClick={() => loadAll()}>
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Result count */}
        <div className="wo-result-count">
          {data.length > 0 ? `Menampilkan ${data.length} hasil` : ''}
        </div>

        {/* Table */}
        <div className="table-scroll">
          <table className="wo-table">
            <thead>
              <tr>
                <th className={thCls('status')} onClick={() => sortBy('status')}>STATUS {arrow('status')}</th>
                <th className={thCls('machine')} onClick={() => sortBy('machine')}>MESIN {arrow('machine')}</th>
                <th className={thCls('date')} onClick={() => sortBy('date')}>TANGGAL LAPOR {arrow('date')}</th>
                <th className={thCls('repair_date')} onClick={() => sortBy('repair_date')}>TANGGAL MULAI {arrow('repair_date')}</th>
                <th className={thCls('cause')} onClick={() => sortBy('cause')}>PROBLEM {arrow('cause')}</th>
                <th className={thCls('resolution')} onClick={() => sortBy('resolution')}>PENYELESAIAN {arrow('resolution')}</th>
                <th className={thCls('durationHrs')} onClick={() => sortBy('durationHrs')} style={{ textAlign: 'right' }}>DOWNTIME {arrow('durationHrs')}</th>
                <th className={thCls('akumulasiRepair')} onClick={() => sortBy('akumulasiRepair')} style={{ textAlign: 'right' }}>AKUMULASI WAKTU REPAIR {arrow('akumulasiRepair')}</th>
                <th className={thCls('pic_mtn')} onClick={() => sortBy('pic_mtn')} style={{ textAlign: 'center' }}>PIC MTN {arrow('pic_mtn')}</th>
                <th className="wo-th" style={{ textAlign: 'center', cursor: 'default' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {!data.length ? (
                <tr>
                  <td colSpan={10} className="wo-empty">Tidak ada kasus yang cocok</td>
                </tr>
              ) : data.map((b, i) => {
                const isOpen = b.status === 'open';
                return (
                  <tr key={b.id ?? i} className="wo-row" onClick={() => showWODetail(b)}>
                    {/* STATUS */}
                    <td>
                      <span className={`wo-badge ${isOpen ? 'open' : 'closed'}`}>
                        <span className="wo-badge-dot"></span>
                        {isOpen ? 'OPEN' : 'CLOSE'}
                      </span>
                    </td>

                    {/* MESIN */}
                    <td>
                      <div className="wo-machine-name">{b.machine}</div>
                      {(b.cluster || b.line) && (
                        <div className="wo-machine-sub">
                          {[b.cluster, b.line].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>

                    {/* TANGGAL LAPOR */}
                    <td>
                      <div className="wo-date">{fmtDate(b.date)}</div>
                      {b.start && <div className="wo-time">{b.start}</div>}
                    </td>

                    {/* TANGGAL MULAI */}
                    <td>
                      {b.repair_date
                        ? <><div className="wo-date">{fmtDate(b.repair_date)}</div>{b.repair_time && <div className="wo-time">{b.repair_time}</div>}</>
                        : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                    </td>

                    {/* PROBLEM */}
                    <td className="wo-problem">{b.cause || '—'}</td>

                    {/* PENYELESAIAN */}
                    <td className="wo-resolution">{b.resolution || '—'}</td>

                    {/* DOWNTIME (waktu selesai - waktu lapor) */}
                    <td style={{ textAlign: 'right' }}>
                      {b.durationHrs != null ? (
                        <div>
                          <span className="wo-dur-main">{fmtHrs(b.durationHrs)}</span>
                          {b.end_date && (
                            <div className="wo-time" style={{ textAlign: 'right' }}>
                              s/d {fmtDate(b.end_date)}{b.end_time ? ' ' + b.end_time : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
                      )}
                    </td>

                    {/* AKUMULASI REPAIR (waktu selesai - waktu mulai perbaikan) */}
                    <td style={{ textAlign: 'right' }}>
                      {b.akumulasiRepair != null
                        ? <span className="wo-dur-main">{fmtHrs(b.akumulasiRepair)}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                    </td>

                    {/* PIC */}
                    <td style={{ textAlign: 'center' }}>
                      {b.pic_mtn
                        ? <span className="wo-pic-chip">{b.pic_mtn}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
                    </td>

                    {/* AKSI */}
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      {isOpen && b.id ? (
                        <button className="btn wo-action-btn"
                          onClick={() => openModal('closeWO', { id: b.id, machine: b.machine, cause: b.cause })}>
                          Tutup WO
                        </button>
                      ) : (
                        <span className="wo-done-mark">✓</span>
                      )}
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
