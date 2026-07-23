import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useUI } from '../UIContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { apiFetch } from '../api.js';
import MiniRing from '../components/MiniRing.jsx';
import LineTrendChart from '../components/LineTrendChart.jsx';
import { CLUSTER_COLORS } from '../components/ClusterBarList.jsx';
import VerticalBarList from '../components/VerticalBarList.jsx';
import PeriodPicker from '../components/PeriodPicker.jsx';

const MAIN_SIZE = 200;
const MINI_SIZE = 62;

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function ARDetail() {
  const { navigate } = useUI();
  const { logout } = useAuth();

  const [refDate] = useState(todayStr());
  const [trendPeriod, setTrendPeriod] = useState('month');
  const [trendDate, setTrendDate]     = useState(todayStr());

  const [byCluster, setByCluster] = useState([]);
  const [byLine, setByLine]       = useState([]);
  const [trend, setTrend]         = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/produksi-harian/ar-by-cluster?period=month&date=${refDate}`, [], logout),
      apiFetch(`/produksi-harian/ar-by-line?period=month&date=${refDate}`, [], logout),
    ]).then(([c, l]) => {
      setByCluster(c);
      setByLine(l);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refDate, logout]);

  useEffect(() => { load(); }, [load]);

  const loadTrend = useCallback(() => {
    apiFetch(`/produksi-harian/ar-trend?period=${trendPeriod}&date=${trendDate}`, [], logout).then(setTrend).catch(() => {});
  }, [trendPeriod, trendDate, logout]);
  useEffect(() => { loadTrend(); }, [loadTrend]);

  const avgAr = byCluster.length ? Number((byCluster.reduce((s, c) => s + c.ar, 0) / byCluster.length).toFixed(1)) : 0;

  const top5 = byLine.slice(0, 5);
  const bottom5 = [...byLine].reverse().slice(0, 5);

  return (
    <div className="page-view active">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={() => navigate('dashboard')} title="Kembali">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="page-title">Detail AR — Achievement Rate</div>
            <div className="page-sub">Rincian pencapaian AR per Cluster, per Line, dan tren</div>
          </div>
        </div>
      </div>

      <div className="row4" style={{ gridTemplateColumns: '1fr 1.3fr', marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">AR Cluster</div></div>
          {loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>
          ) : byCluster.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>Belum ada data.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <MiniRing label="Rata-rata" value={avgAr} size={MAIN_SIZE} color="var(--accent)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'space-between' }}>
                {byCluster.map((c) => (
                  <MiniRing key={c.cluster} label={c.cluster} value={c.ar} size={MINI_SIZE} color={CLUSTER_COLORS[c.cluster] || 'var(--accent)'} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Tren AR</div>
            <PeriodPicker pill period={trendPeriod} setPeriod={setTrendPeriod} refDate={trendDate} setRefDate={setTrendDate} />
          </div>
          <LineTrendChart
            title=""
            data={trend}
            valueKey="ar"
            color="#0e5a52"
            unit="%"
            hourly={trendPeriod === 'today'}
          />
        </div>
      </div>

      <div className="row4" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">5 Line Produksi AR Tertinggi</div></div>
          <VerticalBarList data={top5} />
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">5 Line Produksi AR Terendah</div></div>
          <VerticalBarList data={bottom5} />
        </div>
      </div>
    </div>
  );
}
