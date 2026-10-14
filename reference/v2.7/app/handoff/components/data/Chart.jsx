import React from 'react';

/** Lightweight SVG chart (line · area · bar) driven entirely by design tokens.
    Analytics-grade defaults: tabular axis labels, 1px grid, categorical data palette,
    animate-once-on-mount. No external charting dependency. */
export function Chart({
  type = 'line',
  series = [],
  labels = [],
  height = 220,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  maxY,
  yFormat,
  animate = true,
  style,
  className,
}) {
  const wrapRef = React.useRef(null);
  const [w, setW] = React.useState(640);
  const [shown, setShown] = React.useState(!animate);
  React.useEffect(() => {
    const el = wrapRef.current;
    if (el) {
      const ro = new ResizeObserver((entries) => { for (const e of entries) setW(e.contentRect.width); });
      ro.observe(el);
      setW(el.clientWidth || 640);
      const t = setTimeout(() => setShown(true), 20);
      return () => { ro.disconnect(); clearTimeout(t); };
    }
  }, []);

  const palette = ['var(--data-1)', 'var(--data-2)', 'var(--data-3)', 'var(--data-4)', 'var(--data-5)', 'var(--data-6)', 'var(--data-7)', 'var(--data-8)'];
  const norm = series.map((s) => (Array.isArray(s) ? { data: s } : s));
  const padL = showYAxis ? 44 : 8;
  const padR = 8, padT = 10;
  const padB = showXAxis ? 28 : 8;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = Math.max(10, height - padT - padB);
  const allVals = norm.reduce((a, s) => a.concat(s.data), []).filter((v) => typeof v === 'number' && isFinite(v));
  const dataMax = maxY != null ? maxY : Math.max(1, ...allVals);
  const ticks = 4;
  const fmt = yFormat || ((v) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : String(v)));

  const n = Math.max(1, (labels.length || (norm[0] && norm[0].data.length) || 1));
  const xAt = (i) => padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v) => padT + innerH - (v / dataMax) * innerH;

  const gridLines = [];
  if (showGrid) {
    for (let t = 0; t <= ticks; t++) {
      const v = (dataMax / ticks) * t;
      const y = yAt(v);
      gridLines.push(
        <g key={t}>
          <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
          {showYAxis ? <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fontFamily="var(--font-mono)" fill="var(--chart-axis)">{fmt(v)}</text> : null}
        </g>
      );
    }
  }

  const barGroupW = innerW / n;
  const barW = Math.max(4, (barGroupW * 0.62) / Math.max(1, norm.length));

  return (
    <div ref={wrapRef} className={className} style={Object.assign({ width: '100%', fontFamily: 'var(--font-sans)' }, style)}>
      <svg width={w} height={height} role="img" aria-label="Chart">
        {gridLines}
        {type === 'bar'
          ? norm.map((s, si) => s.data.map((v, i) => {
              if (typeof v !== 'number' || !isFinite(v)) return null;
              const gx = padL + i * barGroupW + (barGroupW - barW * norm.length) / 2 + si * barW;
              const full = innerH * (v / dataMax);
              const h = shown ? full : 0;
              return <rect key={si + '-' + i} x={gx} y={padT + innerH - h} width={barW - 2} height={h} rx="2"
                fill={s.color || palette[si % palette.length]}
                style={{ transition: 'height 700ms var(--ease-emphasized), y 700ms var(--ease-emphasized)', transitionDelay: (i * 20) + 'ms' }} />;
            }))
          : norm.map((s, si) => {
              const color = s.color || palette[si % palette.length];
              const valid = s.data.every((v) => typeof v === 'number' && isFinite(v));
              if (!valid) return <g key={si}></g>;
              const pts = s.data.map((v, i) => [xAt(i), yAt(v)]);
              const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
              const area = line + ' L' + xAt(s.data.length - 1).toFixed(1) + ' ' + (padT + innerH) + ' L' + xAt(0).toFixed(1) + ' ' + (padT + innerH) + ' Z';
              return (
                <g key={si} style={{ opacity: shown ? 1 : 0, transition: 'opacity 500ms var(--ease-standard)' }}>
                  {type === 'area' ? <path d={area} fill={color} fillOpacity="0.12" /> : null}
                  <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={shown ? undefined : { strokeDasharray: 1200, strokeDashoffset: 1200 }} />
                  {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--bg-surface)" stroke={color} strokeWidth="2" />)}
                </g>
              );
            })}
        {showXAxis ? labels.map((l, i) => (
          <text key={i} x={xAt(i)} y={height - 8} textAnchor="middle" fontSize="11" fontFamily="var(--font-sans)" fill="var(--chart-axis)">{l}</text>
        )) : null}
      </svg>
    </div>
  );
}
