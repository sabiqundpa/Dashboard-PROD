import { useState, useEffect, useMemo } from 'react';
import { X, Pencil, Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { apiSend, apiFetch } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { fmtDate } from '../utils/fmt.js';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function fmtHrs(hrs) {
  if (!hrs && hrs !== 0) return '—';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export default function DetailPanel() {
  const { detailMachine, detailList, closeDetail, showDetail, openModal } = useUI();
  const { machines, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [history, setHistory]       = useState([]);
  const [filterYear, setFilterYear]   = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const m = machines.find((x) => x.name === detailMachine);

  // Fetch full breakdown history whenever machine changes
  useEffect(() => {
    if (!detailMachine) { setHistory([]); return; }
    setFilterYear(''); setFilterMonth('');
    apiFetch(`/machine-history?machine=${encodeURIComponent(detailMachine)}`, [], logout)
      .then(setHistory)
      .catch(() => {});
  }, [detailMachine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Available years from history
  const years = useMemo(() =>
    [...new Set(history.map((b) => b.date?.slice(0, 4)).filter(Boolean))].sort().reverse()
  , [history]);

  // Filtered + limit
  const rBDs = useMemo(() => history.filter((b) => {
    if (filterYear  && b.date?.slice(0, 4) !== filterYear)  return false;
    if (filterMonth && b.date?.slice(5, 7) !== filterMonth) return false;
    return true;
  }), [history, filterYear, filterMonth]);

  // Navigation within the list
  const navList = detailList.length > 0 ? detailList : machines.map((x) => x.name);
  const navIdx  = navList.indexOf(detailMachine);
  const hasPrev = navIdx > 0;
  const hasNext = navIdx < navList.length - 1;
  function navPrev() { if (hasPrev) showDetail(navList[navIdx - 1], navList); }
  function navNext() { if (hasNext) showDetail(navList[navIdx + 1], navList); }

  async function toggleActive() {
    if (!m) return;
    const next = !m.active;
    try {
      await apiSend('/machines-active', 'POST', { machine: m.name, active: next }, logout);
      showToast(`${m.name} → ${next ? 'Aktif' : 'Nonaktif'}`, next ? 'green' : 'yellow');
    } catch {}
    loadAll();
  }

  if (!m) return <div className="detail-panel" id="detailPanel"></div>;

  const av    = m.availability ?? 0;
  const avCol = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div className={'detail-panel' + (detailMachine ? ' show' : '')} id="detailPanel">
      {/* ── Header ──────────────────────────── */}
      <div className="detail-header">
        <div className="detail-nav-arrows">
          <button className="detail-nav-btn" onClick={navPrev} disabled={!hasPrev} title="Mesin sebelumnya">
            <ChevronLeft size={16} />
          </button>
          <button className="detail-nav-btn" onClick={navNext} disabled={!hasNext} title="Mesin berikutnya">
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="detail-title">{m.name}</div>
          <div className="detail-subtitle">
            {[m.cluster, m.line].filter(Boolean).join(' · ') || '—'}
            {m.plannedHours ? ` · ${m.plannedHours} jam/hari` : ''}
          </div>
        </div>
        <button className="modal-close" onClick={closeDetail}><X size={18} /></button>
      </div>

      <div className="detail-body">
        {/* ── Edit button ─────────────────────── */}
        <button className="btn" style={{ width: '100%' }} onClick={() => openModal('editMachine', m)}>
          <Pencil size={12} /> Edit Info Mesin
        </button>

        {/* ── KPI Stats grid ──────────────────── */}
        <div className="detail-stats-grid">
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: avCol }}>{av.toFixed(1)}%</div>
            <div className="detail-stat-lbl">Availability</div>
            <div className="detail-stat-bar">
              <div style={{ width: `${av}%`, background: avCol, height: '100%', borderRadius: 2, transition: 'width 1s ease' }}></div>
            </div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val">{m.breakdowns ?? 0}</div>
            <div className="detail-stat-lbl">Breakdowns</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: 'var(--accent2)' }}>{m.downtime_hrs != null ? fmtHrs(m.downtime_hrs) : '—'}</div>
            <div className="detail-stat-lbl">Total Downtime</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val">{m.plannedHours ?? 16}</div>
            <div className="detail-stat-lbl">Jam/Hari</div>
          </div>
        </div>

        {/* ── Master Data ─────────────────────── */}
        <div className="detail-section">
          <div className="detail-section-title">Master Data Mesin</div>
          <div className="detail-master-grid">
            {[
              ['Nomor Asset', m.assetNumber],
              ['Type',        m.type],
              ['Merk',        m.brand],
              ['Tahun',       m.yearMachine],
              ['Daya',        m.power],
              ['Shift',       m.shift],
              ['Cluster',     m.cluster],
              ['Line',        m.line],
            ].map(([k, v]) => (
              <div key={k} className="detail-master-row">
                <span className="dm-key">{k}</span>
                <span className="dm-val">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Riwayat breakdown ───────────────── */}
        <div className="detail-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="detail-section-title" style={{ margin: 0 }}>History Riwayat</span>
              <span className="detail-history-count">{rBDs.length}</span>
            </div>
            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 4 }}>
              <select
                className="btn"
                style={{ padding: '2px 6px', fontSize: 10, height: 24 }}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">Semua Tahun</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                className="btn"
                style={{ padding: '2px 6px', fontSize: 10, height: 24 }}
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="">Semua Bulan</option>
                {MONTHS.map((mn, i) => (
                  <option key={i} value={String(i + 1).padStart(2, '0')}>{mn}</option>
                ))}
              </select>
            </div>
          </div>

          {rBDs.length === 0 ? (
            <div className="detail-empty">
              {history.length === 0 ? 'Tidak ada kasus terbaru' : 'Tidak ada kasus pada filter ini'}
            </div>
          ) : rBDs.map((b, i) => {
            const isOpen = b.status === 'open';
            return (
              <div key={b.id ?? i} className="detail-bd-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="detail-bd-cause">{b.cause}</div>
                  <div className="detail-bd-meta">
                    <Clock size={9} />
                    {fmtDate(b.date)}{b.start ? ' · ' + b.start : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span className={`detail-bd-status ${isOpen ? 'open' : 'closed'}`}>
                    {isOpen ? <AlertTriangle size={9} /> : <CheckCircle2 size={9} />}
                    {isOpen ? 'OPEN' : 'CLOSE'}
                  </span>
                  <span className="detail-bd-dur">{b.durationHrs != null ? fmtHrs(b.durationHrs) : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Aktif / Nonaktif toggle ──────────── */}
        <button
          className={`btn detail-active-toggle ${m.active ? 'is-aktif' : 'is-nonaktif'}`}
          onClick={toggleActive}>
          <span className="detail-active-dot"></span>
          {m.active ? 'Aktif' : 'Nonaktif'}
        </button>

        {/* ── Hapus Mesin ─────────────────────── */}
        <button
          className="btn"
          style={{ color: 'var(--red)', borderColor: 'rgba(255,68,85,.35)', fontSize: 12 }}
          onClick={async () => {
            if (!window.confirm(`Hapus mesin "${m.name}"?\n\nSemua data work order mesin ini juga akan ikut terhapus.\nData tidak bisa dikembalikan.`)) return;
            try {
              await apiSend('/machines', 'DELETE', { machine: m.name }, logout);
              showToast(`${m.name} dihapus`, 'yellow');
              closeDetail();
              loadAll();
            } catch (e) { showToast(e.message || 'Gagal menghapus', 'red'); }
          }}>
          <Trash2 size={12} /> Hapus Mesin
        </button>
      </div>
    </div>
  );
}
