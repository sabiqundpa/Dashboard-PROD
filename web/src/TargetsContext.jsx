import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'mtn_targets_v1';
const PWD_KEY     = 'mtn_admin_pwd';
const DEFAULT_PWD = 'MTN2024';

export const DEFAULTS = {
  availabilityTarget: 90,
  mttrTarget: 4,
  mtbfTarget: 0,
  workHoursPerDay: 8,
  workDaysPerMonth: 22,
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch { return { ...DEFAULTS }; }
}

function loadPwd() {
  try { return localStorage.getItem(PWD_KEY) || DEFAULT_PWD; } catch { return DEFAULT_PWD; }
}

const TargetsContext = createContext(null);

export function TargetsProvider({ children }) {
  const [data, setData]     = useState(loadData);
  const [pwd, setPwd]       = useState(loadPwd);
  const [adminOpen, setAdminOpen] = useState(false);

  const saveTargets = useCallback((nextData, nextPwd) => {
    setData(nextData);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData)); } catch {}
    if (nextPwd) {
      setPwd(nextPwd);
      try { localStorage.setItem(PWD_KEY, nextPwd); } catch {}
    }
  }, []);

  const checkPassword = useCallback((input) => input === pwd, [pwd]);
  const openAdmin     = useCallback(() => setAdminOpen(true), []);
  const closeAdmin    = useCallback(() => setAdminOpen(false), []);

  return (
    <TargetsContext.Provider value={{
      ...data,
      adminOpen, openAdmin, closeAdmin,
      saveTargets, checkPassword,
    }}>
      {children}
    </TargetsContext.Provider>
  );
}

export function useTargets() {
  return useContext(TargetsContext);
}
