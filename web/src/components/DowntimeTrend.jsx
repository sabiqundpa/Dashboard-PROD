import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

const MIN_VISIBLE = 3;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function ChartCanvas({ days, year, expanded }) {
  const canvasRef = useRef(null);
  const tipRef    = useRef(null);
  const wrapRef   = useRef(null);
  const [zoom, setZoom]       = useState(1);
  const [panStart, setPanStart] = useState(0);
  const [tick, setTick]       = useState(0);

  useEffect(() => { setZoom(1); setPanStart(0); }, [days?.length]);

  const n = days?.length || 0;
  const visibleCount = Math.max(MIN_VISIBLE, Math.min(n, Math.round(n * zoom)));
  const maxStart = Math.max(0, n - visibleCount);
  const start = Math.min(panStart, maxStart);
  const visible = (days || []).slice(start, start + visibleCount);

  const currentMonthAbbr = MONTH_ABBR[new Date().getMonth()];

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
    const H = expanded ? Math.round(window.innerHeight * 0.45) : 130;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const styles = getComputedStyle(document.documentElement);
    const muted = styles.getPropertyValue('--muted').trim() || '#5a5a78';

    const pad = { t: 8, b: 4, l: 30, r: 4 };
    const iW = W - pad.l - pad.r;
    const iH = H - pad.t - pad.b;
    const vals = visible.map((d) => d.hrs ?? 0);
    const maxV = Math.max(...vals, 1);
    const m = visible.length;
    const slot = iW / m;
    const barW = Math.max(3, Math.min(slot * 0.55, 40));
    const xOf = (i) => pad.l + i * slot + (slot - barW) / 2;
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;

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

    const g = ctx.createLinearGradient(0, pad.t, 0, H);
    g.addColorStop(0, '#4488ff');
    g.addColorStop(1, 'rgba(68,136,255,.3)');

    vals.forEach((v, i) => {
      const dayLabel = visible[i].day || '';
      const isCurrent = dayLabel === currentMonthAbbr;
      const noData = v === 0;

      if (isCurrent) {
        ctx.fillStyle = 'rgba(68,136,255,.07)';
        ctx.fillRect(pad.l + i * slot, pad.t, slot, iH);
      }

      const x = xOf(i);
      const r = Math.min(5, barW / 2);

      if (noData) {
        const stubH = 4;
        ctx.fillStyle = 'rgba(90,90,140,.3)';
        ctx.beginPath();
        ctx.roundRect(x, pad.t + iH - stubH, barW, stubH, 2);
        ctx.fill();
      } else {
        const y = yOf(v);
        const h = (pad.t + iH) - y;
        ctx.fillStyle = g;
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
      }
    });

    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      const cl = Math.floor((mx - pad.l) / slot);
      if (cl < 0 || cl >= m) { tip.style.display = 'none'; return; }
      tip.style.display = 'block';
      tip.style.left = Math.min(xOf(cl), W - 90) + 'px';
      tip.style.top = (yOf(vals[cl]) - 30) + 'px';
      tip.textContent = `${visible[cl].day}: ${vals[cl].toFixed(1)} jam`;
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => {
      e.preventDefault();
      showTip(e.touches[0].clientX, canvas.getBoundingClientRect());
    };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [visible, currentMonthAbbr, expanded, tick]);

  // Force canvas repaint after mount/expand so offsetWidth is correct
  useEffect(() => {
    const id = requestAnimationFrame(() => setTick(t => t + 1));
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  const hasNoData = visible.some((d) => (d.hrs ?? 0) === 0);

  return (
    <>
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-swatch" style={{ background: '#4488ff' }}></span>
          Downtime (jam)
        </div>
        {hasNoData && (
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(90,90,140,.5)' }}></span>
            Belum ada data
          </div>
        )}
      </div>

      <div className="axis-unit-label">Waktu (Jam)</div>
      <div className="trend-wrap" style={{ height: expanded ? Math.round(window.innerHeight * 0.45) : 130 }} ref={wrapRef}>
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
        {visible.map((d, i) => (
          <span key={i} style={d.day === currentMonthAbbr ? { color: '#4488ff', fontWeight: 700 } : undefined}>
            {d.day}
          </span>
        ))}
      </div>

      {zoom < 1 && (
        <button className="card-action" style={{ marginTop: 6 }}
          onClick={() => { setZoom(1); setPanStart(0); }}>
          Reset zoom
        </button>
      )}
    </>
  );
}

export default function DowntimeTrend({ days, year }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const fn = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [expanded]);

  const header = (
    <div className="card-header">
      <div>
        <div className="card-title">Tren Downtime {year}</div>
        <div className="card-sub">Arahkan kursor ke bar · scroll untuk zoom</div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="chart-expand" onClick={() => setExpanded(v => !v)}
          title={expanded ? 'Perkecil' : 'Perbesar grafik'}>
          {expanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
        </button>
      </div>
    </div>
  );

  if (expanded) {
    return (
      <>
        <div className="chart-expand-overlay" onClick={() => setExpanded(false)} />
        <div className="card chart-expand-modal">
          {header}
          <ChartCanvas days={days} year={year} expanded />
          <button className="chart-expand-close" onClick={() => setExpanded(false)} title="Tutup">
            <X size={16}/>
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="card">
      {header}
      <ChartCanvas days={days} year={year} expanded={false} />
    </div>
  );
}
