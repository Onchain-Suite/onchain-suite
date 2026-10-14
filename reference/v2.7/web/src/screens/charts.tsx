/* Result charts for Intelligence. The chart type is chosen from the shape of the result —
   a ranked comparison gets bars, a time series gets a line, a share-of-whole gets a donut —
   and the user can override. Rendered as inline SVG so they inherit theme tokens. */
export type ChartKind = 'bar' | 'line' | 'donut';
export type Point = { label: string; value: number };

/** Pick a sensible default for the data's shape (overridable in the UI). */
export function defaultChartKind(points: Point[], isTimeSeries: boolean): ChartKind {
  if (isTimeSeries) return 'line';
  const total = points.reduce((a, p) => a + p.value, 0);
  // A small set that sums to a meaningful whole reads best as a share.
  if (points.length <= 6 && total > 0 && points.every((p) => p.value / total < 0.9)) return 'bar';
  return 'bar';
}

const SERIES = ['var(--data-1)', 'var(--data-2)', 'var(--data-3)', 'var(--data-4)', 'var(--data-5)', 'var(--data-6)'];
const fmt = (n: number) => n.toLocaleString('en-US');

export function ResultChart({ kind, points }: { kind: ChartKind; points: Point[] }) {
  if (!points.length) return null;
  if (kind === 'donut') return <Donut points={points} />;
  if (kind === 'line') return <Line points={points} />;
  return <Bars points={points} />;
}

function Bars({ points }: { points: Point[] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="ibars" role="img" aria-label={`Bar chart: ${points.map((p) => `${p.label} ${fmt(p.value)}`).join(', ')}`}>
      {points.map((p) => (
        <div className="ibars__col" key={p.label}>
          <span className="ibars__val">{fmt(p.value)}</span>
          <div className="ibars__bar" style={{ height: `${(p.value / max) * 100}%` }} title={`${p.label}: ${fmt(p.value)}`} />
          <span className="ibars__lbl">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function Line({ points }: { points: Point[] }) {
  const w = 520, h = 170, pad = 26;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const x = (i: number) => pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / Math.max(max - min, 1)) * (h - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const area = `${d} L${x(points.length - 1)},${h - pad} L${x(0)},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={190} role="img"
      aria-label={`Line chart: ${points.map((p) => `${p.label} ${fmt(p.value)}`).join(', ')}`}>
      <path d={area} fill="var(--data-1)" opacity={0.12} />
      <path d={d} fill="none" stroke="var(--data-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--bg-surface)" stroke="var(--data-1)" strokeWidth={2} />
          <text x={x(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ points }: { points: Point[] }) {
  const total = points.reduce((a, p) => a + p.value, 0) || 1;
  const r = 62, thickness = 22, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
      <svg width={160} height={160} viewBox="0 0 160 160" role="img"
        aria-label={`Donut chart: ${points.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}`}>
        <g transform="rotate(-90 80 80)">
          {points.map((p, i) => {
            const frac = p.value / total;
            const dash = `${frac * c} ${c - frac * c}`;
            const el = <circle key={p.label} cx={80} cy={80} r={r} fill="none" stroke={SERIES[i % SERIES.length]}
              strokeWidth={thickness} strokeDasharray={dash} strokeDashoffset={-offset} />;
            offset += frac * c;
            return el;
          })}
        </g>
        <text x={80} y={76} textAnchor="middle" fontSize={20} fontWeight={600} fill="var(--text-primary)">{fmt(total)}</text>
        <text x={80} y={94} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)">total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {points.map((p, i) => (
          <span key={p.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: SERIES[i % SERIES.length], flexShrink: 0 }} />
            <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.label}</b>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(p.value)} · {Math.round((p.value / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
