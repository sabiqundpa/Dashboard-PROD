import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

const MIN_VISIBLE = 3;

function calcMovingAvg(arr, window = 3) {
  return arr.map((_, i) => {
    const half = Math.floor(window / 2);
    const slice = arr.slice(Math.max(0, i - half), i + half + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

function ChartCanvas({
  data, valueKey, targetKey, color, unit,
  showMovingAvg, movingAvgColor, overTargetColor, expanded,
}) {
  const canvasRef = useRef(null);
  const tipRef    = useRef(null);
  const wrapRef   = useRef(null);
  const [zoom, setZoom]       = useState(1);
  const [panStart, setPanStart] = useState(0);
  const [tick, setTick]       = useState(0);

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
    const H = expanded ? Math.round(window.innerHeight * 0.4) : 130;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const styles = getComputedStyle(document.documentElement);
    const muted = styles.getPropertyValue('--muted').trim() || '#5a5a78';
    const accent2 = styles.getPropertyValue('--accent2').trim() || '#ff6b35';

    // pad.b = 18 to reserve space for X-axis labels drawn on canvas
    const pad = { t: 10, b: 18, l: 30, r: 4 };
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

    if (isTotal && m > 1) {
      const dx = pad.l + (m - 1) * slot;
      ctx.beginPath(); ctx.moveTo(dx, pad.t); ctx.lineTo(dx, pad.t + iH);
      ctx.strokeStyle = 'rgba(150,150,170,.3)';
      ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
      ctx.setLineDash([]);
    }

    vals.forEach((v, i) => {
      const x = barX(i);
      const y = yOf(v);
      const h = (pad.t + iH) - y;
      const r = Math.min(4, barW / 2);
      let barColor = color;
      if (overTargetColor && targetKey && v > targets[i] && targets[i] > 0) barColor = overTargetColor;
      else if (isTotal && i === m - 1) barColor = color;
      else barColor = color + 'cc';
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
      mavg.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 2.5, 0, Math.PI * 2);
        ctx.fillStyle = movingAvgColor;
        ctx.fill();
      });
    }

    // X-axis labels on canvas — auto-step to avoid overlap
    const minGap = 22;
    const step = Math.max(1, Math.ceil(minGap / slot));
    const labelY = pad.t + iH + 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    visibleData.forEach((d, i) => {
      if (i % step !== 0 && i !== m - 1) return;
      const isT = d.day === 'TOTAL';
      ctx.fillStyle = isT ? accent2 : muted;
      ctx.font = isT ? 'bold 9px Inter, sans-serif' : '9px Inter, sans-serif';
      ctx.fillText(d.day, xOf(i), labelY);
    });

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
      showTip(e.touches[0].clientX, canvas.getBoundingClientRect());
    };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visibleData, valueKey, targetKey, color, unit, showMovingAvg, movingAvgColor, overTargetColor, expanded, tick]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setTick(t => t + 1));
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  const chartH = expanded ? Math.round(window.innerHeight * 0.4) : 130;

  return (
    <>
      <div className="trend-wrap" style={{ height: chartH }} ref={wrapRef}>
        <canvas ref={canvasRef}></canvas>
        <div className="trend-tooltip" ref={tipRef}></div>
      </div>

      {visibleCount < n && (
        <input
          type="range" min={0} max={maxStart} value={start}
          onChange={(e) => setPanStart(Number(e.target.value))}
          style={{ width: '100%', marginTop: 4 }}
        />
      )}

      {visibleCount < n && (
        <button className="card-action" style={{ marginTop: 6 }}
          onClick={() => { setZoom(1); setPanStart(0); }}>
          Reset zoom
        </button>
      )}
    </>
  );
}

export default function LineTrendChart({
  title, data, valueKey, targetKey, color, unit,
  showMovingAvg = false, movingAvgColor = '#f0a500',
  overTargetColor = null,
  legendItems = null,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const fn = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [expanded]);

  const legend = legendItems || (() => {
    const items = [{ type: 'dot', color, label: `${unit} (nilai)` }];
    if (showMovingAvg) items.push({ type: 'line', color: movingAvgColor, label: 'Rata-rata bergerak' });
    if (targetKey) items.push({ type: 'dash', color: 'rgba(150,150,180,.7)', label: 'Target' });
    return items;
  })();

  const header = (
    <div className="card-header">
      <div><div className="card-title">{title}</div></div>
      {!expanded && (
        <button className="chart-expand" onClick={() => setExpanded(true)}
          title="Perbesar grafik">
          <Maximize2 size={12}/>
        </button>
      )}
    </div>
  );

  const legendEl = (
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
  );

  const canvasEl = (
    <ChartCanvas
      data={data} valueKey={valueKey} targetKey={targetKey}
      color={color} unit={unit}
      showMovingAvg={showMovingAvg} movingAvgColor={movingAvgColor}
      overTargetColor={overTargetColor}
      expanded={expanded}
    />
  );

  if (expanded) {
    return (
      <div className="chart-expand-overlay" onClick={() => setExpanded(false)}>
        <div className="card chart-expand-modal" onClick={e => e.stopPropagation()}>
          {header}
          {legendEl}
          <div className="axis-unit-label">Waktu (Jam)</div>
          {canvasEl}
          <button className="chart-expand-close" onClick={() => setExpanded(false)} title="Tutup">
            <X size={16}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {header}
      {legendEl}
      <div className="axis-unit-label">Waktu (Jam)</div>
      {canvasEl}
    </div>
  );
}
