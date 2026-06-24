import { useUI } from '../UIContext.jsx';
import { useApp } from '../AppContext.jsx';
import { useToast } from '../ToastContext.jsx';
import { apiSend } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function DetailPanel() {
  const { detailMachine, closeDetail, openModal } = useUI();
  const { machines, breakdowns, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const m = machines.find((x) => x.name === detailMachine);

  async function setStatus(status) {
    if (!m) return;
    try {
      await apiSend(`/machines/${m.name}/status`, 'PATCH', { status }, logout);
    } catch { /* best effort, same as original */ }
    showToast(`${m.name} → ${status}`, status === 'down' ? 'red' : 'green');
    loadAll();
  }

  if (!m) {
    return <div className="detail-panel" id="detailPanel"></div>;
  }

  const av = m.availability ?? 0;
  const col = av >= 90 ? 'var(--green)' : av >= 75 ? 'var(--yellow)' : 'var(--red)';
  const statusCol = m.status === 'running' ? 'var(--green)' : m.status === 'down' ? 'var(--red)' : 'var(--yellow)';
  const rBDs = breakdowns.filter((b) => b.machine === m.name);

  return (
    <div className={'detail-panel' + (detailMachine ? ' show' : '')}>
      <div className="detail-header">
        <div>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700 }}>{m.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{[m.cluster, m.line].filter(Boolean).join(' · ') || '—'} · {m.plannedHours ?? 16} jam/hari</div>
        </div>
        <button className="modal-close" onClick={closeDetail}>×</button>
      </div>
      <div className="detail-body">
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => openModal('editMachine', m)}>✎ Edit Info Mesin</button>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="detail-stat"><div className="detail-stat-val" style={{ color: col }}>{av.toFixed(1)}%</div><div className="detail-stat-lbl">Availability</div></div>
          <div className="detail-stat"><div className="detail-stat-val">{m.breakdowns}</div><div className="detail-stat-lbl">Breakdowns</div></div>
          <div className="detail-stat"><div className="detail-stat-val" style={{ color: statusCol }}>{m.status}</div><div className="detail-stat-lbl">Status</div></div>
          <div className="detail-stat"><div className="detail-stat-val">{m.downtime_hrs?.toFixed(1)}h</div><div className="detail-stat-lbl">Downtime</div></div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, color: 'var(--muted)' }}>Master Data Mesin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
            <div><span style={{ color: 'var(--muted)' }}>Nomor Asset: </span>{m.assetNumber || '—'}</div>
            <div><span style={{ color: 'var(--muted)' }}>Type: </span>{m.type || '—'}</div>
            <div><span style={{ color: 'var(--muted)' }}>Merk Tahun: </span>{m.brand || '—'}</div>
            <div><span style={{ color: 'var(--muted)' }}>Daya: </span>{m.power || '—'}</div>
            <div><span style={{ color: 'var(--muted)' }}>Shift: </span>{m.shift || '—'}</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, color: 'var(--muted)' }}>History Riwayat Mesin</div>
          {rBDs.length ? rBDs.slice(0, 4).map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{b.cause}</div>
                <div style={{ fontSize: 10.5, color: 'var(--accent)', fontFamily: 'var(--mono)', marginTop: 2, fontWeight: 600 }}>
                  {b.date}{b.start ? ' · ' + b.start : ''}
                </div>
              </div>
              <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', marginLeft: 8 }}>{b.duration}</span>
            </div>
          )) : <div style={{ color: 'var(--muted)', fontSize: 12 }}>Tidak Ada Kasus Terbaru</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" style={{ flex: 1, padding: 10 }} onClick={() => setStatus('running')}>▶ Running</button>
          <button className="btn danger" style={{ flex: 1, padding: 10 }} onClick={() => setStatus('down')}>■ Down</button>
          <button className="btn" style={{ flex: 1, padding: 10 }} onClick={() => setStatus('maintenance')}>🔧 PM</button>
        </div>
      </div>
    </div>
  );
}
