import { useUI } from '../UIContext.jsx';
import { fmtDate } from '../utils/fmt.js';

function fmtHrs(hrs) {
  if (!hrs && hrs !== 0) return '—';
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

const TH = {
  padding: '7px 10px',
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.07em',
  color: 'var(--muted)',
  textAlign: 'left',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  background: 'var(--s1)',
};

const TD = {
  padding: '9px 10px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
};

export default function RecentClosedWO({ items = [], limit = 6 }) {
  const { showWODetail } = useUI();

  const closed = [...items]
    .filter(b => b.status === 'resolved')
    .sort((a, b) => String(b.end_date || b.date).localeCompare(String(a.end_date || a.date)))
    .slice(0, limit);

  if (!closed.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 0' }}>Belum ada work order yang selesai</div>;
  }

  return (
    <div className="table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={TH}>Mesin</th>
            <th style={TH}>Penyelesaian</th>
            <th style={{ ...TH, textAlign: 'right' }}>DT</th>
            <th style={{ ...TH, textAlign: 'right' }}>Selesai</th>
          </tr>
        </thead>
        <tbody>
          {closed.map((b, i) => (
            <tr key={b.id ?? i} className="wo-row" onClick={() => showWODetail(b)} style={{ cursor: 'pointer' }}>
              <td style={TD}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{b.machine}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                  {b.cause}
                </div>
              </td>
              <td style={{ ...TD, maxWidth: 180 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: b.resolution ? 'var(--text)' : 'var(--muted)' }}>
                  {b.resolution || '—'}
                </div>
              </td>
              <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', color: b.durationHrs > 0 ? 'var(--red)' : 'var(--muted)', fontSize: 12 }}>
                {fmtHrs(b.durationHrs)}
              </td>
              <td style={{ ...TD, textAlign: 'right', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', fontSize: 11.5 }}>
                {b.end_date ? fmtDate(b.end_date) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
