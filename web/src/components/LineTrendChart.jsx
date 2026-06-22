import { useEffect, useRef } from 'react';

// Generic line-graph card with an optional dashed "target" reference line.
// Used for MTBF and MTTR trend charts (each gets its own card/instance).
export default function LineTrendChart({ title, sub, data, valueKey, color, unit, target, targetLabel }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!data?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.parentElement.offsetWidth || 360;
    canvas.width = W; canvas.height = 110;
    const ctx = canvas.getContext('2d');
    const pad = { t: 10, b: 4, l: 4, r: 4 }, iW = W - pad.l - pad.r, iH = 110 - pad.t - pad.b;
    const vals = data.map((d) => d[valueKey] ?? 0);
    const maxV = Math.max(...vals, target || 0, 1) * 1.15;
    const n = data.length;
    const xOf = (i) => pad.l + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;

    ctx.clearRect(0, 0, W, 110);
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(150,150,170,.12)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // target dashed line -- bright/warm color so it reads clearly against
    // both the cool data line and the dark/light card background
    if (target) {
      const ty = yOf(target);
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(pad.l, ty); ctx.lineTo(W - pad.r, ty);
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = '#ff6b35';
      ctx.fillText(`Target ${target}`, pad.l + 2, Math.max(10, ty - 4));
    }

    // gradient fill under the line
    const g = ctx.createLinearGradient(0, pad.t, 0, 110);
    g.addColorStop(0, color + '4d'); g.addColorStop(1, color + '00');
    ctx.beginPath(); ctx.moveTo(xOf(0), 110);
    for (let i = 0; i < n; i++) {
      if (i === 0) ctx.lineTo(xOf(0), yOf(vals[0]));
      else { const cx = (xOf(i) + xOf(i - 1)) / 2; ctx.bezierCurveTo(cx, yOf(vals[i - 1]), cx, yOf(vals[i]), xOf(i), yOf(vals[i])); }
    }
    ctx.lineTo(xOf(n - 1), 110); ctx.closePath(); ctx.fillStyle = g; ctx.fill();

    // line itself
    ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      if (i === 0) ctx.moveTo(xOf(0), yOf(vals[0]));
      else { const cx = (xOf(i) + xOf(i - 1)) / 2; ctx.bezierCurveTo(cx, yOf(vals[i - 1]), cx, yOf(vals[i]), xOf(i), yOf(vals[i])); }
    }
    ctx.stroke();
    vals.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(xOf(i), yOf(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.strokeStyle = 'var(--bg)'; ctx.lineWidth = 1; ctx.stroke();
    });

    const tip = tipRef.current;
    const showTip = (clientX, rect) => {
      const mx = (clientX - rect.left) * (W / rect.width);
      let cl = 0, mn = 999;
      vals.forEach((_, i) => { const d = Math.abs(mx - xOf(i)); if (d < mn) { mn = d; cl = i; } });
      if (mn < 36) {
        tip.style.display = 'block';
        tip.style.left = Math.min(xOf(cl), W - 80) + 'px';
        tip.style.top = (yOf(vals[cl]) - 30) + 'px';
        tip.textContent = `${data[cl].day}: ${vals[cl].toFixed(1)} ${unit}`;
      } else tip.style.display = 'none';
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => { e.preventDefault(); const t = e.touches[0]; showTip(t.clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [data, valueKey, color, unit, target]);

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">{title}</div><div className="card-sub">{sub}{target ? ` · target garis putus-putus: ${targetLabel}` : ''}</div></div>
      </div>
      <div className="trend-wrap"><canvas ref={canvasRef}></canvas><div className="trend-tooltip" ref={tipRef}></div></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 5, fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
        {(data || []).map((d, i) => <span key={i}>{d.day}</span>)}
      </div>
    </div>
  );
}
