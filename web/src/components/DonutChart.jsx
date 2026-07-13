import { useEffect, useRef } from 'react';

const COLORS = ['#f0a500', '#4488ff', '#a855f7', '#00d084', '#ff6b35', '#ff4455', '#00b8d9', '#8884d8'];

// Donut chart breakdown of the top causes/machines, paired with a colored
// legend (dot + label + % + count) so the proportions are readable at a
// glance, same idea as FusionSolar's device-share donut.
export default function DonutChart({ data, labelKey, valueKey = 'count', centerLabel = 'penyebab' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data?.length || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const size = canvas.parentElement.offsetWidth || 140;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const rOuter = size / 2 - 4, rInner = rOuter * 0.62;
    const total = data.reduce((s, d) => s + (d[valueKey] ?? 0), 0) || 1;

    let start = -Math.PI / 2;
    data.forEach((d, i) => {
      const slice = ((d[valueKey] ?? 0) / total) * Math.PI * 2;
      const end = start + slice;
      ctx.beginPath();
      ctx.arc(cx, cy, rOuter, start, end);
      ctx.arc(cx, cy, rInner, end, start, true);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      start = end;
    });

    const rootStyle = getComputedStyle(document.documentElement);
    ctx.fillStyle = rootStyle.getPropertyValue('--text');
    ctx.font = '700 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(data.length), cx, cy - 6);
    ctx.font = '500 8px Inter, sans-serif';
    ctx.fillStyle = rootStyle.getPropertyValue('--muted');
    ctx.fillText(centerLabel, cx, cy + 9);
  }, [data, labelKey, valueKey, centerLabel]);

  if (!data?.length) return null;

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 }}>
      <div style={{ width: 100, height: 100, flexShrink: 0 }}>
        <canvas ref={canvasRef}></canvas>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
        {data.slice(0, 5).map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }}></span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{d[labelKey]}</span>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
