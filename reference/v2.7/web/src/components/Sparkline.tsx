import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

/* The KPI sparkline, on Recharts (2.7).
 *
 * This was a hand-drawn polyline and it was the reason the Home page still looked untouched
 * after the charts were rebuilt: Home's charts are these, not the dashboard's. A bare stroke
 * next to shadcn-styled cards reads as an older screen.
 *
 * Same treatment as the full charts — a gradient from 0.8 to 0.1 and a natural curve — just
 * without axes, grid or legend, because at 40px tall none of those can be read. It keeps a
 * tooltip: a sparkline nobody can query is decoration, and the value is the thing the shape
 * is making you curious about.
 */
export function Sparkline({ points, color = 'var(--chart-1)', label = 'Value', height = 44 }: {
  points: number[]; color?: string; label?: string; height?: number;
}) {
  if (!points || points.length < 2) return null;
  const id = `spark-${label.replace(/[^a-z0-9]+/gi, '')}-${points.length}`;
  const rows = points.map((value, i) => ({ i, value }));

  return (
    <div style={{ height, marginTop: 8, marginInline: -4 }}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <Tooltip cursor={false} content={({ active, payload }) => (
            active && payload?.length ? (
              <div className="chart-tip">
                <div className="chart-tip__row is-dot">
                  <span className="chart-tip__ind chart-tip__ind--dot" style={{ background: color }} />
                  <div className="chart-tip__body">
                    <span className="chart-tip__name">{label}</span>
                    <span className="chart-tip__value">{Number(payload[0].value).toLocaleString('en-US')}</span>
                  </div>
                </div>
              </div>
            ) : null
          )} />
          <Area dataKey="value" type="natural" stroke={color} strokeWidth={1.5}
            fill={`url(#${id})`} fillOpacity={0.4} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
