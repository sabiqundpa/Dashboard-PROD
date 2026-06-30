import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE = 3;

export default function DowntimeTrend({ days }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const wrapRef = useRef(null);
  const [, forceResize] = useState(0);
  const [zoom, setZoom] = useState(1); // 1 = fully zoomed out (show all days)
  const [panStart, setPanStart] = useState(0);

  useEffect(() => {
    const onResize = () => forceResize((n) => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Reset zoom/pan whenever the underlying period data changes shape.
  useEffect(() => { setZoom(1); setPanStart(0); }, [days?.length]);

  const n = days?.length || 0;
  const visibleCount = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * zoom)));
  const maxStart = Math.max(0, n - visibleCount);
  const start = Math.min(panStart, maxStart);
  const visible = (days || []).slice(start, start + visibleCount);

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
      setZoom((z) => Math.min(1, Math.max(MIN_VISIBLE / n, z + dir * 0.12)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [n]);

  useEffect(() => {
    if (!visible.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.parentElement.offsetWidth || 360;
    canvas.width = W; canvas.height = 110;
    const ctx = canvas.getContext('2d');
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#888';
    const pad = { t: 8, b: 4, l: 30, r: 4 }, iW = W - pad.l - pad.r, iH = 110 - pad.t - pad.b;
    const vals = visible.map((d) => d.hrs), maxV = Math.max(...vals, 1);
    const m = visible.length;
    const slot = iW / m, barW = Math.max(2, slot * 0.55);
    const xOf = (i) => pad.l + i * slot + (slot - barW) / 2;
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;
    ctx.clearRect(0, 0, W, 110);
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1; ctx.stroke();
      const tickVal = maxV * (1 - i / 3);
      ctx.fillText(tickVal.toFixed(tickVal < 10 ? 1 : 0), pad.l - 6, y);
    }
    const g = ctx.createLinearGradient(0, pad.t, 0, 110);
    g.addColorStop(0, '#4488ff'); g.addColorStop(1, 'rgba(68,136,255,.35)');
    vals.forEach((v, i) => {
      const x = xOf(i), y = yOf(v), h = (pad.t + iH) - y;
      ctx.fillStyle = g;
      const r = Math.min(4, barW / 2);
      ctx.beginPath();
      if (h > 0) {
        ctx.moveTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, pad.t + iH); ctx.lineTo(x, pad.t + iH); ctx.closePath(); ctx.fill();
      }
    });

    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      const cl = Math.floor((mx - pad.l) / slot);
      if (cl < 0 || cl >= m) { tip.style.display = 'none'; return; }
      tip.style.display = 'block';
      tip.style.left = Math.min(xOf(cl), W - 80) + 'px';
      tip.style.top = (yOf(vals[cl]) - 30) + 'px';
      tip.textContent = `${visible[cl].day}: ${vals[cl].toFixed(1)} jam`;
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => { e.preventDefault(); const t = e.touches[0]; showTip(t.clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visible]);

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">Downtime Trend</div></div>
        {zoom < 1 && <button className="card-action" onClick={() => { setZoom(1); setPanStart(0); }}>Reset zoom</button>}
      </div>
      <div className="axis-unit-label">Waktu (Jam)</div>
      <div className="trend-wrap" ref={wrapRef}>
        <canvas ref={canvasRef}></canvas>
        <div className="trend-tooltip" ref={tipRef}></div>
      </div>
      {visibleCount < n && (
        <input
          type="range" min={0} max={maxStart} value={start}
          onChange={(e) => setPanStart(Number(e.target.value))}
          style={{ width: '100%', marginTop: 6 }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 5, marginLeft: 30, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        {visible.map((d, i) => <span key={i}>{d.day}</span>)}
      </div>
    </div>
  );
}
