import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import ProduksiTable from '../components/ProduksiTable.jsx';
import LineTrendChart from '../components/LineTrendChart.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';
import { CLUSTER_COLORS } from '../components/ClusterBarList.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch } from '../api.js';

const API = '/api';
const CLUSTERS = ['AD', 'BC', 'EF', 'FI'];

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DataProduksi() {
  const { logout } = useAuth();
  const [period, setPeriod]   = useState('month');
  const [refDate, setRefDate] = useState(todayStr());
  const [query, setQuery]     = useState('');
  const [rows, setRows]       = useState([]);
  const [trends, setTrends]   = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const qs = period === 'all' ? 'period=all' : `period=${period}&date=${refDate}`;
    fetch(`${API}/produksi-harian?${qs}`).then((r) => r.json()).then((data) => {
      setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));

    const trendQs = `period=${period === 'all' ? 'month' : period}&date=${refDate}`;
    Promise.all(CLUSTERS.map((c) => apiFetch(`/produksi-harian/ar-trend?${trendQs}&cluster=${c}`, [], logout)))
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

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Data Produksi</div>
          <div className="page-sub">Riwayat input Resume Control Harian Produksi per Cluster</div>
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
              data={trends[cluster] || []}
              valueKey="ar"
              color={CLUSTER_COLORS[cluster]}
              unit="%"
              hourly={period === 'today'}
            />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <ProduksiTable rows={byCluster[cluster] || []} loading={loading} />
          </div>
        </div>
      ))}
    </div>
  );
}
