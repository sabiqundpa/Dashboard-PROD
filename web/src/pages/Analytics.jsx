import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Play, RefreshCw } from 'lucide-react';
import { useToast } from '../ToastContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch, apiSend } from '../api.js';

const PERIODS = [
  { key: 'monthly', label: 'Bulanan' },
  { key: 'weekly', label: 'Mingguan' },
  { key: 'daily', label: 'Harian' },
];

const STATUS_COLOR = {
  ok: 'var(--green)',
  warn: 'var(--yellow)',
  bad: 'var(--red)',
};

function avColor(v) {
  return v >= 90 ? STATUS_COLOR.ok : v >= 75 ? STATUS_COLOR.warn : STATUS_COLOR.bad;
}

export default function Analytics() {
  const showToast = useToast();
  const { logout } = useAuth();

  const [period, setPeriod] = useState('monthly');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [computing, setComputing] = useState(false);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/analytics?limit=200', null, logout);
      if (data) {
        setRecords(data.records ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [logout]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  async function handleCompute() {
    setComputing(true);
    try {
      const result = await apiSend('/analytics-compute', 'POST', { period, date }, logout);
      showToast(`Kalkulasi selesai — ${result.computed} mesin dihitung`, 'green');
      await fetchAnalytics();
    } catch (e) {
      showToast(e.message, 'red');
    }
    setComputing(false);
  }

  return (
    <div className="page-view active">
      <div className="page-header">
        <div>
          <div className="page-title">Analytic</div>
          <div className="page-sub">Hasil kalkulasi Availability, MTBF, MTTR per mesin per periode</div>
        </div>
      </div>

      {/* Compute panel */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <div><div className="card-title">Hitung Analitik</div></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Periode</label>
            <select className="form-input" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tanggal Acuan</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px' }}
            disabled={computing}
            onClick={handleCompute}
          >
            {computing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {computing ? 'Menghitung…' : 'Hitung & Simpan'}
          </button>
          <button
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={fetchAnalytics}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Results table */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Riwayat Analitik</div></div>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{total} record</span>
        </div>

        {loading && <div style={{ color: 'var(--muted)', fontSize: 13, padding: 16 }}>Memuat data…</div>}
        {error && <div style={{ color: 'var(--red)', fontSize: 13, padding: 16 }}>{error}</div>}

        {!loading && !error && (
          <div className="table-scroll">
            <table className="machine-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Mesin</th>
                  <th>Cluster / Line</th>
                  <th>Periode</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'center' }}>Availability</th>
                  <th style={{ textAlign: 'center' }}>MTBF (jam)</th>
                  <th style={{ textAlign: 'center' }}>MTTR (jam)</th>
                  <th style={{ textAlign: 'center' }}>Downtime (jam)</th>
                  <th style={{ textAlign: 'center' }}>Breakdowns</th>
                  <th style={{ textAlign: 'right' }}>Dihitung</th>
                </tr>
              </thead>
              <tbody>
                {!records.length ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
                      Belum ada data — klik "Hitung &amp; Simpan" untuk menghitung pertama kali
                    </td>
                  </tr>
                ) : records.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.machine}</strong></td>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>
                      {r.cluster || '—'} / {r.line || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                      {r.periodStart} → {r.periodEnd}
                    </td>
                    <td>
                      <span className="filter-chip" style={{ fontSize: 10 }}>{r.periodType}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: avColor(r.availability), fontFamily: 'var(--mono)' }}>
                        {r.availability.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                      {r.mtbf.toFixed(1)}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                      {r.mttr.toFixed(1)}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--red)' }}>
                      {r.totalDowntime.toFixed(1)}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--mono)' }}>
                      {r.totalBreakdowns}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      {r.calculatedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
