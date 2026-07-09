import { useEffect, useRef, useState } from 'react';

const MIN_VISIBLE = 3;
const ROTATE_THRESH = 35;
const ROTATE_ANGLE = -(40 * Math.PI) / 180;

function formatAxisLabel(label) {
  const s = String(label ?? '').trim();
  if (s === 'TOTAL') return s;
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

function ChartCanvas({
  data, valueKey, targetKey, color, unit,
  showMovingAvg, movingAvgColor, overTargetColor,
}) {
  const canvasRef = useRef(null);
  const tipRef    = useRef(null);
  const wrapRef   = useRef(null);
  const zoomRef   = useRef(1);
  const panRef    = useRef(0);
  const [zoom, setZoom]         = useState(1);
  const [panStart, setPanStart] = useState(0);
  const [tick, setTick]         = useState(0);

  const hasTotal  = data?.[data.length - 1]?.day === 'TOTAL';
  const mainData  = hasTotal ? data.slice(0, -1) : (data || []);
  const totalRow  = hasTotal ? data[data.length - 1] : null;

  useEffect(() => {
    setZoom(1); setPanStart(0);
    zoomRef.current = 1; panRef.current = 0;
  }, [mainData.length]);

  const n            = mainData.length;
  const visibleCount = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * zoom)));
  const maxStart     = Math.max(0, n - visibleCount);
  const start        = Math.min(panStart, maxStart);
  const visibleMain  = mainData.slice(start, start + visibleCount);
  const visibleData  = totalRow ? [...visibleMain, totalRow] : visibleMain;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!n) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const dir  = e.deltaY > 0 ? 1 : -1;
      const pz   = zoomRef.current;
      const pp   = panRef.current;
      const pv   = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * pz)));
      const nz   = Math.min(1, Math.max(MIN_VISIBLE / Math.max(n, 1), pz + dir * 0.12));
      const nv   = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * nz)));
      const np   = Math.max(0, Math.min(Math.max(0, n - nv),
                     Math.round(pp + relX * pv - relX * nv)));
      zoomRef.current = nz; panRef.current = np;
      setZoom(nz); setPanStart(np);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [n]);

  useEffect(() => {
    if (!visibleData?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W      = canvas.parentElement.offsetWidth || 360;
    const m      = visibleData.length;
    const padL   = 34;
    const slotW  = (W - padL - 4) / Math.max(m, 1);
    const rotate = slotW < ROTATE_THRESH;
    const FONT   = 10;
    const padB   = rotate ? 46 : 18;
    const H      = 130 + (rotate ? 28 : 0);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pad = { t: 10, b: padB, l: padL, r: 4 };
    const iW  = W - pad.l - pad.r;
    const iH  = H - pad.t - pad.b;

    const styles  = getComputedStyle(document.documentElement);
    const muted   = styles.getPropertyValue('--muted').trim() || '#5a5a78';
    const accent2 = styles.getPropertyValue('--accent2').trim() || '#ff6b35';

    const vals    = visibleData.map((d) => d[valueKey] ?? 0);
    const targets = targetKey ? visibleData.map((d) => d[targetKey] ?? 0) : [];
    const maxV    = Math.max(...vals, ...(targetKey ? targets : []), 1) * 1.15;
    const barW    = Math.max(3, Math.min(slotW * 0.5, 40));
    const xOf     = (i) => pad.l + i * slotW + (slotW - barW) / 2;
    const cxOf    = (i) => pad.l + i * slotW + slotW / 2;
    const yOf     = (v) => pad.t + (1 - v / maxV) * iH;
    const isTotal = visibleData[m - 1]?.day === 'TOTAL';

    ctx.clearRect(0, 0, W, H);

    // Grid + Y-axis labels
    ctx.font = `${FONT}px Inter, sans-serif`;
    ctx.fillStyle = muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(150,150,180,.18)';
      ctx.setLineDash([2, 5]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      const tv = maxV * (1 - i / 3);
      ctx.fillText(tv.toFixed(tv < 10 ? 1 : 0), pad.l - 5, y);
    }

    // TOTAL separator
    if (isTotal && m > 1) {
      const dx = pad.l + (m - 1) * slotW;
      ctx.beginPath(); ctx.moveTo(dx, pad.t); ctx.lineTo(dx, pad.t + iH);
      ctx.strokeStyle = 'rgba(150,150,170,.3)';
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // Bars
    vals.forEach((v, i) => {
      const x = xOf(i); const y = yOf(v);
      const h = (pad.t + iH) - y;
      const r = Math.min(4, barW / 2);
      let bc = color;
      if (overTargetColor && targetKey && v > targets[i] && targets[i] > 0) bc = overTargetColor;
      else if (!(isTotal && i === m - 1)) bc = color + 'cc';
      ctx.fillStyle = bc;
      if (h > 0) {
        ctx.beginPath();
        ctx.moveTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, pad.t + iH); ctx.lineTo(x, pad.t + iH);
        ctx.closePath(); ctx.fill();
      }
    });

    // Target line
    if (targetKey && targets.some((t) => t > 0)) {
      ctx.beginPath(); ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(150,150,180,.5)';
      ctx.setLineDash([5, 4]); ctx.lineCap = 'round';
      targets.forEach((t, i) => {
        if (i === 0) ctx.moveTo(cxOf(0), yOf(t)); else ctx.lineTo(cxOf(i), yOf(t));
      });
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Moving average line
    if (showMovingAvg && vals.length >= 2) {
      const mavg = calcMovingAvg(vals.map((v) => (typeof v === 'number' ? v : 0)));
      ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = movingAvgColor;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      mavg.forEach((v, i) => {
        if (i === 0) ctx.moveTo(cxOf(0), yOf(v)); else ctx.lineTo(cxOf(i), yOf(v));
      });
      ctx.stroke();
      mavg.forEach((v, i) => {
        ctx.beginPath(); ctx.arc(cxOf(i), yOf(v), 2.5, 0, Math.PI * 2);
        ctx.fillStyle = movingAvgColor; ctx.fill();
      });
    }

    // X-axis labels
    const step   = rotate ? 1 : Math.max(1, Math.ceil(22 / slotW));
    const labelY = pad.t + iH + 5;
    ctx.font = `${FONT}px Inter, sans-serif`;
    ctx.textBaseline = 'top';
    visibleData.forEach((d, i) => {
      if (i % step !== 0 && i !== m - 1) return;
      const isT  = d.day === 'TOTAL';
      const label = formatAxisLabel(d.day);
      ctx.fillStyle = isT ? accent2 : muted;
      ctx.font      = isT
        ? `bold ${FONT}px Inter, sans-serif`
        : `${FONT}px Inter, sans-serif`;
      if (rotate && !isT) {
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
      let cl = 0, mn = 999;
      vals.forEach((_, i) => { const d = Math.abs(mx - cxOf(i)); if (d < mn) { mn = d; cl = i; } });
      if (mn < slotW) {
        tip.style.display = 'block';
        tip.style.left    = Math.min(xOf(cl), W - 110) + 'px';
        tip.style.top     = (Math.max(pad.t, yOf(vals[cl])) - 32) + 'px';
        const tgt = targetKey && targets[cl] ? ` · target ${targets[cl].toFixed(1)}` : '';
        tip.textContent = `${formatAxisLabel(visibleData[cl].day)}: ${vals[cl].toFixed(1)} ${unit}${tgt}`;
      } else {
        tip.style.display = 'none';
      }
    };
    canvas.onmousemove  = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove  = (e) => { e.preventDefault(); showTip(e.touches[0].clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend   = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visibleData, valueKey, targetKey, color, unit, showMovingAvg, movingAvgColor, overTargetColor, tick]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setTick((t) => t + 1));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="trend-wrap" ref={wrapRef}>
      <canvas ref={canvasRef}></canvas>
      <div className="trend-tooltip" ref={tipRef}></div>
    </div>
  );
}

export default function LineTrendChart({
  title, data, valueKey, targetKey, color, unit,
  showMovingAvg = false, movingAvgColor = '#f0a500',
  overTargetColor = null,
  legendItems = null,
}) {
  const legend = legendItems || (() => {
    const items = [{ type: 'dot', color, label: `${unit} (nilai)` }];
    if (showMovingAvg) items.push({ type: 'line', color: movingAvgColor, label: 'Rata-rata bergerak' });
    if (targetKey) items.push({ type: 'dash', color: 'rgba(150,150,180,.7)', label: 'Target' });
    return items;
  })();

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
      </div>
      <div className="axis-unit-label">Waktu (Jam)</div>
      <ChartCanvas
        data={data} valueKey={valueKey} targetKey={targetKey}
        color={color} unit={unit}
        showMovingAvg={showMovingAvg} movingAvgColor={movingAvgColor}
        overTargetColor={overTargetColor}
      />
      <div className="chart-legend" style={{ marginTop: 8 }}>
        {legend.map((l, i) => (
          <div key={i} className="legend-item">
            {l.type === 'dot' && <span className="legend-swatch" style={{ background: l.color }}></span>}
            {l.type === 'line' && (
              <span style={{ display: 'inline-block', width: 18, height: 2, background: l.color, borderRadius: 1, verticalAlign: 'middle', marginRight: 4 }}></span>
            )}
            {l.type === 'dash' && (
              <span style={{ display: 'inline-block', width: 18, height: 0, borderTop: `2px dashed ${l.color}`, verticalAlign: 'middle', marginRight: 4 }}></span>
            )}
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
