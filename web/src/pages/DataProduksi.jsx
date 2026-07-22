import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import ProduksiTable from '../components/ProduksiTable.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';

const API = '/api';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DataProduksi() {
  const [period, setPeriod]   = useState('month');
  const [refDate, setRefDate] = useState(todayStr());
  const [query, setQuery]     = useState('');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const qs = period === 'all' ? 'period=all' : `period=${period}&date=${refDate}`;
    fetch(`${API}/produksi-harian?${qs}`).then((r) => r.json()).then((data) => {
      setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [period, refDate]);

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

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Data Produksi</div>
          <div className="page-sub">Riwayat input Resume Control Harian Produksi</div>
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

      <div className="card" style={{ padding: 0 }}>
        <ProduksiTable rows={filteredRows} loading={loading} />
      </div>
    </div>
  );
}
