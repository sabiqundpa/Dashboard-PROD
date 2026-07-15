export const API = '/api';

export function authHeader() {
  return { Authorization: 'Bearer ' + (localStorage.getItem('admin_token') || '') };
}

export function getStoredAuth() {
  return {
    token: localStorage.getItem('admin_token'),
    username: localStorage.getItem('admin_username'),
    role: localStorage.getItem('admin_role') || 'maintenance',
  };
}

export function storeAuth(token, username, role = 'maintenance') {
  localStorage.setItem('admin_token', token);
  localStorage.setItem('admin_username', username);
  localStorage.setItem('admin_role', role);
}

export function clearAuth() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
  localStorage.removeItem('admin_role');
}

// GET with a fallback value on any failure (network, 401, non-2xx).
// Calls onUnauthorized() instead of throwing when the token is invalid/expired.
export async function apiFetch(path, fallback, onUnauthorized) {
  try {
    const r = await fetch(API + path, { signal: AbortSignal.timeout(9000), headers: authHeader() });
    if (r.status === 401) { onUnauthorized?.(); return fallback; }
    if (!r.ok) throw new Error('Request failed');
    return await r.json();
  } catch {
    return fallback;
  }
}

// POST/PATCH/etc with a JSON body. Throws on failure so callers can show an error.
export async function apiSend(path, method, body, onUnauthorized) {
  const r = await fetch(API + path, {
    method,
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) { onUnauthorized?.(); throw new Error('Session expired'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function apiSendForm(path, formData, onUnauthorized) {
  const r = await fetch(API + path, { method: 'POST', headers: authHeader(), body: formData });
  if (r.status === 401) { onUnauthorized?.(); throw new Error('Session expired'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Downloads a file (e.g. CSV) that requires the auth header -- a plain
// <a href> can't send Authorization, so fetch as a blob and save it.
export async function apiDownload(path, filename, onUnauthorized) {
  const r = await fetch(API + path, { headers: authHeader() });
  if (r.status === 401) { onUnauthorized?.(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error('Download gagal');
  const blob = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
