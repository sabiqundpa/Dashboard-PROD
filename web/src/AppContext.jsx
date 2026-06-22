import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiFetch } from './api.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

const EMPTY_KPI = { breakdowns: 0, downtime_hrs: 0, planned_hours: 0, planned_hours_per_day: 0, availability: 0, performance: 0, quality: 0, oee: 0, mtbf: 0, mttr: 0 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AppProvider({ children }) {
  const { logout } = useAuth();
  const [period, setPeriod] = useState('week');
  const [refDate, setRefDate] = useState(todayStr());
  const [kpi, setKpi] = useState(EMPTY_KPI);
  const [machines, setMachines] = useState([]);
  const [breakdowns, setBreakdowns] = useState([]);
  const [pareto, setPareto] = useState([]);
  const [paretoMachines, setParetoMachines] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [mtbfMttrTrend, setMtbfMttrTrend] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('—');
  const [notifications, setNotifications] = useState([]);
  const requestIdRef = useRef(0);
  const stateRef = useRef({ period, refDate });
  stateRef.current = { period, refDate };

  const addNotif = useCallback((text, color = 'yellow') => {
    setNotifications((n) => [{ text, color, time: new Date(), unread: true, id: Math.random() }, ...n]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((n) => n.map((x) => ({ ...x, unread: false })));
  }, []);

  const clearNotifs = useCallback(() => setNotifications([]), []);

  const loadAll = useCallback(async () => {
    const usePeriod = stateRef.current.period;
    const useDate = stateRef.current.refDate;
    // "Latest request wins": don't block overlapping calls (period/date
    // changes must always fire immediately), but if an older, slower call
    // finishes after a newer one, discard its results instead of
    // clobbering fresher state.
    const myId = ++requestIdRef.current;
    setLastUpdate('Updating…');
    const qs = `period=${usePeriod}&date=${useDate}`;
    const [k, m, b, pr, pm, dt, mt] = await Promise.all([
      apiFetch(`/kpi?${qs}`, EMPTY_KPI, logout),
      apiFetch(`/machines?${qs}`, [], logout),
      apiFetch(`/breakdowns?${qs}`, [], logout),
      apiFetch(`/pareto?${qs}`, [], logout),
      apiFetch(`/pareto-machines?${qs}`, [], logout),
      apiFetch(`/downtime-by-day?${qs}`, [], logout),
      apiFetch(`/mtbf-mttr-trend?${qs}`, [], logout),
    ]);
    if (myId !== requestIdRef.current) return;
    setConnected(true);
    setKpi(k); setMachines(m); setBreakdowns(b); setPareto(pr); setParetoMachines(pm); setDowntime(dt); setMtbfMttrTrend(mt);
    setLastUpdate('Updated ' + new Date().toLocaleTimeString());
  }, [logout]);

  return (
    <AppContext.Provider value={{
      period, setPeriod, refDate, setRefDate, kpi, machines, breakdowns, pareto, paretoMachines, downtime, mtbfMttrTrend,
      connected, lastUpdate, loadAll, notifications, addNotif, markAllRead, clearNotifs,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
