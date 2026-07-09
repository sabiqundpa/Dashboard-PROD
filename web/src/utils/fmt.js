// Convert YYYY-MM-DD → DD-MM-YYYY for display (input values stay as-is)
export function fmtDate(str) {
  if (!str) return '—';
  const s = String(str).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
}
