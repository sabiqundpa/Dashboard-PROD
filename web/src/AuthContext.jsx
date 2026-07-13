import { createContext, useContext, useState, useCallback } from 'react';
import { API, getStoredAuth, storeAuth, clearAuth } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(getStoredAuth());

  const login = useCallback(async (username, password) => {
    const r = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Login gagal');
    const role = data.role || 'maintenance';
    storeAuth(data.token, data.username, role);
    setAuth({ token: data.token, username: data.username, role });
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth({ token: null, username: null });
  }, []);

  return (
    <AuthContext.Provider value={{ token: auth.token, username: auth.username, role: auth.role || 'maintenance', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
