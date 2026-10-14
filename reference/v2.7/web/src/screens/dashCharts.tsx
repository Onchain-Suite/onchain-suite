/* The dashboard's charts, on Recharts via the shadcn primitives (2.7).
 *
 * These were hand-drawn SVG: correct, but every capability had to be built by hand, and the
 * list of things they still could not do was getting longer than the list they could — pie,
 * radar, radial, stacked areas, curve interpolation, animated transitions between ranges.
 * Recharts does all of that, and shadcn's layer keeps it looking like this product rather than
 * like a library demo.
 *
 * The props are deliberately unchanged, so nothing that renders a chart had to be touched. The
 * behaviour that was ours stays ours too: the legend filters, and the range control belongs to
 * the chart rather than the page.
 */
import { useMemo } from 'react';
import { Icon } from '../components/icons';
import {
  Area, AreaChart, Bar, BarChart as RBarChart, CartesianGrid, Cell, ComposedChart, Legend,
  Line, LineChart as RLineChart, Pie, PieChart as RPieChart, PolarAngleAxis, PolarGrid,
  LabelList, Radar, RadarChart as RRadarChart, RadialBar, RadialBarChart, ReferenceLine, XAxis, YAxis,
} from 'recharts';
import {
  ChartContainer, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '../components/chart';
import {
  RangePicker, bucketLabels, useChartState, useSeriesData, type RangeId, type Series,
} from './chartKit';

export type { Series } from './chartKit';

import './chart-frame.css';

const HEIGHT = 240;

export interface ChartProps {
  title: string;
  meta?: string;
  series: Series[];
  labels?: string[];
  bare?: boolean;
  unit?: string;
  defaultRange?: RangeId;
  /** Categories rather than time — no range control, labels come from the caller. */
  categorical?: boolean;
  startOff?: string[];
}

/** One key per series, so --color-<key> and the tooltip labels line up. */
const keyOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

function useChartData(p: ChartProps) {
  /* startOff is given as series names, but the state is keyed the way the config is — slugged,
     so --color-<key> and the dataKey agree. Translating here rather than making callers know
     about slugs keeps "start with the channels hidden" readable at the call site. */
  const st = useChartState(p.defaultRange ?? '30d', (p.startOff ?? []).map(keyOf));
  const ranged = useSeriesData(p.series, st.range);
  const data = p.categorical ? p.series : ranged;
  // Memoised because the row builder depends on it; a fresh array each render rebuilds every row.
  const ticks = useMemo(
    () => (p.categorical ? (p.labels ?? []) : bucketLabels(st.range)),
    [p.categorical, p.labels, st.range],
  );

  const config: ChartConfig = useMemo(() => Object.fromEntries(
    data.map((s) => [keyOf(s.name), { label: s.name, color: s.color }]),
  ), [data]);

  /* Recharts wants a row per bucket with a column per series; our data arrives the other way
     round, which is the shape that made the hand-drawn version easy and this the one place
     that has to translate. */
  const rows = useMemo(() => ticks.map((label, i) => {
    const row: Record<string, string | number> = { label: label.startsWith('·') ? '' : label };
    data.forEach((s) => { row[keyOf(s.name)] = s.points[i] ?? 0; });
    return row;
  }), [ticks, data]);

  const shown = data.filter((s) => !st.off.includes(keyOf(s.name)));
  return { ...st, data, shown, rows, config, ticks };
}

/* shadcn puts a trend line in the CardFooter — "Trending up by 5.2% this month" with an arrow,
   and the period underneath. It is the part that makes a chart read as a finished card rather
   than a plot dropped in a box, and it is computed here rather than written by hand. */
/* Only on time series. A categorical chart's first and last bar are Email and X, so a trend
   between them said "Direct down by 84.5% over this period" about two channels that were never
   in an order, let alone a chronological one. */
function Trend({ series, period }: { series: Series[]; period: string }) {
  const first = series[0];
  if (!first || first.points.length < 2) return null;
  const a = first.points[0];
  const b = first.points[first.points.length - 1];
  if (!a) return null;
  const pct = ((b - a) / Math.abs(a)) * 100;
  const up = pct >= 0;
  return (
    <div className="chart-foot">
      <div className="chart-foot__trend">
        {first.name} {up ? 'up' : 'down'} by {Math.abs(pct).toFixed(1)}% over this period
        <Icon name={up ? 'trending-up' : 'trending-down'} size={15} />
      </div>
      <div className="chart-foot__period">{period}</div>
    </div>
  );
}

function Shell({ title, meta, bare, range, onRange, children, footer }: {
  title: string; meta?: string; bare?: boolean;
  range?: RangeId; onRange?: (r: RangeId) => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const picker = range && onRange ? <RangePicker value={range} onChange={onRange} /> : null;
  if (bare) {
    return (
      <>
        {picker && <div className="ck__legrow"><span style={{ flex: 1 }} /><span className="ck__legrange">{picker}</span></div>}
        <div className="card__body" style={{ paddingTop: 0 }}>{children}</div>
      </>
    );
  }
  return (
    <div className="card">
      <div className="card__head">
        <h2>{title}</h2>
        {meta && <span className="m">{meta}</span>}
        {picker && <span style={{ marginLeft: 'auto' }}>{picker}</span>}
      </div>
      <div className="card__body">{children}</div>
      {footer}
    </div>
  );
}

export function LineChart(props: ChartProps & { area?: boolean; stacked?: boolean }) {
  const { title, meta, bare, unit, area, stacked, categorical } = props;
  const { range, setRange, shared, off, toggle, data, shown, rows, config, ticks } = useChartData(props);
  const names = data.map((s) => keyOf(s.name));
  /* A chart mixing filled bands with plain lines has to be a ComposedChart — AreaChart will
     not take a Line child. That combination exists because reachable value stacks (the parts
     sum to the total) while the per-channel series overlap each other, and stacking those
     would draw a total larger than the audience. */
  const hasLines = area && shown.some((s) => s.asLine);
  const Wrapper = hasLines ? ComposedChart : area ? AreaChart : RLineChart;

  return (
    <Shell title={title} meta={meta} bare={bare} range={categorical ? undefined : range} onRange={shared ? undefined : setRange}
      footer={bare || categorical ? null : <Trend series={shown} period={`${ticks[0]} – ${ticks[ticks.length - 1]}`} />}>
      <ChartContainer config={config} style={{ height: HEIGHT }}>
        <Wrapper accessibilityLayer data={rows} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          {/* No Y axis, which is shadcn's default and took some getting used to: the gridlines
              carry the scale, the tooltip carries the number, and dropping the axis gives the
              plot back the width it was spending on labels nobody reads precisely. */}
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} indicator="dot" />} />
          <Legend content={<ChartLegendContent off={off} onToggle={(k) => toggle(k, names)} hint="click to filter" />} />
          {area && (
            <defs>
              {shown.filter((s) => !s.asLine).map((s) => (
                <linearGradient key={s.name} id={`fill-${keyOf(s.name)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`var(--color-${keyOf(s.name)})`} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={`var(--color-${keyOf(s.name)})`} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
          )}
          {area ? shown.map((s) => (s.asLine ? (
            <Line key={s.name} dataKey={keyOf(s.name)} type="natural" dot={false}
              stroke={`var(--color-${keyOf(s.name)})`} strokeWidth={2} />
          ) : (
            <Area key={s.name} dataKey={keyOf(s.name)} type="natural"
              fill={`url(#fill-${keyOf(s.name)})`} fillOpacity={0.4}
              stroke={`var(--color-${keyOf(s.name)})`}
              stackId={stacked ? 'a' : undefined} />
          ))) : shown.map((s) => (
            <Line key={s.name} dataKey={keyOf(s.name)} type="natural" dot={false}
              stroke={`var(--color-${keyOf(s.name)})`} strokeWidth={2}
              strokeDasharray={s.dashed ? '5 4' : undefined} />
          ))}
        </Wrapper>
      </ChartContainer>
    </Shell>
  );
}

export function BarChart(props: ChartProps & { stacked?: boolean }) {
  const { title, meta, bare, unit, stacked, categorical } = props;
  const { range, setRange, shared, off, toggle, data, shown, rows, config, ticks } = useChartData(props);
  const names = data.map((s) => keyOf(s.name));

  return (
    <Shell title={title} meta={meta} bare={bare} range={categorical ? undefined : range} onRange={shared ? undefined : setRange}
      footer={bare || categorical ? null : <Trend series={shown} period={`${ticks[0]} – ${ticks[ticks.length - 1]}`} />}>
      <ChartContainer config={config} style={{ height: HEIGHT }}>
        <RBarChart accessibilityLayer data={rows} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} />} />
          <Legend content={<ChartLegendContent off={off} onToggle={(k) => toggle(k, names)} hint="click to filter" />} />
          {shown.map((s, i) => (
            <Bar key={s.name} dataKey={keyOf(s.name)} fill={`var(--color-${keyOf(s.name)})`}
              stackId={stacked ? 'a' : undefined} maxBarSize={64}
              /* radius 8, which is shadcn's — noticeably rounder than a chart library default,
                 and the single thing that makes their bars recognisable. Only the top of a
                 stack is capped, or every segment reads as detached. */
              radius={stacked ? (i === shown.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]) : 8} />
          ))}
        </RBarChart>
      </ChartContainer>
    </Shell>
  );
}

