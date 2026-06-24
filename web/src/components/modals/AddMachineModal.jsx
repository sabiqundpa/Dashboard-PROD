import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

export default function AddMachineModal() {
  const { closeModal } = useUI();
  const { loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [name, setName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [power, setPower] = useState('');
  const [cluster, setCluster] = useState('');
  const [line, setLine] = useState('');
  const [shift, setShift] = useState('');
  const [plannedHours, setPlannedHours] = useState('16');
  const [errName, setErrName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = name.trim();
    setErrName(n ? '' : 'Required');
    if (!n) return;
    setBusy(true);
    try {
      await apiSend('/machines', 'POST', {
        name: n,
        assetNumber: assetNumber.trim(),
        type: type.trim(),
        brand: brand.trim(),
        power: power.trim(),
        cluster: cluster.trim(),
        line: line.trim(),
        shift: shift.trim(),
        plannedHours: Number(plannedHours) || 16,
      }, logout);
      showToast(`✅ Mesin ${n} ditambahkan`, 'green');
      closeModal();
      loadAll();
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Tambah Mesin" onClose={closeModal}>
      <div className="form-grid">
        <div className="form-group full">
          <label className="form-label">Nama Mesin *</label>
          <input type="text" className={'form-input' + (errName ? ' error' : '')} placeholder="contoh. CNC-07" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="form-error">{errName}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Nomor Asset</label>
          <input type="text" className="form-input" placeholder="contoh. AST-001" value={assetNumber} onChange={(e) => setAssetNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <input type="text" className="form-input" placeholder="contoh. Robot" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Merk Tahun</label>
          <input type="text" className="form-input" placeholder="contoh. Fanuc 2020" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Daya</label>
          <input type="text" className="form-input" placeholder="contoh. 5.5 kW" value={power} onChange={(e) => setPower(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Cluster</label>
          <input type="text" className="form-input" placeholder="contoh. Cluster A" value={cluster} onChange={(e) => setCluster(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Line</label>
          <input type="text" className="form-input" placeholder="contoh. Line 1" value={line} onChange={(e) => setLine(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Shift</label>
          <input type="text" className="form-input" placeholder="contoh. Shift 1" value={shift} onChange={(e) => setShift(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jam Kerja Harian *</label>
          <input type="number" min="0" step="0.5" className="form-input" placeholder="contoh. 16" value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Batal</button>
        <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Simpan Mesin'}</button>
      </div>
    </Modal>
  );
}
