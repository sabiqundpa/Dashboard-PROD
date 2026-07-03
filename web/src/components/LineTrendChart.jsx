import { useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';

const MIN_VISIBLE = 3;

function calcMovingAvg(arr, window = 3) {
  return arr.map((_, i) => {
    const half = Math.floor(window / 2);
    const slice = arr.slice(Math.max(0, i - half), i + half + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

export default function LineTrendChart({
  title, data, valueKey, targetKey, color, unit,
  showMovingAvg = false, movingAvgColor = '#f0a500',
  overTargetColor = null,
  legendItems = null,
}) {
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

    const styles = getComputedStyle(document.documentElement);
    const muted = styles.getPropertyValue('--muted').trim() || '#5a5a78';
    const pad = { t: 10, b: 4, l: 30, r: 4 };
    const iW = W - pad.l - pad.r;
    const iH = H - pad.t - pad.b;
    const vals = visibleData.map((d) => d[valueKey] ?? 0);
    const targets = targetKey ? visibleData.map((d) => d[targetKey] ?? 0) : [];
    const maxV = Math.max(...vals, ...(targetKey ? targets : []), 1) * 1.15;
    const m = visibleData.length;
    const slot = iW / m;
    const barW = Math.max(3, Math.min(slot * 0.5, 40));
    const xOf = (i) => pad.l + i * slot + slot / 2;
    const barX = (i) => pad.l + i * slot + (slot - barW) / 2;
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;
    const isTotal = visibleData[m - 1]?.day === 'TOTAL';

    ctx.clearRect(0, 0, W, H);

    // Grid + Y ticks
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath();
      ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(150,150,180,.08)';
      ctx.lineWidth = 1; ctx.stroke();
      const tickVal = maxV * (1 - i / 3);
      ctx.fillText(tickVal.toFixed(tickVal < 10 ? 1 : 0), pad.l - 6, y);
    }

    // TOTAL column divider
    if (isTotal && m > 1) {
      const dx = pad.l + (m - 1) * slot;
      ctx.beginPath(); ctx.moveTo(dx, pad.t); ctx.lineTo(dx, pad.t + iH);
      ctx.strokeStyle = 'rgba(150,150,170,.3)';
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw bars
    vals.forEach((v, i) => {
      const x = barX(i);
      const y = yOf(v);
      const h = (pad.t + iH) - y;
      const r = Math.min(4, barW / 2);

      // Determine bar color (over-target = red, total = full opacity, else normal)
      let barColor = color;
      if (overTargetColor && targetKey && v > targets[i] && targets[i] > 0) {
        barColor = overTargetColor;
      } else if (isTotal && i === m - 1) {
        barColor = color;
      } else {
        barColor = color + 'cc';
      }

      ctx.fillStyle = barColor;
      if (h > 0) {
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + r, r);
        ctx.lineTo(x + barW, pad.t + iH);
        ctx.lineTo(x, pad.t + iH);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Target line (dashed gray)
    if (targetKey && targets.some((t) => t > 0)) {
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(150,150,180,.5)';
      ctx.setLineDash([5, 4]);
      ctx.lineCap = 'round';
      targets.forEach((t, i) => {
        if (i === 0) ctx.moveTo(xOf(0), yOf(t));
        else ctx.lineTo(xOf(i), yOf(t));
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Moving average line (orange)
    if (showMovingAvg && vals.length >= 2) {
      const mavg = calcMovingAvg(vals.map((v) => (typeof v === 'number' ? v : 0)));
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = movingAvgColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      mavg.forEach((v, i) => {
        if (i === 0) ctx.moveTo(xOf(0), yOf(v));
        else ctx.lineTo(xOf(i), yOf(v));
      });
      ctx.stroke();
      // dots on moving avg line
      mavg.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 2.5, 0, Math.PI * 2);
        ctx.fillStyle = movingAvgColor;
        ctx.fill();
      });
    }

    // Tooltip
    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      let cl = 0, mn = 999;
      vals.forEach((_, i) => { const d = Math.abs(mx - xOf(i)); if (d < mn) { mn = d; cl = i; } });
      if (mn < slot) {
        tip.style.display = 'block';
        tip.style.left = Math.min(xOf(cl), W - 100) + 'px';
        tip.style.top = (Math.max(pad.t, yOf(vals[cl])) - 32) + 'px';
        const tgt = targetKey && targets[cl] ? ` · target ${targets[cl].toFixed(1)}` : '';
        tip.textContent = `${visibleData[cl].day}: ${vals[cl].toFixed(1)} ${unit}${tgt}`;
      } else {
        tip.style.display = 'none';
      }
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      showTip(t.clientX, canvas.getBoundingClientRect());
    };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visibleData, valueKey, targetKey, color, unit, showMovingAvg, movingAvgColor, overTargetColor]);

  // Build default legend if not provided
  const legend = legendItems || (() => {
    const items = [{ type: 'dot', color, label: `${unit} (nilai)` }];
    if (showMovingAvg) items.push({ type: 'line', color: movingAvgColor, label: 'Rata-rata bergerak' });
    if (targetKey) items.push({ type: 'dash', color: 'rgba(150,150,180,.7)', label: 'Target' });
    return items;
  })();

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">{title}</div></div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {zoom < 1 && (
            <button className="card-action" onClick={() => { setZoom(1); setPanStart(0); }}>
              Reset zoom
            </button>
          )}
          <button className="chart-expand" title="Scroll mouse untuk zoom">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        {legend.map((l, i) => (
          <div key={i} className="legend-item">
            {l.type === 'dot' && <span className="legend-swatch" style={{ background: l.color }}></span>}
            {(l.type === 'line' || l.type === 'dash') && (
              <span className="legend-dash" style={{
                background: l.color,
                ...(l.type === 'dash' ? { borderTop: `2px dashed ${l.color}`, background: 'none', height: 0 } : {}),
              }}></span>
            )}
            {l.label}
          </div>
        ))}
      </div>

      <div className="axis-unit-label">Waktu (Jam)</div>
      <div className="trend-wrap" style={{ height: 130 }} ref={wrapRef}>
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

      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 5,
        marginLeft: 30, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)',
      }}>
        {visibleData.map((d, i) => (
          <span key={i} style={d.day === 'TOTAL' ? { fontWeight: 700, color: 'var(--accent2)' } : undefined}>
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}
