import { useRef, useState } from 'react';
import { FolderOpen, CheckCircle2 } from 'lucide-react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSendForm } from '../../api.js';

const MODES = {
  workorder: {
    label: 'Data Downtime Mesin',
    endpoint: '/import',
    columns: 'NO · Tanggal Lapor · Waktu Lapor · Nama Mesin · Problem · Penyelesaian · Tanggal Mulai · Waktu Mulai · Tanggal Selesai · Waktu Selesai · Waktu Pengerjaan · Downtime · Status · PIC MTN',
    notes: 'Delimiter , atau ; atau Tab otomatis terdeteksi. Nama kolom tidak case-sensitive.',
  },
  machines: {
    label: 'Master Data Mesin',
    endpoint: '/import-machines',
    columns: 'NO · Nomor Asset · Nama Mesin · Type · Merk · Tahun Mesin · Daya · Cluster · Line · Shift · Jam Waktu Kerja',
    notes: 'Delimiter , atau ; atau Tab otomatis terdeteksi. Nama kolom tidak case-sensitive.',
  },
};

export default function ImportModal() {
  const { closeModal, modalPayload } = useUI();
  const { addNotif, loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(modalPayload?.mode || 'workorder');
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
      const matchInfo = result.newMachines != null
        ? ` · ${result.matchedMachines} mesin cocok, ${result.newMachines} mesin baru`
        : '';
      showToast(`Import berhasil: ${result.imported}/${result.total} baris${matchInfo}`, 'green');
      addNotif('CSV data imported', 'green');
      closeModal();
      loadAll();
    } catch (err) {
      showToast(err.message || 'Import gagal — periksa koneksi backend', 'red');
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
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--muted)' }}><FolderOpen size={28} /></div>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {file ? <><CheckCircle2 size={14} color="var(--green)" />{file.name}</> : 'Tap to select file'}
        </p>
        <p style={{ fontSize: 11, marginTop: 4 }}>.csv</p>
        <input type="file" ref={fileInputRef} accept=".csv" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files[0])} />
      </div>
      <div style={{ marginTop: 12, background: 'var(--s2)', borderRadius: 8, padding: 11, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--text)' }}>Required columns:</strong><br />
        <span style={{ fontFamily: 'var(--mono)' }}>{MODES[mode].columns}</span>
        {MODES[mode].notes && (
          <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--green)', fontStyle: 'italic' }}>
            ✓ {MODES[mode].notes}
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn primary" disabled={!file || busy} onClick={doImport}>{busy ? 'Importing…' : 'Import'}</button>
      </div>
    </Modal>
  );
}
