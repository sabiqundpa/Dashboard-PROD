import { X, Pencil, Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { apiSend } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

function fmtHrs(hrs) {
  if (!hrs && hrs !== 0) return '—';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

export default function DetailPanel() {
  const { detailMachine, detailList, closeDetail, showDetail, openModal } = useUI();
  const { machines, breakdowns, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const m = machines.find((x) => x.name === detailMachine);

  // Navigation within the list that triggered showDetail
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

  const av = m.availability ?? 0;
  const avCol = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
  const rBDs = breakdowns.filter((b) => b.machine === m.name).slice(0, 6);

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
            <div className="detail-master-row">
              <span className="dm-key">Nomor Asset</span>
              <span className="dm-val">{m.assetNumber || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Type</span>
              <span className="dm-val">{m.type || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Merk</span>
              <span className="dm-val">{m.brand || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Tahun</span>
              <span className="dm-val">{m.yearMachine || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Daya</span>
              <span className="dm-val">{m.power || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Shift</span>
              <span className="dm-val">{m.shift || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Cluster</span>
              <span className="dm-val">{m.cluster || '—'}</span>
            </div>
            <div className="detail-master-row">
              <span className="dm-key">Line</span>
              <span className="dm-val">{m.line || '—'}</span>
            </div>
          </div>
        </div>

        {/* ── Riwayat breakdown ───────────────── */}
        <div className="detail-section">
          <div className="detail-section-title">
            History Riwayat
            {rBDs.length > 0 && <span className="detail-history-count">{rBDs.length}</span>}
          </div>
          {rBDs.length === 0 ? (
            <div className="detail-empty">Tidak ada kasus terbaru</div>
          ) : rBDs.map((b, i) => {
            const isOpen = b.status === 'open';
            return (
              <div key={i} className="detail-bd-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="detail-bd-cause">{b.cause}</div>
                  <div className="detail-bd-meta">
                    <Clock size={9} />
                    {b.date}{b.start ? ' · ' + b.start : ''}
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
