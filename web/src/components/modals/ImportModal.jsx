import { useRef, useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSendForm } from '../../api.js';

const MODES = {
  workorder: {
    label: 'Data Breakdown / Work Order',
    endpoint: '/import',
    columns: 'machine_name · machine_cluster · machine_line · breakdown_date · start_time · end_time · failure_cause · category · technician',
  },
  machines: {
    label: 'Master Data Mesin',
    endpoint: '/import/machines',
    columns: 'NO · Nomor Asset · Nama Mesin · Type · Merk tahun · Daya · Cluster · Line · Shift · Jam Waktu Kerja',
  },
};

export default function ImportModal() {
  const { closeModal } = useUI();
  const { addNotif, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const fileInputRef = useRef(null);
  const [mode, setMode] = useState('workorder');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
  }

  async function doImport() {
    if (!file) return;
    setBusy(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await apiSendForm(MODES[mode].endpoint, formData, logout);
      showToast(`✅ Imported ${result.imported}/${result.total} rows`, 'green');
      addNotif('📥 CSV data imported', 'green');
      closeModal();
      loadAll();
    } catch {
      showToast('⚠ Import failed — check backend connection', 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Import CSV" onClose={closeModal}>
      <div className="filter-row" style={{ marginBottom: 12 }}>
        {Object.entries(MODES).map(([key, cfg]) => (
          <span key={key} className={'filter-chip' + (mode === key ? ' active' : '')} onClick={() => { setMode(key); setFile(null); }}>{cfg.label}</span>
        ))}
      </div>
      <div
        className={'drop-zone' + (dragOver ? ' drag-over' : '')}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
      >
        <div style={{ fontSize: 28 }}>📂</div>
        <p>{file ? `✅ ${file.name}` : 'Tap to select file'}</p>
        <p style={{ fontSize: 11, marginTop: 4 }}>.csv</p>
        <input type="file" ref={fileInputRef} accept=".csv" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
      </div>
      <div style={{ marginTop: 12, background: 'var(--s2)', borderRadius: 8, padding: 11, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text)' }}>Required columns:</strong><br />
        <span style={{ fontFamily: 'var(--mono)' }}>{MODES[mode].columns}</span>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" disabled={!file || busy} onClick={doImport}>{busy ? 'Importing…' : 'Import'}</button>
      </div>
    </Modal>
  );
}
