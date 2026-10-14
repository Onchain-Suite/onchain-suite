import { useMemo } from 'react';
import { Icon } from '../components/icons';
import { useMeasure } from './useMeasure';
import { LineChart, PeakLineChart } from './dashCharts';
import { Tooltip } from '../components/ui';
import { Sankey } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../components/chart';
import { stageMeta } from '../data/lifecycle';
import {
  CAMPAIGN_FUNNEL, DELAY_BUCKETS, FATIGUE, cohortGrid, efficiency, fatigueKnee,
  lifecycleFlow, reachableBands, reachableValue, windowCoverage, type FunnelStep,
} from '../data/retentionAnalysis';
import { ATTRIBUTION, windowLabel } from '../data/attribution';

/* ---------------- Cohort retention grid ---------------- */

export function CohortGrid() {
  const rows = useMemo(() => cohortGrid(), []);
  const cols = rows.length;
  /* Blue at 100, fading to nothing — one hue, so the eye reads the triangle's shape rather
     than hunting for which colour means what. A diverging scale would imply a midpoint that
     retention does not have. */
  const shade = (v: number) => `color-mix(in srgb, var(--action-primary) ${Math.round(v * 0.85)}%, transparent)`;
  const ink = (v: number) => (v > 55 ? '#fff' : 'var(--text-secondary)');

  return (
    <div className="card">
      <div className="card__head">
        <h2>Cohort retention</h2>
        <span className="m">Wallets still active, by week they arrived</span>
        <span style={{ marginLeft: 'auto' }}>
          <Tooltip content="Each row is everyone who arrived that week. Reading across shows how many were still active 1, 2, 3 weeks later. Reading down a column compares cohorts at the same age. That is where a change in onboarding shows up. Shape is modelled from the audience's current stage mix.">
            <Icon name="info" size={14} color="var(--text-tertiary)" />
          </Tooltip>
        </span>
      </div>
      <div className="card__body" style={{ overflowX: 'auto' }}>
        <table className="cohort">
          <thead>
            <tr>
              <th scope="col">Arrived</th>
              <th scope="col" className="cohort__n">Wallets</th>
              {Array.from({ length: cols }, (_, i) => <th key={i} scope="col">{i === 0 ? 'Week 0' : `+${i}`}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td className="cohort__n">{r.size}</td>
                {r.cells.map((v, i) => (
                  <td key={i} className="cohort__c">
                    {v === null
                      ? <span className="cohort__future" aria-label="not yet reached" />
                      : <span style={{ background: shade(v), color: ink(v) }}>{v.toFixed(0)}%</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Lifecycle flow ---------------- */


/* Stage movement, as a Sankey (2.7).
 *
 * This was a hand-drawn pair of columns with bezier bands between them — correct, and a second
 * implementation of the thing the campaign funnel already does. One idiom for "things moving
 * between states" is worth more than two that look slightly different, and this one now goes
 * through the same Recharts chart and the same shadcn container as every other chart here.
 *
 * Nodes are suffixed "was"/"now" because a Sankey needs distinct nodes per side: a wallet that
 * went Engaged → Dormant and one that went Dormant → Engaged would otherwise land on the same
 * node and the graph would draw a loop nobody made. */
function FlowNode({ x, y, width, height, payload, containerWidth }: SankeyNodeProps) {
  const flip = x + width + 110 > containerWidth;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="2" fill={payload.fill ?? 'var(--chart-2)'} />
      <text x={flip ? x - 8 : x + width + 8} y={y + height / 2 + 4}
        textAnchor={flip ? 'end' : 'start'} className="fnl__node">{payload.name}</text>
    </g>
  );
}

const TONE_FILL: Record<string, string> = {
  good: 'var(--green-500)', bad: 'var(--red-500)', warn: 'var(--orange-400)', new: 'var(--sky-500)',
};

export function LifecycleFlow() {
  const flow = useMemo(() => lifecycleFlow(), []);
  const graph = useMemo(() => {
    const froms = [...new Set(flow.links.map((l) => l.from))];
    const tos = [...new Set(flow.links.map((l) => l.to))];
    const nodes = [
      ...froms.map((id) => ({ name: `${stageMeta(id).label} was`, fill: 'var(--text-tertiary)' })),
      ...tos.map((id) => ({ name: `${stageMeta(id).label} now`, fill: TONE_FILL[stageMeta(id).tone] ?? 'var(--sky-500)' })),
    ];
    const links = flow.links.map((l) => ({
      source: froms.indexOf(l.from),
      target: froms.length + tos.indexOf(l.to),
      value: l.count,
    }));
    return { nodes, links };
  }, [flow]);

  if (flow.links.length === 0) return null;

  return (
    <div className="card">
      <div className="card__head">
        <h2>Where wallets moved this week</h2>
        <span className="m">{flow.moved} moved · {flow.stayed} stayed put</span>
      </div>
      <div className="card__body">
        <ChartContainer config={FLOW_CONFIG} style={{ height: 260 }}>
          <Sankey data={graph} nodeWidth={12} nodePadding={24}
            margin={{ left: 10, right: 110, top: 10, bottom: 10 }}
            node={FlowNode as unknown as React.ReactElement}
            link={{ stroke: 'var(--chart-2)', strokeOpacity: 0.2 }}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent unit=" wallets" hideLabel />} />
          </Sankey>
        </ChartContainer>
      </div>
    </div>
  );
}

const FLOW_CONFIG: ChartConfig = {
  moved: { label: 'Wallets moved', color: 'var(--chart-2)' },
};

/* ---------------- Funnel ---------------- */

/* The funnel, as a Sankey (2.7).
 *
 * It was horizontal bars, which show who survived each step and leave the loss as whitespace —
 * and the loss is the entire question. Recharts also ships a Funnel component that draws the
 * classic tapering trapezoid; that is worse, not better. It encodes one number as a 2-D
 * tapering area, so a step that halves looks like it quartered. It photographs well and reads
 * badly.
 *
 * A Sankey makes the drop-off a visible stream with the same weight as the survivors: at every
 * stage you see the flow split, and the biggest leak is the fattest band rather than the
 * largest gap. It is also the idiom already used for lifecycle movement on the Retention tab,
 * so the page has one way of drawing "things moving between states" instead of two.
 */
interface SankeyNodeProps {
  x: number; y: number; width: number; height: number;
  index: number; payload: { name: string; value: number; lost?: boolean; fill?: string };
  containerWidth: number;
}

function FunnelNode({ x, y, width, height, payload, containerWidth }: SankeyNodeProps) {
  const lost = payload.lost;
  // Labels flip to the inside near the right edge rather than running off the card.
  const flip = x + width + 120 > containerWidth;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="2"
        fill={lost ? 'var(--neutral-400)' : 'var(--chart-2)'} />
      <text x={flip ? x - 8 : x + width + 8} y={y + height / 2 - 3}
        textAnchor={flip ? 'end' : 'start'} className="fnl__node">{payload.name}</text>
      <text x={flip ? x - 8 : x + width + 8} y={y + height / 2 + 11}
        textAnchor={flip ? 'end' : 'start'} className="fnl__nodev">
        {payload.value.toLocaleString('en-US')}
      </text>
    </g>
  );
}

const FUNNEL_CONFIG: ChartConfig = {
  carried: { label: 'Carried on', color: 'var(--chart-2)' },
  lost: { label: 'Lost here', color: 'var(--neutral-400)' },
};

export function Funnel({ title, meta, steps }: { title: string; meta?: string; steps: FunnelStep[] }) {
  const top = steps[0].value;
  const drops = steps.slice(1).map((s, i) => ({ from: steps[i], to: s, lost: steps[i].value - s.value }));
  const worst = drops.reduce((a, b) => (b.lost > a.lost ? b : a), drops[0]);

  /* Nodes are the steps plus one "lost" node per stage, so every wallet that entered is
     accounted for somewhere on the diagram rather than silently disappearing. */
  const nodes = [
    ...steps.map((s) => ({ name: s.name, lost: false })),
    ...drops.map((d) => ({ name: `Lost after ${d.from.name.toLowerCase()}`, lost: true })),
  ];
  const links = drops.flatMap((d, i) => [
    { source: i, target: i + 1, value: d.to.value },
    { source: i, target: steps.length + i, value: d.lost },
  ]);

  return (
    <div className="card">
      <div className="card__head">
        <h2>{title}</h2>
        {meta && <span className="m">{meta}</span>}
        <span style={{ marginLeft: 'auto' }}>
          <Tooltip content="Every wallet that was reached ends up somewhere on this diagram: carried to the next step, or on a lost branch. The fattest grey band is the step costing you the most.">
            <Icon name="info" size={14} color="var(--text-tertiary)" />
          </Tooltip>
        </span>
      </div>
      <div className="card__body">
        {/* Through the shadcn container like every other chart here, so the tooltip, the
            fonts and the colour tokens are the page's rather than Recharts' defaults. There
            is no shadcn Sankey — this is the closest thing to one: their wrapper around the
            Recharts chart it does have. */}
        <ChartContainer config={FUNNEL_CONFIG} style={{ height: 300 }}>
          <Sankey
            data={{ nodes, links }}
            nodeWidth={12}
            nodePadding={26}
            margin={{ left: 10, right: 128, top: 10, bottom: 10 }}
            node={FunnelNode as unknown as React.ReactElement}
            link={{ stroke: 'var(--chart-2)', strokeOpacity: 0.18 }}
          >
            <ChartTooltip cursor={false} content={<ChartTooltipContent unit=" wallets" hideLabel />} />
          </Sankey>
        </ChartContainer>
        <p className="fnl__worst">
          <Icon name="triangle-alert" size={14} />
          <span>
            Biggest drop-off: <b>{worst.from.name} to {worst.to.name}</b>, {worst.lost.toLocaleString('en-US')} wallets
            lost: {Math.round((worst.lost / top) * 100)}% of everyone reached.
          </span>
        </p>
      </div>
    </div>
  );
}

export const CampaignFunnel = () => (
  <Funnel title="Campaign funnel" meta="Every channel, last 30 days" steps={CAMPAIGN_FUNNEL} />
);

/* ---------------- Reachable value ---------------- */

/* The card is now the headline and the chart, and nothing else.
 *
 * It used to carry a sentence about the gap, a four-up strip of per-channel figures, and a
 * callout about unreachable whales — every one of which was a number you could not get from
 * the picture, written out because the picture would not give it to you. The picture gives it
 * to you now: the channels are series you can switch on, and pointing at any week reads out
 * every one of them. */
const CHANNEL_COLORS: Record<string, string> = {
  Reachable: 'var(--chart-2)',
  // Absence, not a second brand colour: a neutral band lets the reachable part carry the eye.
  'Out of reach': 'var(--neutral-400)',
  Email: 'var(--chart-2)',
  'In-app push': 'var(--chart-3)',
  X: 'var(--red-500)',
};

export function ReachableValueCard() {
  const v = useMemo(() => reachableValue(), []);
  const series = useMemo(() => reachableBands().map((b) => ({
    name: b.name,
    color: CHANNEL_COLORS[b.name] ?? 'var(--text-tertiary)',
    points: b.points,
    asLine: b.asLine,
  })), []);

  return (
    <div className="card">
      <div className="card__head">
        <h2>Reachable value</h2>
        <span className="rv__pct">{v.pct}%</span>
        <span className="m">of {v.totalEth.toLocaleString('en-US')} ETH</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Tooltip content="Measured against every holder we index, not the contacts you already hold. Channels are separate lines, not a stack. A wallet with an email and a device is in both.">
            <Icon name="info" size={14} color="var(--text-tertiary)" />
          </Tooltip>
        </span>
      </div>
      <LineChart title="Reachable value" series={series} area stacked unit=" ETH" bare
        startOff={['Email', 'In-app push', 'X']} />
    </div>
  );
}

/* ---------------- Fatigue ---------------- */

export function FatigueCard() {
  const knee = fatigueKnee();
  const at = FATIGUE.indexOf(knee);
  return (
    <PeakLineChart
      title="Sending frequency vs. what it costs"
      meta="Per wallet, per week"
      unit="%"
      labels={FATIGUE.map((p) => String(p.perWeek))}
      series={[
        { name: 'Conversion rate', color: 'var(--chart-1)', points: FATIGUE.map((p) => p.convPct) },
        { name: 'Unsubscribe rate', color: 'var(--red-500)', points: FATIGUE.map((p) => p.unsubPct) },
      ]}
      peakAt={at}
      peakLabel="peak"
      footer={(
        <p className="chart-foot">
          <span className="chart-foot__trend">
            Conversion peaks at {knee.perWeek} a week; past that both lines move against you.
          </span>
          <span className="chart-foot__period">Modelled. It needs frequency history we do not hold yet.</span>
        </p>
      )}
    />
  );
}

/* ---------------- Attribution windows ---------------- */

/* Windows on a time axis, with the evidence behind them (2.7).
 *
 * This was two cards: a bar chart of how long people take to act, and a four-row table of the
 * windows. Both describe one thing — where on the clock we stop calling a conversion ours —
 * and separating them meant the reader had to hold four numbers in their head to check the
 * windows against the distribution. Drawn on a shared axis the comparison is just looking.
 *
 * The axis is logarithmic because the data is: the interesting decisions are at 15 minutes
 * and at 4 hours, and a linear axis spends nine tenths of its width on the flat tail past a
 * day. Each channel's bar is solid to its direct cutoff and pale to its influenced one, so
 * the visible dark portion is literally the share of conversions it claims.
 */
const AXIS_MIN = 5, AXIS_MAX = 10_080;
const TICKS = [
  { m: 15, l: '15m' }, { m: 60, l: '1h' }, { m: 240, l: '4h' },
  { m: 1440, l: '24h' }, { m: 4320, l: '3d' }, { m: 10_080, l: '7d' },
];

export function AttributionWindows() {
  /* Three horizontal bands, kept apart so nothing overlaps: axis labels, then the cumulative
     curve, then one row per channel. The first version floated a caption across the axis and
     it landed on top of the 15m and 1h ticks — the two labels that matter most here. */
  const [ref, measured] = useMeasure<HTMLDivElement>();
  const W = Math.max(measured, 360), PL = 108, PR = 76;
  const AXIS_Y = 14, CURVE_TOP = 26, CURVE_H = 40, ROWS_Y = CURVE_TOP + CURVE_H + 22, ROW = 46;
  const rows = ATTRIBUTION.length;
  const H = ROWS_Y + rows * ROW;
  const pw = W - PL - PR;
  const lg = (m: number) => Math.log(Math.max(m, AXIS_MIN));
  const x = (m: number) => PL + ((lg(m) - lg(AXIS_MIN)) / (lg(AXIS_MAX) - lg(AXIS_MIN))) * pw;

  let acc = 0;
  const cume = DELAY_BUCKETS.map((b) => { acc += b.share; return { m: b.minutes, pct: acc }; });
  const curveY = (pct: number) => CURVE_TOP + CURVE_H - (pct / 100) * CURVE_H;
  const ribbon = [
    `${PL},${CURVE_TOP + CURVE_H}`,
    ...cume.map((c) => `${x(c.m)},${curveY(c.pct)}`),
    `${x(AXIS_MAX)},${CURVE_TOP + CURVE_H}`,
  ];

  return (
    <div className="card">
      <div className="card__head">
        <h2>Attribution windows</h2>
        <span className="m">How long a message keeps the credit</span>
        <span style={{ marginLeft: 'auto' }}>
          <Tooltip content="Solid is the direct window. A conversion inside it is credited to that message. Pale runs to the influenced cutoff, where it still counts but as weaker evidence. The curve above is when conversions actually land, so the solid bar's end shows what share each window catches.">
            <Icon name="info" size={14} color="var(--text-tertiary)" />
          </Tooltip>
        </span>
      </div>
      <div className="card__body" ref={ref}>
        {measured > 0 && <svg className="aw" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={ATTRIBUTION.map((a) => `${a.label}: direct ${windowLabel(a.directMinutes)}, influenced ${a.influencedHours} hours, catching ${windowCoverage(a.channel)} per cent of conversions`).join('. ')}>
          {TICKS.map((t) => (
            <g key={t.m}>
              <line x1={x(t.m)} x2={x(t.m)} y1={CURVE_TOP - 4} y2={H - 14} stroke="var(--border-subtle)" shapeRendering="crispEdges" />
              <text x={x(t.m)} y={AXIS_Y} textAnchor="middle" className="dchart__tick">{t.l}</text>
            </g>
          ))}

          <polygon points={ribbon.join(' ')} fill="var(--action-primary)" fillOpacity="0.12" />
          <polyline points={cume.map((c) => `${x(c.m)},${curveY(c.pct)}`).join(' ')}
            fill="none" stroke="var(--action-primary)" strokeOpacity="0.5" strokeWidth="1.5" />
          <text x={PL - 12} y={CURVE_TOP + 12} textAnchor="end" className="aw__cap">% of conversions</text>
          <text x={PL - 12} y={CURVE_TOP + 25} textAnchor="end" className="aw__cap">landed by then</text>

          {ATTRIBUTION.map((a, i) => {
            const y = ROWS_Y + i * ROW;
            const cov = windowCoverage(a.channel);
            return (
              <g key={a.channel}>
                <text x={PL - 12} y={y + 12} textAnchor="end" className="aw__ch">{a.label}</text>
                <text x={PL - 12} y={y + 26} textAnchor="end" className="aw__sub">after {a.trigger}</text>
                <rect x={x(AXIS_MIN)} y={y} width={x(a.influencedHours * 60) - x(AXIS_MIN)} height={18} rx="3"
                  fill="var(--action-primary)" fillOpacity="0.16">
                  <title>{`Influenced up to ${a.influencedHours}h`}</title>
                </rect>
                <rect x={x(AXIS_MIN)} y={y} width={x(a.directMinutes) - x(AXIS_MIN)} height={18} rx="3"
                  fill="var(--action-primary)">
                  <title>{`Direct within ${windowLabel(a.directMinutes)}: catches ${cov}% of conversions`}</title>
                </rect>
                <text x={x(a.directMinutes) + 7} y={y + 13} className="aw__win">{windowLabel(a.directMinutes)}</text>
                <text x={W - PR + 12} y={y + 13} className="aw__cov">{cov}% direct</text>
                <text x={x(a.influencedHours * 60) - 6} y={y + 13} textAnchor="end" className="aw__inf">{a.influencedHours}h</text>
              </g>
            );
          })}
        </svg>}
      </div>
    </div>
  );
}

/* ---------------- Efficiency ---------------- */

export function EfficiencyStrip() {
  const e = useMemo(() => efficiency(), []);
  return (
    <div className="effstrip">
      <div>
        <span>Messages per wallet brought back</span>
        <b>{e.perWallet.toLocaleString('en-US')}</b>
        <span>{e.messages.toLocaleString('en-US')} sent · {e.reactivated.toLocaleString('en-US')} reactivated</span>
      </div>
      <div>
        {/* Named for what it computes. It read "ETH moved per 1,000 messages", which is a
            claim of attribution — the numerator is the whole audience's lifetime ETH, and
            nothing about it is caused by a message. A customer could have taken that ratio
            to their CFO. */}
        <span>Audience lifetime value</span>
        <b>{e.ethPerK.toLocaleString('en-US')}</b>
        <span>ETH per 1,000 messages sent · not attributed to those messages</span>
      </div>
    </div>
  );
}
