import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE = 3;

// Combo chart: bars for the actual value, a line for the target, plus a
// small Excel-style data table underneath with the exact numbers per
// category (including a TOTAL column, shown with a divider before it).
// Mouse wheel over the chart zooms in/out on the day-by-day columns; the
// TOTAL column (if present) always stays pinned at the end.
export default function LineTrendChart({ title, sub, data, valueKey, targetKey, color, unit }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const wrapRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState(0);

  const hasTotal = data?.[data.length - 1]?.day === 'TOTAL';
  const mainData = hasTotal ? data.slice(0, -1) : (data || []);
  const totalRow = hasTotal ? data[data.length - 1] : null;

  useEffect(() => { setZoom(1); setPanStart(0); }, [mainData.length]);

  const n = mainData.length;
  const visibleCount = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * zoom)));
  const maxStart = Math.max(0, n - visibleCount);
  const start = Math.min(panStart, maxStart);
  const visibleMain = mainData.slice(start, start + visibleCount);
  const visibleData = totalRow ? [...visibleMain, totalRow] : visibleMain;

  // Native (non-passive) wheel listener -- React's synthetic onWheel is
  // passive by default, so preventDefault() there wouldn't actually stop
  // the page from scrolling while zooming the chart.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!n) return;
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      setZoom((z) => Math.min(1, Math.max(MIN_VISIBLE / Math.max(n, 1), z + dir * 0.12)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [n]);

  useEffect(() => {
    if (!visibleData?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.parentElement.offsetWidth || 360;
    const H = 130;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pad = { t: 10, b: 4, l: 4, r: 4 }, iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
    const vals = visibleData.map((d) => d[valueKey] ?? 0);
    const targets = visibleData.map((d) => d[targetKey] ?? 0);
    const maxV = Math.max(...vals, ...targets, 1) * 1.15;
    const m = visibleData.length;
    const slot = iW / m, barW = Math.max(2, slot * 0.5);
    const xOf = (i) => pad.l + i * slot + slot / 2;
    const barX = (i) => pad.l + i * slot + (slot - barW) / 2;
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;
    const isTotal = visibleData[m - 1]?.day === 'TOTAL';

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(150,150,170,.12)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // divider before the TOTAL column
    if (isTotal && m > 1) {
      const dx = pad.l + (m - 1) * slot;
      ctx.beginPath(); ctx.moveTo(dx, pad.t); ctx.lineTo(dx, pad.t + iH);
      ctx.strokeStyle = 'rgba(150,150,170,.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // bars (actual value)
    vals.forEach((v, i) => {
      const x = barX(i), y = yOf(v), h = (pad.t + iH) - y;
      const r = Math.min(3, barW / 2);
      ctx.fillStyle = isTotal && i === m - 1 ? color : color + 'cc';
      ctx.beginPath();
      if (h > 0) {
        ctx.moveTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, pad.t + iH); ctx.lineTo(x, pad.t + iH); ctx.closePath(); ctx.fill();
      }
    });

    // target line, bright contrasting color
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#ff6b35'; ctx.lineCap = 'round';
    targets.forEach((t, i) => { if (i === 0) ctx.moveTo(xOf(0), yOf(t)); else ctx.lineTo(xOf(i), yOf(t)); });
    ctx.stroke();
    targets.forEach((t, i) => {
      ctx.beginPath(); ctx.arc(xOf(i), yOf(t), 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b35'; ctx.fill();
    });

    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      let cl = 0, mn = 999;
      vals.forEach((_, i) => { const d = Math.abs(mx - xOf(i)); if (d < mn) { mn = d; cl = i; } });
      if (mn < slot) {
        tip.style.display = 'block';
        tip.style.left = Math.min(xOf(cl), W - 90) + 'px';
        tip.style.top = (Math.min(yOf(vals[cl]), yOf(targets[cl])) - 32) + 'px';
        tip.textContent = `${visibleData[cl].day}: ${vals[cl].toFixed(1)} / target ${targets[cl].toFixed(1)} ${unit}`;
      } else tip.style.display = 'none';
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => { e.preventDefault(); const t = e.touches[0]; showTip(t.clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visibleData, valueKey, targetKey, color, unit]);

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">{title}</div><div className="card-sub">{sub} — scroll untuk zoom</div></div>
        {zoom < 1 && <button className="card-action" onClick={() => { setZoom(1); setPanStart(0); }}>Reset zoom</button>}
      </div>
      <div className="trend-wrap" style={{ height: 130 }} ref={wrapRef}><canvas ref={canvasRef}></canvas><div className="trend-tooltip" ref={tipRef}></div></div>
      {visibleCount < n && (
        <input
          type="range" min={0} max={maxStart} value={start}
          onChange={(e) => setPanStart(Number(e.target.value))}
          style={{ width: '100%', marginTop: 6 }}
        />
      )}
    </div>
  );
}
