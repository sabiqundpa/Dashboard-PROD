import { MonitorCog } from 'lucide-react';

// Halaman penuh yang tampil ke SEMUA pengunjung (dashboard internal
// maupun /lhp publik) selagi ada revisi frontend/backend berjalan --
// lihat web/src/maintenanceFlag.js untuk cara mengaktifkannya.
export default function MaintenanceMode() {
  return (
    <div style={{
      height: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '24px', boxSizing: 'border-box', gap: 18,
      background: 'linear-gradient(180deg, #0c2236 0%, #15406a 35%, #2f6fa3 70%, #6fa8d8 100%)',
      color: '#fff', fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: 96, height: 96, borderRadius: '50%',
        background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MonitorCog size={48} strokeWidth={1.6} style={{ animation: 'mm-spin 3.5s linear infinite' }} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '.04em' }}>
        MAINTENANCE SERVER BERLANGSUNG
      </div>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,.8)', maxWidth: 420 }}>
        Mohon maaf mengganggu proses yang berjalan
      </div>
      <style>{`
        @keyframes mm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
