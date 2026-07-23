import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
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
const AR_OK_THRESHOLD = 90; // di bawah ini ring diwarnai merah -- sinyal "kurang baik"

const STATUS_LABEL = { open: 'Open', in_progress: 'In Progress', closed: 'Closed' };
const STATUS_COLOR = { open: 'var(--red)', in_progress: 'var(--yellow)', closed: 'var(--green)' };

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
  const [problems, setProblems]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/ar-by-cluster?period=month&date=${refDate}`, [], logout),
      apiFetch(`/ar-by-line?period=month&date=${refDate}`, [], logout),
      apiFetch('/problem-log', [], logout),
    ]).then(([c, l, p]) => {
      setByCluster(c);
      setByLine(l);
      setProblems(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refDate, logout]);

  useEffect(() => { load(); }, [load]);

  const loadTrend = useCallback(() => {
    apiFetch(`/ar-trend?period=${trendPeriod}&date=${trendDate}`, [], logout).then(setTrend).catch(() => {});
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
              <MiniRing label="Rata-rata" value={avgAr} size={MAIN_SIZE} color={avgAr < AR_OK_THRESHOLD ? 'var(--red)' : 'var(--accent)'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'space-between' }}>
                {byCluster.map((c) => (
                  <MiniRing key={c.cluster} label={c.cluster} value={c.ar} size={MINI_SIZE} color={c.ar < AR_OK_THRESHOLD ? 'var(--red)' : (CLUSTER_COLORS[c.cluster] || 'var(--accent)')} />
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
          <VerticalBarList data={top5} mode="good" />
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">5 Line Produksi AR Terendah</div></div>
          <VerticalBarList data={bottom5} mode="bad" />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Problem & Root Cause Log</div>
          <button className="card-action" style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('problemlog')}>
            Lihat Semua <ChevronRight size={12} />
          </button>
        </div>
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Memuat…</div>
        ) : problems.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Belum ada data.</div>
        ) : (
          <div style={{ overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  {['Tanggal', 'Line Produksi', 'Part Name', 'Problem', 'Root Cause', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '2px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {problems.slice(0, 6).map((p) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate('problemlog')}>
                    <td style={prTd}>{p.tanggal || '—'}</td>
                    <td style={prTd}>{p.line || '—'}</td>
                    <td style={prTd}>{p.partName || '—'}</td>
                    <td style={prTd}>{p.problem}</td>
                    <td style={prTd}>{p.rootCause || '—'}</td>
                    <td style={prTd}>
                      <span style={{ color: STATUS_COLOR[p.status] || 'var(--muted)', fontWeight: 700 }}>{STATUS_LABEL[p.status] || p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const prTd = { padding: '8px 10px', fontSize: 12.5, borderBottom: '1px solid var(--border)', color: 'var(--text)' };
