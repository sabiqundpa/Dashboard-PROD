// Toggle ke true sebelum build+deploy revisi yang berisiko bikin
// frontend/backend nggak sinkron sementara (migrasi DB, refactor besar,
// dll), supaya pengunjung situs lihat halaman "Maintenance Server" yang
// rapi ketimbang aplikasi yang setengah jadi. Toggle balik ke false lalu
// build+deploy lagi begitu revisinya selesai dan sudah diverifikasi.
export const MAINTENANCE_MODE = false;
