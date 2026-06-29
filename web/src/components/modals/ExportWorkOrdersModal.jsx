import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiDownload } from '../../api.js';

const PERIODS = [
  { key: '', label: 'Semua Riwayat' },
  { key: 'today', label: 'Harian' },
  { key: 'week', label: 'Mingguan' },
  { key: 'month', label: 'Bulanan' },
];

export default function ExportWorkOrdersModal() {
  const { closeModal } = useUI();
  const showToast = useToast();
  const { logout } = useAuth();

  const [period, setPeriod] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function doExport() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (period) { params.set('period', period); params.set('date', date); }
      const qs = params.toString() ? `?${params.toString()}` : '';
      await apiDownload(`/exports/work-orders${qs}`, `work-orders-${date}.csv`, logout);
      closeModal();
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Export Log Work Order" onClose={closeModal}>
      <div className="form-grid">
        <div className="form-group full">
          <label className="form-label">Periode</label>
          <div className="filter-row">
            {PERIODS.map((p) => (
              <span key={p.key} className={'filter-chip' + (period === p.key ? ' active' : '')} onClick={() => setPeriod(p.key)}>{p.label}</span>
            ))}
          </div>
        </div>
        {period && (
          <div className="form-group full">
            <label className="form-label">Tanggal Acuan</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Batal</button>
        <button className="btn primary" disabled={busy} onClick={doExport}>{busy ? 'Exporting…' : 'Export CSV'}</button>
      </div>
    </Modal>
  );
}
