import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiFetch } from './api.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

const EMPTY_KPI = { breakdowns: 0, downtime_hrs: 0, planned_hours: 0, planned_hours_per_day: 0, planned_hours_minutes: 0, availability: 0, mtbf: 0, mttr: 0 };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AppProvider({ children }) {
  const { logout } = useAuth();
  const [period, setPeriod] = useState('month');
  const [refDate, setRefDate] = useState(todayStr());
  const [selectedMachine, setSelectedMachine] = useState('');
  const [kpi, setKpi] = useState(EMPTY_KPI);
  const [machines, setMachines] = useState([]);
  const [breakdowns, setBreakdowns] = useState([]);
  const [pareto, setPareto] = useState([]);
  const [paretoMachines, setParetoMachines] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [mtbfMttrTrend, setMtbfMttrTrend] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('—');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const requestIdRef = useRef(0);
  const stateRef = useRef({ period, refDate, selectedMachine });
  stateRef.current = { period, refDate, selectedMachine };

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
    const useMachine = stateRef.current.selectedMachine;
    const myId = ++requestIdRef.current;
    setIsLoading(true);
    setLastUpdate('Updating…');
    const qs = usePeriod === 'all'
      ? 'period=all'
      : `period=${usePeriod}&date=${useDate}`;
    const machineQs = useMachine ? `${qs}&machine=${encodeURIComponent(useMachine)}` : qs;
    const [k, m, b, pr, pm, dt, mt] = await Promise.all([
      apiFetch(`/kpi?${machineQs}`, EMPTY_KPI, logout),
      apiFetch(`/machines?${qs}`, [], logout),
      apiFetch(`/breakdowns?${machineQs}`, [], logout),
      apiFetch(`/pareto?${machineQs}`, [], logout),
      apiFetch(`/pareto-machines?${machineQs}`, [], logout),
      apiFetch(`/downtime-by-day?${machineQs}`, [], logout),
      apiFetch(`/mtbf-mttr-trend?${machineQs}`, [], logout),
    ]);
    if (myId !== requestIdRef.current) return;
    setConnected(true);
    setKpi(k); setMachines(m); setBreakdowns(b); setPareto(pr); setParetoMachines(pm); setDowntime(dt); setMtbfMttrTrend(mt);
    setLastUpdate('Updated ' + new Date().toLocaleTimeString());
    setIsLoading(false);
  }, [logout]);

  return (
    <AppContext.Provider value={{
      period, setPeriod, refDate, setRefDate,
      selectedMachine, setSelectedMachine,
      kpi, machines, breakdowns, pareto, paretoMachines, downtime, mtbfMttrTrend,
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
