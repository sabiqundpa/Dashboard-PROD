import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE = 3;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const ROTATE_THRESH = 35;
const ROTATE_ANGLE = -(40 * Math.PI) / 180;

function formatAxisLabel(label) {
  const s = String(label ?? '').trim();
  const h = parseInt(s, 10);
  if (!isNaN(h) && h >= 0 && h <= 23 && /^\d{1,2}$/.test(s)) {
    if (h === 0)  return '12AM';
    if (h < 12)   return `${h}AM`;
    if (h === 12) return '12PM';
    return `${h - 12}PM`;
  }
  return s;
}

function calcMovingAvg(arr, w = 3) {
  return arr.map((_, i) => {
    const half = Math.floor(w / 2);
    const sl = arr.slice(Math.max(0, i - half), i + half + 1);
    return sl.reduce((s, v) => s + v, 0) / sl.length;
  });
}

function ChartCanvas({ days }) {
  const canvasRef = useRef(null);
  const tipRef    = useRef(null);
  const wrapRef   = useRef(null);
  const zoomRef   = useRef(1);
  const panRef    = useRef(0);
  const [zoom, setZoom]         = useState(1);
  const [panStart, setPanStart] = useState(0);
  const [tick, setTick]         = useState(0);

  useEffect(() => {
    setZoom(1); setPanStart(0);
    zoomRef.current = 1; panRef.current = 0;
  }, [days?.length]);

  const n = days?.length || 0;
  const visibleCount = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * zoom)));
  const maxStart     = Math.max(0, n - visibleCount);
  const start        = Math.min(panStart, maxStart);
  const visible      = (days || []).slice(start, start + visibleCount);
  const currentMonthAbbr = MONTH_ABBR[new Date().getMonth()];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!n) return;
      e.preventDefault();
      const rect   = el.getBoundingClientRect();
      const relX   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dir    = e.deltaY > 0 ? 1 : -1;
      const pz     = zoomRef.current;
      const pp     = panRef.current;
      const pv     = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * pz)));
      const nz     = Math.min(1, Math.max(MIN_VISIBLE / n, pz + dir * 0.12));
      const nv     = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * nz)));
      const np     = Math.max(0, Math.min(Math.max(0, n - nv),
                       Math.round(pp + relX * pv - relX * nv)));
      zoomRef.current = nz; panRef.current = np;
      setZoom(nz); setPanStart(np);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [n]);

  useEffect(() => {
    if (!visible.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W  = canvas.parentElement.offsetWidth || 360;
    const m  = visible.length;
    const padL = 34;
    const slotW  = (W - padL - 4) / Math.max(m, 1);
    const rotate = slotW < ROTATE_THRESH;
    const FONT   = 10;
    const padB   = rotate ? 46 : 18;
    const H      = 130 + (rotate ? 28 : 0);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pad = { t: 8, b: padB, l: padL, r: 4 };
    const iW  = W - pad.l - pad.r;
    const iH  = H - pad.t - pad.b;

    const styles  = getComputedStyle(document.documentElement);
    const muted   = styles.getPropertyValue('--muted').trim() || '#5a5a78';
    const barWMax = Math.max(3, Math.min(slotW * 0.55, 40));
    const xOf     = (i) => pad.l + i * slotW + (slotW - barWMax) / 2;
    const cxOf    = (i) => pad.l + i * slotW + slotW / 2;
    const vals    = visible.map((d) => d.hrs ?? 0);
    const maxV    = Math.max(...vals, 1);
    const yOf     = (v) => pad.t + (1 - v / maxV) * iH;

    ctx.clearRect(0, 0, W, H);

    // Grid lines + Y-axis labels
    ctx.font          = `${FONT}px Inter, sans-serif`;
    ctx.fillStyle     = muted;
    ctx.textAlign     = 'right';
    ctx.textBaseline  = 'middle';
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(150,150,180,.18)';
      ctx.setLineDash([2, 5]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      const tv = maxV * (1 - i / 3);
      ctx.fillText(tv.toFixed(tv < 10 ? 1 : 0), pad.l - 5, y);
    }

    // Bars
    const g = ctx.createLinearGradient(0, pad.t, 0, H);
    g.addColorStop(0, '#4488ff'); g.addColorStop(1, 'rgba(68,136,255,.3)');
    vals.forEach((v, i) => {
      const dayLabel  = visible[i].day || '';
      const isCurrent = dayLabel === currentMonthAbbr;
      if (isCurrent) {
        ctx.fillStyle = 'rgba(68,136,255,.07)';
        ctx.fillRect(pad.l + i * slotW, pad.t, slotW, iH);
      }
      const x = xOf(i); const r = Math.min(4, barWMax / 2);
      if (v === 0) {
        ctx.fillStyle = 'rgba(90,90,140,.3)';
        ctx.beginPath(); ctx.roundRect(x, pad.t + iH - 4, barWMax, 4, 2); ctx.fill();
      } else {
        const y = yOf(v); const h = (pad.t + iH) - y;
        ctx.fillStyle = g;
        if (h > 0) {
          ctx.beginPath();
          ctx.moveTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
          ctx.arcTo(x + barWMax, y, x + barWMax, y + r, r);
          ctx.lineTo(x + barWMax, pad.t + iH); ctx.lineTo(x, pad.t + iH);
          ctx.closePath(); ctx.fill();
        }
      }
    });

    // Moving average line
    if (vals.length >= 2) {
      const mavg = calcMovingAvg(vals);
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = '#f0a500';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      mavg.forEach((v, i) => {
        if (i === 0) ctx.moveTo(cxOf(i), yOf(v)); else ctx.lineTo(cxOf(i), yOf(v));
      });
      ctx.stroke();
      mavg.forEach((v, i) => {
        ctx.beginPath(); ctx.arc(cxOf(i), yOf(v), 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f0a500'; ctx.fill();
      });
    }

    // X-axis labels
    const step   = rotate ? 1 : Math.max(1, Math.ceil(22 / slotW));
    const labelY = pad.t + iH + 5;
    ctx.font         = `${FONT}px Inter, sans-serif`;
    ctx.textBaseline = 'top';
    visible.forEach((d, i) => {
      if (i % step !== 0 && i !== m - 1) return;
      const isCurrent = d.day === currentMonthAbbr;
      const label = formatAxisLabel(d.day);
      ctx.fillStyle = isCurrent ? '#4488ff' : muted;
      ctx.font      = isCurrent
        ? `bold ${FONT}px Inter, sans-serif`
        : `${FONT}px Inter, sans-serif`;
      if (rotate) {
        ctx.save();
        ctx.translate(cxOf(i), labelY);
        ctx.rotate(ROTATE_ANGLE);
        ctx.textAlign = 'right';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      } else {
        ctx.textAlign = 'center';
        ctx.fillText(label, cxOf(i), labelY);
      }
    });

    // Tooltip
    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      const cl = Math.floor((mx - pad.l) / slotW);
      if (cl < 0 || cl >= m) { tip.style.display = 'none'; return; }
      tip.style.display = 'block';
      tip.style.left = Math.min(xOf(cl), W - 100) + 'px';
      tip.style.top  = (Math.max(pad.t, yOf(vals[cl])) - 32) + 'px';
      tip.textContent = `${formatAxisLabel(visible[cl].day)}: ${vals[cl].toFixed(1)} jam`;
    };
    canvas.onmousemove  = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove  = (e) => { e.preventDefault(); showTip(e.touches[0].clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend   = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visible, currentMonthAbbr, tick]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setTick((t) => t + 1));
    return () => cancelAnimationFrame(id);
  }, []);

  const hasNoData = visible.some((d) => (d.hrs ?? 0) === 0);

  return (
    <>
      <div className="axis-unit-label">Waktu (Jam)</div>
      <div className="trend-wrap" ref={wrapRef}>
        <canvas ref={canvasRef}></canvas>
        <div className="trend-tooltip" ref={tipRef}></div>
      </div>
      <div className="chart-legend" style={{ marginTop: 8 }}>
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: '#4488ff' }}></span>
          Downtime (jam)
        </div>
        <div className="legend-item">
          <span style={{ display: 'inline-block', width: 18, height: 2, background: '#f0a500', borderRadius: 1, verticalAlign: 'middle', marginRight: 4 }}></span>
          Average
        </div>
        {hasNoData && (
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(90,90,140,.5)' }}></span>
            Belum ada data
          </div>
        )}
      </div>
    </>
  );
}

export default function DowntimeTrend({ days, year }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Tren Downtime {year}</div>
      </div>
      <ChartCanvas days={days} />
    </div>
  );
}
