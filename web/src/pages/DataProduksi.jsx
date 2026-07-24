import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, X } from 'lucide-react';
import ProduksiTable from '../components/ProduksiTable.jsx';
import LineTrendChart from '../components/LineTrendChart.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';
import { CLUSTER_COLORS } from '../components/ClusterBarList.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend } from '../api.js';
import { useToast } from '../ToastContext.jsx';

const API = '/api';
const CLUSTERS = ['AD', 'BC', 'EF', 'FI'];

function todayStr() { return new Date().toISOString().slice(0, 10); }

const inp = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 7, padding: '8px 10px', fontSize: 13, width: '100%',
  boxSizing: 'border-box', color: 'var(--text)', fontFamily: 'inherit',
};

function EditField({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function EditProduksiModal({ row, onClose, onSaved }) {
  const { logout } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState({
    tanggal: row.tanggal, waktu: row.waktu || '', shift: row.shift, noLot: row.noLot || '',
    plan: row.plan, ok1: row.ok1, ok2: row.ok2, rework: row.rework, reject: row.reject,
    breakdownMesin: row.breakdownMesin, lostTime: row.lostTime, keterangan: row.keterangan || '',
  });
  const [busy, setBusy] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true);
    try {
      await apiSend('/produksi-harian-update', 'POST', {
        id: row.id,
        tanggal: form.tanggal, waktu: form.waktu, shift: form.shift, no_lot: form.noLot,
        plan: form.plan, ok1: form.ok1, ok2: form.ok2, rwk: form.rework, rjct: form.reject,
        breakdown_mesin: form.breakdownMesin, lost_time: form.lostTime, keterangan: form.keterangan,
      }, logout);
      showToast('Data berhasil diperbarui', 'green');
      onSaved();
      onClose();
    } catch (e) { showToast(e.message, 'red'); }
    setBusy(false);
  }

  return (
    <div className="overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520, borderRadius: 14, margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Edit — {row.partName}</div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <EditField label="Tanggal"><input type="date" style={inp} value={form.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></EditField>
          <EditField label="Waktu"><input type="time" style={inp} value={form.waktu} onChange={(e) => set('waktu', e.target.value)} /></EditField>
          <EditField label="Shift"><input style={inp} value={form.shift} onChange={(e) => set('shift', e.target.value)} /></EditField>
          <EditField label="No Lot"><input style={inp} value={form.noLot} onChange={(e) => set('noLot', e.target.value)} /></EditField>
          <EditField label="Plan"><input type="number" style={inp} value={form.plan} onChange={(e) => set('plan', e.target.value)} /></EditField>
          <EditField label="OK1"><input type="number" style={inp} value={form.ok1} onChange={(e) => set('ok1', e.target.value)} /></EditField>
          <EditField label="OK2"><input type="number" style={inp} value={form.ok2} onChange={(e) => set('ok2', e.target.value)} /></EditField>
          <EditField label="Rework"><input type="number" style={inp} value={form.rework} onChange={(e) => set('rework', e.target.value)} /></EditField>
          <EditField label="Reject"><input type="number" style={inp} value={form.reject} onChange={(e) => set('reject', e.target.value)} /></EditField>
          <EditField label="Breakdown Mesin (menit)"><input type="number" style={inp} value={form.breakdownMesin} onChange={(e) => set('breakdownMesin', e.target.value)} /></EditField>
          <EditField label="Lost Time (menit)"><input type="number" style={inp} value={form.lostTime} onChange={(e) => set('lostTime', e.target.value)} /></EditField>
          <div style={{ gridColumn: '1 / -1' }}>
            <EditField label="Keterangan"><textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.keterangan} onChange={(e) => set('keterangan', e.target.value)} /></EditField>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
          <button className="btn" onClick={onClose}>Batal</button>
        </div>
      </div>
    </div>
  );
}

export default function DataProduksi() {
  const { logout } = useAuth();
  const showToast = useToast();
  const [period, setPeriod]   = useState('month');
  const [refDate, setRefDate] = useState(todayStr());
  const [query, setQuery]     = useState('');
  const [rows, setRows]       = useState([]);
  const [trends, setTrends]   = useState({});
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = period === 'all' ? 'period=all' : `period=${period}&date=${refDate}`;
    fetch(`${API}/produksi-harian?${qs}`).then((r) => r.json()).then((data) => {
      setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));

    const trendQs = `period=${period === 'all' ? 'month' : period}&date=${refDate}`;
    Promise.all(CLUSTERS.map((c) => apiFetch(`/ar-trend?${trendQs}&cluster=${c}`, [], logout)))
      .then((results) => {
        const map = {};
        CLUSTERS.forEach((c, i) => { map[c] = results[i]; });
        setTrends(map);
      });
  }, [period, refDate, logout]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.partName.toLowerCase().includes(q) ||
      r.mesin.toLowerCase().includes(q) ||
      (r.noLot || '').toLowerCase().includes(q) ||
      (r.proses || '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const byCluster = useMemo(() => {
    const map = {};
    CLUSTERS.forEach((c) => { map[c] = filteredRows.filter((r) => r.cluster === c); });
    return map;
  }, [filteredRows]);

  async function handleDelete(row) {
    if (!window.confirm(`Hapus data ${row.partName} (${row.tanggal})?`)) return;
    try {
      await apiSend('/produksi-harian-delete', 'POST', { id: row.id }, logout);
      showToast('Data berhasil dihapus', 'green');
      load();
    } catch (e) { showToast(e.message, 'red'); }
  }

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Data Produksi</div>
        </div>
      </div>

      <div className="group-box" style={{ marginBottom: 16 }}>
        <span className="group-box-title">Apply Filters</span>
        <div className="dash-filter-bar" style={{ flexWrap: 'wrap' }}>
          <PeriodPicker pill period={period} setPeriod={setPeriod} refDate={refDate} setRefDate={setRefDate} />
          <input
            type="text"
            placeholder="Cari Part / Mesin / No Lot…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input"
            style={{ maxWidth: 260 }}
          />
          <button className="btn-icon" title="Refresh data" onClick={load}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {CLUSTERS.map((cluster) => (
        <div key={cluster} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: CLUSTER_COLORS[cluster] }}></span>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Cluster {cluster}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>({byCluster[cluster]?.length || 0} baris)</div>
          </div>

          <div className="row4" style={{ gridTemplateColumns: '1fr', marginBottom: 12 }}>
            <LineTrendChart
              title={`Tren AR — Cluster ${cluster}`}
              data={(trends[cluster] || []).map((d) => ({ ...d, target: 100 }))}
              valueKey="ar"
              targetKey="target"
              color={CLUSTER_COLORS[cluster]}
              unit="%"
              hourly={period === 'today'}
              showMovingAvg
              movingAvgColor="var(--blue)"
              targetColor="var(--red)"
            />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <ProduksiTable rows={byCluster[cluster] || []} loading={loading} onEdit={setEditRow} onDelete={handleDelete} />
          </div>
        </div>
      ))}

      {editRow && (
        <EditProduksiModal row={editRow} onClose={() => setEditRow(null)} onSaved={load} />
      )}
    </div>
  );
}
