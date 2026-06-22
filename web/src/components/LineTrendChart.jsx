import { useEffect, useRef } from 'react';

// Combo chart: bars for the actual value, a line for the target, plus a
// small Excel-style data table underneath with the exact numbers per
// category (including a TOTAL column, shown with a divider before it).
export default function LineTrendChart({ title, sub, data, valueKey, targetKey, color, unit }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!data?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = canvas.parentElement.offsetWidth || 360;
    const H = 130;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pad = { t: 10, b: 4, l: 4, r: 4 }, iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
    const vals = data.map((d) => d[valueKey] ?? 0);
    const targets = data.map((d) => d[targetKey] ?? 0);
    const maxV = Math.max(...vals, ...targets, 1) * 1.15;
    const n = data.length;
    const slot = iW / n, barW = Math.max(2, slot * 0.5);
    const xOf = (i) => pad.l + i * slot + slot / 2;
    const barX = (i) => pad.l + i * slot + (slot - barW) / 2;
    const yOf = (v) => pad.t + (1 - v / maxV) * iH;
    const isTotal = data[n - 1]?.day === 'TOTAL';

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) {
      const y = pad.t + iH * (i / 3);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y);
      ctx.strokeStyle = 'rgba(150,150,170,.12)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // divider before the TOTAL column
    if (isTotal && n > 1) {
      const dx = pad.l + (n - 1) * slot;
      ctx.beginPath(); ctx.moveTo(dx, pad.t); ctx.lineTo(dx, pad.t + iH);
      ctx.strokeStyle = 'rgba(150,150,170,.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
      ctx.setLineDash([]);
    }

    // bars (actual value)
    vals.forEach((v, i) => {
      const x = barX(i), y = yOf(v), h = (pad.t + iH) - y;
      const r = Math.min(3, barW / 2);
      ctx.fillStyle = isTotal && i === n - 1 ? color : color + 'cc';
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
        tip.textContent = `${data[cl].day}: ${vals[cl].toFixed(1)} / target ${targets[cl].toFixed(1)} ${unit}`;
      } else tip.style.display = 'none';
    };
    canvas.onmousemove = (e) => showTip(e.clientX, canvas.getBoundingClientRect());
    canvas.onmouseleave = () => { tip.style.display = 'none'; };
    canvas.ontouchmove = (e) => { e.preventDefault(); const t = e.touches[0]; showTip(t.clientX, canvas.getBoundingClientRect()); };
    canvas.ontouchend = () => setTimeout(() => { tip.style.display = 'none'; }, 1500);
  }, [data, valueKey, targetKey, color, unit]);

  return (
    <div className="card">
      <div className="card-header">
        <div><div className="card-title">{title}</div><div className="card-sub">{sub}</div></div>
      </div>
      <div className="trend-wrap" style={{ height: 130 }}><canvas ref={canvasRef}></canvas><div className="trend-tooltip" ref={tipRef}></div></div>
      {data?.length > 0 && (
        <div className="combo-chart-table">
          <table>
            <thead>
              <tr>
                <th></th>
                {data.map((d, i) => <th key={i} className={d.day === 'TOTAL' ? 'col-total' : ''}>{d.day}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="row-label"><span className="legend-dot" style={{ background: color }}></span>{valueKey.toUpperCase()}</td>
                {data.map((d, i) => <td key={i} className={d.day === 'TOTAL' ? 'col-total' : ''}>{(d[valueKey] ?? 0).toFixed(1)}</td>)}
              </tr>
              <tr>
                <td className="row-label"><span className="legend-dot" style={{ background: '#ff6b35' }}></span>TARGET</td>
                {data.map((d, i) => <td key={i} className={d.day === 'TOTAL' ? 'col-total' : ''}>{(d[targetKey] ?? 0).toFixed(1)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