/* Horizontal bars, one colour per row — shadcn's "Bar Chart - Mixed" (2.7).
 *
 * The right shape for a short list of named quantities: the labels get a whole line each
 * instead of being crammed under a tick, and nothing has to be read at an angle. This replaces
 * the hand-rolled track-and-fill rows that several cards were using, which were the same chart
 * drawn worse and differently on each card.
 */
export function HBarChart({ title, meta, bare, unit, series, labels = [], mixed = true, footer, showValues, hints, legend, colors, valueLabel }: ChartProps & {
  /** A colour per row (a set of unrelated measures) rather than one for the series. */
  mixed?: boolean;
  footer?: React.ReactNode;
  /* Print the number at the end of the bar. Needed the moment a row is genuinely tiny: an
     unsubscribe rate of 0.4% next to an open rate of 42.3% is a hairline, which is the honest
     drawing and unreadable on its own. */
  showValues?: boolean;
  /* What each row actually measures, per label. A rate's denominator is not guessable from its
     name — clicks over delivered and clicks over opens are both "click-through rate" in email
     tooling — so the explanation has to travel with the row, not live in a paragraph. */
  hints?: Record<string, string>;
  /** What the colour means, when the bars are one colour rather than a colour each. */
  legend?: string;
  /** A colour per row, when the rows carry meaning of their own — lifecycle stages are the
   *  case: their colours are the product's, not the palette's running order. */
  colors?: string[];
  /* Dual-labelling: the absolute number and the thing that gives it meaning, printed on the
   * bar rather than hidden in a tooltip. A share or a step-to-step rate is what turns "1,204"
   * into something a reader can act on, and a number nobody can act on is decoration. */
  valueLabel?: (value: number, label: string) => string;
}) {
  const s0 = series[0];
  const rows = labels.map((label, i) => {
    const value = s0?.points[i] ?? 0;
    return {
      label,
      value,
      text: valueLabel ? valueLabel(value, label) : `${value.toLocaleString('en-US')}${unit ?? ''}`,
      fill: colors?.[i] ?? (mixed ? `var(--chart-${(i % 5) + 1})` : (s0?.color ?? 'var(--chart-1)')),
    };
  });
  const config: ChartConfig = Object.fromEntries(
    rows.map((r) => [keyOf(r.label), { label: r.label, color: r.fill }]),
  );
  // Long category names need real room; short ones should not leave a gutter.
  const widest = Math.max(...labels.map((l) => l.length), 8);
  return (
    <Shell title={title} meta={meta} bare={bare} footer={footer}>
      {legend && (
        <div className="legend" style={{ padding: '0 0 10px' }}>
          <span><i style={{ background: rows[0]?.fill }} />{legend}</span>
        </div>
      )}
      {/* A text equivalent of the rows, off-screen.
          Not only for screen readers: once the categories became SVG text inside a responsive
          container, they stopped existing at any width the container had not measured yet —
          including zero, which is what a chart is before layout and what it stays as under
          test. The names and their definitions belong in the document either way. */}
      <ul className="sr-only">
        {rows.map((r) => (
          <li key={r.label}>
            <span>{r.label}</span>
            <span>{r.text}</span>
            {hints?.[r.label] && <span aria-label={hints[r.label]}>{hints[r.label]}</span>}
          </li>
        ))}
      </ul>
      <ChartContainer config={config} style={{ height: Math.max(rows.length * 44, 140) }}>
        <RBarChart accessibilityLayer data={rows} layout="vertical"
          margin={{ left: 0, right: showValues ? (valueLabel ? 150 : 56) : 16 }}>
          <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tickMargin={10}
            width={Math.min(widest * 7.5, 190)} />
          <XAxis dataKey="value" type="number" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} nameKey="label" hideLabel />} />
          <Bar dataKey="value" radius={5}>
            {rows.map((r) => <Cell key={r.label} fill={r.fill} />)}
            {/* The printed text is computed into the row rather than formatted here:
                Recharts' label formatter is handed the value alone, so a label that needs its
                own row's name has nowhere to read it from. */}
            {showValues && (
              <LabelList dataKey="text" position="right" offset={8} className="hbar__val" />
            )}
          </Bar>
        </RBarChart>
      </ChartContainer>
    </Shell>
  );
}

