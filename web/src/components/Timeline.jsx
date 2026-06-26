import { useUI } from '../UIContext.jsx';

export default function Timeline({ items, limit = 999 }) {
  const { openModal } = useUI();
  const data = items.slice(0, limit);

  if (!data.length) {
    return <div style={{ color: 'var(--muted)', fontSize: 12, padding: 8 }}>Tidak Ada Kasus</div>;
  }

  return (
    <div className="table-scroll">
      <table className="machine-table tl-table" style={{ minWidth: 420 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'center' }}>Status</th>
            <th>Mesin</th>
            <th>Tanggal</th>
            <th>Waktu</th>
            <th style={{ textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b, i) => {
            const isOpen = b.status === 'open';
            return (
              <tr key={b.id ?? i}>
                <td style={{ textAlign: 'center' }}>
                  <span className={'status-pill ' + (isOpen ? 'down' : 'running')}>
                    <span className="status-dot"></span>{isOpen ? 'OPEN' : 'CLOSE'}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.machine}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{b.cause}</div>
                </td>
                <td style={{ fontFamily: 'var(--mono)' }}>{b.date}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>{b.start || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  {isOpen && b.id ? (
                    <button className="btn" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => openModal('closeWO', { id: b.id, machine: b.machine, cause: b.cause })}>Tutup WO</button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{b.duration}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
