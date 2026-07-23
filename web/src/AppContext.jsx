import { createContext, useContext, useState, useCallback, useRef } from 'react';

const AppContext = createContext(null);

// machines/breakdowns tetap ada sebagai array kosong statis -- beberapa
// komponen shell (Topbar, TodoPanel, WOPanel, DetailPanel) masih membaca
// nilai ini, sisa dari fitur Maintenance yang tidak dipakai lagi di
// Dashboard-PROD. Tidak di-fetch lagi supaya tidak ada request percuma
// tiap 30 detik ke endpoint yang sudah dihapus.
const EMPTY = [];

export function AppProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('—');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const requestIdRef = useRef(0);

  const addNotif = useCallback((text, color = 'yellow') => {
    setNotifications((n) => [{ text, color, time: new Date(), unread: true, id: Math.random() }, ...n]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((n) => n.map((x) => ({ ...x, unread: false })));
  }, []);

  const clearNotifs = useCallback(() => setNotifications([]), []);

  // Heartbeat ringan buat indikator "Live/Offline" di Topbar.
  const loadAll = useCallback(async () => {
    const myId = ++requestIdRef.current;
    setIsLoading(true);
    const ok = await fetch('/api/health').then((r) => r.ok).catch(() => false);
    if (myId !== requestIdRef.current) return;
    setConnected(ok);
    setLastUpdate('Updated ' + new Date().toLocaleTimeString());
    setIsLoading(false);
  }, []);

  return (
    <AppContext.Provider value={{
      machines: EMPTY, breakdowns: EMPTY,
      connected, lastUpdate, isLoading, setIsLoading, loadAll,
      notifications, addNotif, markAllRead, clearNotifs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