/* Two series in different units on one plot, with the turning point marked.
 *
 * shadcn's line-multiple, plus a ReferenceLine — which is the whole reason this card exists.
 * The point is not either curve on its own, it is where one stops paying for the other, and a
 * chart that makes you find that yourself has not said anything.
 */
export function PeakLineChart({ title, meta, bare, series, labels = [], peakAt, peakLabel, footer, unit }: ChartProps & {
  peakAt?: number; peakLabel?: string; footer?: React.ReactNode;
}) {
  const rows = labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    series.forEach((s) => { row[keyOf(s.name)] = s.points[i] ?? 0; });
    return row;
  });
  const config: ChartConfig = Object.fromEntries(series.map((s) => [keyOf(s.name), { label: s.name, color: s.color }]));
  return (
    <Shell title={title} meta={meta} bare={bare} footer={footer}>
      <ChartContainer config={config} style={{ height: HEIGHT }}>
        <RLineChart accessibilityLayer data={rows} margin={{ left: 12, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} indicator="line" />} />
          <Legend content={<ChartLegendContent />} />
          {peakAt != null && (
            <ReferenceLine x={labels[peakAt]} stroke="var(--text-tertiary)" strokeDasharray="4 4"
              label={{ value: peakLabel, position: 'top', fill: 'var(--text-tertiary)', fontSize: 11 }} />
          )}
          {series.map((s) => (
            <Line key={s.name} dataKey={keyOf(s.name)} type="natural" strokeWidth={2}
              stroke={`var(--color-${keyOf(s.name)})`} dot={false}
              activeDot={{ r: 4 }} />
          ))}
        </RLineChart>
      </ChartContainer>
    </Shell>
  );
}

