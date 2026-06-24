import { useState } from 'react';
import Modal from '../Modal.jsx';
import { useUI } from '../../UIContext.jsx';
import { useApp } from '../../AppContext.jsx';
import { useToast } from '../../ToastContext.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { apiSend } from '../../api.js';

export default function EditMachineModal({ payload }) {
  const { closeModal, showDetail } = useUI();
  const { loadAll } = useApp();
  const showToast = useToast();
  const { logout } = useAuth();

  const [name, setName] = useState(payload.name);
  const [assetNumber, setAssetNumber] = useState(payload.assetNumber || '');
  const [type, setType] = useState(payload.type || '');
  const [brand, setBrand] = useState(payload.brand || '');
  const [power, setPower] = useState(payload.power || '');
  const [cluster, setCluster] = useState(payload.cluster || '');
  const [line, setLine] = useState(payload.line || '');
  const [shift, setShift] = useState(payload.shift || '');
  const [plannedHours, setPlannedHours] = useState(String(payload.plannedHours ?? 16));
  const [errName, setErrName] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const n = name.trim();
    setErrName(n ? '' : 'Required');
    if (!n) return;
    setBusy(true);
    try {
      await apiSend(`/machines/${payload.name}`, 'PATCH', {
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
      showToast(`✅ Mesin ${n} diperbarui`, 'green');
      closeModal();
      loadAll();
      showDetail(n);
    } catch (e) {
      showToast(`❌ ${e.message}`, 'red');
    }
    setBusy(false);
  }

  return (
    <Modal title="Edit Mesin" onClose={closeModal}>
      <div className="form-grid">
        <div className="form-group full">
          <label className="form-label">Nama Mesin *</label>
          <input type="text" className={'form-input' + (errName ? ' error' : '')} value={name} onChange={(e) => setName(e.target.value)} />
          <div className="form-error">{errName}</div>
        </div>
        <div className="form-group">
          <label className="form-label">Nomor Asset</label>
          <input type="text" className="form-input" value={assetNumber} onChange={(e) => setAssetNumber(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <input type="text" className="form-input" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Merk Tahun</label>
          <input type="text" className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Daya</label>
          <input type="text" className="form-input" value={power} onChange={(e) => setPower(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Cluster</label>
          <input type="text" className="form-input" value={cluster} onChange={(e) => setCluster(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Line</label>
          <input type="text" className="form-input" value={line} onChange={(e) => setLine(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Shift</label>
          <input type="text" className="form-input" value={shift} onChange={(e) => setShift(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Jam Kerja Harian *</label>
          <input type="number" min="0" step="0.5" className="form-input" value={plannedHours} onChange={(e) => setPlannedHours(e.target.value)} />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn" onClick={closeModal}>Batal</button>
        <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Simpan Perubahan'}</button>
      </div>
    </Modal>
  );
}
