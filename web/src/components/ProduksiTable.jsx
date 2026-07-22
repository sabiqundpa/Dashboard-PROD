// Tabel hasil input Resume Control Harian Produksi — dipakai bersama oleh
// halaman /rmo (tab "Data Tabel") dan menu "Data Produksi" di dashboard utama.
export default function ProduksiTable({ rows, loading }) {
  const th = { padding: '8px 10px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: '#3d4b4b', background: '#f5c542', border: '1px solid #d9b93a', whiteSpace: 'nowrap', position: 'sticky', top: 0 };
  const td = { padding: '7px 10px', fontSize: 12.5, border: '1px solid var(--border)', whiteSpace: 'nowrap', color: 'var(--text)' };
  const tdOk = { ...td, background: 'rgba(14,90,82,.1)' };
  const tdPct = (v, target) => ({ ...td, background: v >= target ? 'rgba(15,140,63,.14)' : 'rgba(200,30,58,.1)', fontWeight: 700, textAlign: 'center' });

  const avg = (key) => rows.length ? (rows.reduce((s, r) => s + (r[key] || 0), 0) / rows.length).toFixed(1) : '0.0';

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Memuat…</div>;
  if (rows.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Belum ada data.</div>;

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', background: 'var(--s1)' }}>
        <thead>
          <tr>
            {['Nama Parts', 'No Lot', 'Proses', 'Mesin', 'MP', 'CT', 'Waktu Efektif (Jam)', 'Plan',
              'OK1', 'OK2', 'Rwk', 'Rjct', 'Total OK', 'Total Proses',
              'Breakdown MC', 'Lost Time', 'Keterangan',
              'AR', 'AVB', 'PERF', 'YIELD', 'OEE'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.partName}</td>
              <td style={td}>{r.noLot || '—'}</td>
              <td style={td}>{r.proses}</td>
              <td style={td}>{r.mesin}</td>
              <td style={td}>{r.manPower || '—'}</td>
              <td style={td}>{r.cycleTime}</td>
              <td style={td}>{r.waktuEfektif}</td>
              <td style={td}>{r.plan.toLocaleString()}</td>
              <td style={td}>{r.ok1.toLocaleString()}</td>
              <td style={td}>{r.ok2.toLocaleString()}</td>
              <td style={td}>{r.rework || ''}</td>
              <td style={td}>{r.reject || ''}</td>
              <td style={tdOk}>{r.totalOk.toLocaleString()}</td>
              <td style={tdOk}>{r.totalProses.toLocaleString()}</td>
              <td style={td}>{r.breakdownMesin || ''}</td>
              <td style={td}>{r.lostTime || ''}</td>
              <td style={{ ...td, whiteSpace: 'normal', minWidth: 160 }}>{r.keterangan || ''}</td>
              <td style={tdPct(r.ar, 100)}>{r.ar}%</td>
              <td style={tdPct(r.avb, 90)}>{r.avb}%</td>
              <td style={tdPct(r.perf, 95)}>{r.perf}%</td>
              <td style={tdPct(r.yield, 100)}>{r.yield}%</td>
              <td style={tdPct(r.oee, 85)}>{r.oee}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...td, fontWeight: 700, background: '#f5c542', color: '#3d4b4b' }} colSpan={17}>PENCAPAIAN RATA-RATA</td>
            <td style={{ ...td, fontWeight: 700, background: '#f5c542', color: '#3d4b4b', textAlign: 'center' }}>{avg('ar')}%</td>
            <td style={{ ...td, fontWeight: 700, background: '#f5c542', color: '#3d4b4b', textAlign: 'center' }}>{avg('avb')}%</td>
            <td style={{ ...td, fontWeight: 700, background: '#f5c542', color: '#3d4b4b', textAlign: 'center' }}>{avg('perf')}%</td>
            <td style={{ ...td, fontWeight: 700, background: '#f5c542', color: '#3d4b4b', textAlign: 'center' }}>{avg('yield')}%</td>
            <td style={{ ...td, fontWeight: 700, background: '#f5c542', color: '#3d4b4b', textAlign: 'center' }}>{avg('oee')}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