/* ---- The three shapes the hand-drawn version could not do ---- */

/** Pie or donut. One series, sliced by category. */
export function PieChart({ title, meta, bare, unit, series, labels = [], donut }: ChartProps & { donut?: boolean }) {
  const s = series[0];
  const rows = labels.map((label, i) => ({ label, value: s?.points[i] ?? 0, fill: `var(--chart-${(i % 5) + 1})` }));
  const config: ChartConfig = Object.fromEntries(
    rows.map((r, i) => [keyOf(r.label), { label: r.label, color: `var(--chart-${(i % 5) + 1})` }]),
  );
  return (
    <Shell title={title} meta={meta} bare={bare}>
      <ChartContainer config={config} style={{ height: HEIGHT }}>
        <RPieChart>
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} nameKey="label" hideLabel />} />
          <Pie data={rows} dataKey="value" nameKey="label" innerRadius={donut ? 58 : 0} strokeWidth={4}>
            {rows.map((r) => <Cell key={r.label} fill={r.fill} />)}
          </Pie>
          <Legend content={<ChartLegendContent nameKey="label" />} />
        </RPieChart>
      </ChartContainer>
    </Shell>
  );
}

/** Radar. Every series on the same axes — for comparing shapes, not sizes. */
export function RadarChart({ title, meta, bare, unit, series, labels = [] }: ChartProps) {
  const rows = labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    series.forEach((s) => { row[keyOf(s.name)] = s.points[i] ?? 0; });
    return row;
  });
  const config: ChartConfig = Object.fromEntries(series.map((s) => [keyOf(s.name), { label: s.name, color: s.color }]));
  return (
    <Shell title={title} meta={meta} bare={bare}>
      <ChartContainer config={config} style={{ height: HEIGHT }}>
        <RRadarChart data={rows}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} indicator="line" />} />
          <PolarGrid />
          <PolarAngleAxis dataKey="label" />
          {series.map((s) => (
            <Radar key={s.name} dataKey={keyOf(s.name)} fill={`var(--color-${keyOf(s.name)})`}
              fillOpacity={0.45} stroke={`var(--color-${keyOf(s.name)})`} />
          ))}
          <Legend content={<ChartLegendContent />} />
        </RRadarChart>
      </ChartContainer>
    </Shell>
  );
}

/** Radial. Categories as arcs — reads as a share of something, so it suits rates. */
export function RadialChart({ title, meta, bare, unit, series, labels = [] }: ChartProps) {
  const s = series[0];
  const rows = labels.map((label, i) => ({ label, value: s?.points[i] ?? 0, fill: `var(--chart-${(i % 5) + 1})` }));
  const config: ChartConfig = Object.fromEntries(
    rows.map((r, i) => [keyOf(r.label), { label: r.label, color: `var(--chart-${(i % 5) + 1})` }]),
  );
  return (
    <Shell title={title} meta={meta} bare={bare}>
      <ChartContainer config={config} style={{ height: HEIGHT }}>
        <RadialBarChart data={rows} innerRadius={30} outerRadius={110} startAngle={90} endAngle={-270}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent unit={unit} nameKey="label" hideLabel />} />
          <RadialBar dataKey="value" background cornerRadius={5}>
            {rows.map((r) => <Cell key={r.label} fill={r.fill} />)}
          </RadialBar>
          <Legend content={<ChartLegendContent nameKey="label" />} />
        </RadialBarChart>
      </ChartContainer>
    </Shell>
  );
}
