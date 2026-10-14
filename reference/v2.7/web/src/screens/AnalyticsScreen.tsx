import { useEffect, useMemo, useState } from 'react';
import { SectionEmpty } from '../components/SectionEmpty';
import { useWorkspaceMode } from '../data/workspace';
import { PageHeader } from '../shell/Shell';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Input, Modal, NO_VALUE, Tooltip } from '../components/ui';
import { Icon } from '../components/icons';
import { toast } from '../components/toast';
import { CONTACTS } from '../data/store';
import { lifecycleFor, stageMeta } from '../data/lifecycle';
import { useX, useSender, usePushInstall } from '../data/store';
import { BarChart, HBarChart, LineChart } from './dashCharts';
import { ChartBuilder, ChartCard } from './ChartBuilder';
import {
  AttributionWindows, CampaignFunnel, CohortGrid, EfficiencyStrip, FatigueCard, LifecycleFlow, ReachableValueCard,
} from './retentionCharts';
import { newSpec, type ChartSpec } from '../data/chartBuilder';
import { LanesChart } from './LanesChart';
import { PublishDialog } from '../components/PublishDialog';
import { DashboardRange, RangePicker, type RangeId } from './chartKit';
import { usePersistedState } from '../data/persist';
import './analytics.css';
import { RANGE_FACTOR, TOTALS_30D } from '../data/workspaceTotals';

/* The dashboard, in sections (2.7).
 *
 * This screen was one long scroll called Analytics while the greeting-and-ask-bar page was
 * called Dashboard — backwards, since a dashboard is the thing with the numbers on it. The
 * rename comes with tabs, because five unrelated questions were stacked vertically and you
 * had to scroll past four of them to reach the one you came for.
 *
 * The tabs are the questions, in the order people ask them: how are we doing, did the
 * messages cause anything, are people reading them (and how many can we reach at all), and
 * are they staying. Reach had a tab of its own, Subscriptions, holding a single chart; it
 * reads as the last part of the engagement question, so it lives at the end of Engagement. */
const DASH_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'conversions', label: 'Conversions' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'retention', label: 'Retention' },
] as const;
type DashTab = typeof DASH_TABS[number]['id'];


/* Opt-in list growth, on Engagement: who you can actually reach (2.7).
 *
 * This was a table of current counts beside a chart of the same four numbers over time, so
 * the table said nothing the chart's right-hand edge did not. The chart stays, because the
 * question here is direction: X is an opt-in list with a hard ceiling,
 * and whether a ceiling is rising is what decides if the channel is worth having.
 *
 * The series are built from the live install state rather than from fixed demo numbers. A
 * chart that drew followers while Settings said the X app was never authorised
 * was not a cosmetic mismatch — the ceiling is the one number a campaign estimate caps
 * against, so the dashboard has to agree with it. An unconnected channel draws a flat zero,
 * which is the honest shape of having nobody.
 */
/** Fractions of today's total, oldest week first. Established lists grow gradually; a channel
 *  you switched on recently climbs from nothing, so the two get different shapes. */
const SHAPE_STEADY = [0.87, 0.89, 0.91, 0.93, 0.94, 0.96, 0.98, 1];
const SHAPE_NEW = [0, 0, 0, 0.21, 0.45, 0.64, 0.86, 1];

function ListGrowthChart() {
  const x = useX();
  const sender = useSender();
  const push = usePushInstall();
  const ramp = (now: number, shape: number[]) => shape.map((f) => Math.round(now * f));

  const series = [
    { name: 'Email addresses', color: 'var(--action-primary)', points: ramp(sender.status === 'verified' ? 4182 : 0, SHAPE_STEADY) },
    { name: 'Push devices', color: 'var(--sky-500)', points: ramp(push.status === 'connected' ? 5210 : 0, SHAPE_STEADY) },
    { name: 'X followers with a wallet', color: 'var(--orange-400)', points: ramp(x.reachableFollowers, SHAPE_NEW) },
  ];
  const none = series.every((ser) => ser.points[ser.points.length - 1] === 0);

  return (
    <div>
      <LineChart title="Opt-in list growth" meta="People you may message" series={series} area />
      {none && (
        <p className="attr__foot" style={{ marginTop: -8 }}>
          No channel connected yet, so there is nobody to message. Connect one in <b>Integrations → Channels</b>.
        </p>
      )}
    </div>
  );
}

/* Lifecycle stages (2.7).
 *
 * The view that was missing. Counts alone are a census and say nothing about direction —
 * 612 dormant wallets is the same number whether they arrived last week or have been there
 * all year. Movement is the story, so the two numbers pulled out are the ones that get
 * reported upward: how many came back, and how many started slipping. */
/* Lifecycle as one bar, not six (2.7).
 *
 * Six horizontal bars answered "how big is each stage" by making you compare six lengths
 * against an invisible baseline — which is the one thing bar charts are worst at when the
 * bars are on separate rows. But the question about lifecycle is never how big a stage is on
 * its own; it is what shape the audience is in. That is a composition, and a composition is
 * one bar.
 *
 * The stages have a natural order — STAGES carries it, as a position on a health axis — so
 * the segments run healthiest to most dormant left to right and the colour ramps with them.
 * The audience then reads as a spectrum you can see the mass sitting in, and a month later
 * you are looking at whether the weight has moved right.
 *
 * It also makes the card short, which is what lets the grid and the flow sit side by side
 * underneath it instead of below a screenful of rows.
 */
const STAGE_COLOR: Record<string, string> = {
  new: 'var(--sky-500)',
  activated: 'var(--action-primary)',
  engaged: 'var(--green-500)',
  reactivated: 'var(--green-600)',
  at_risk: 'var(--orange-400)',
  dormant: 'var(--red-500)',
};

/* Lifecycle, as aligned bars (2.7).
 *
 * This was one stacked proportion bar with a legend underneath. The objection to a tapering
 * funnel applies to it just as squarely: segments inside a single bar float at different
 * starting points, so comparing two of them means comparing lengths that share no baseline —
 * and a reader who wants "is Slipping bigger than New?" has to measure with their eyes. Bars
 * off one left edge answer that question in a glance.
 *
 * Dual-labelled, which is the part that matters: the count and the share of the audience on
 * the bar itself. The usual advice here is to label a step-to-step conversion rate, and that
 * is right for a funnel — but lifecycle stages are not steps. Every wallet sits in exactly
 * one of them, they are states rather than a sequence, and printing a "conversion" between
 * two states would invent a journey nobody took. The share is the honest second number.
 *
 * Where there is a real sequence, the sequence is drawn: movement between stages is the flow
 * diagram below, and the campaign funnel is a Sankey with its lost branches.
 */
function LifecycleCard() {
  const snap = useMemo(() => lifecycleFor(CONTACTS), []);

  const ordered = [...snap.counts]
    .sort((a, b) => stageMeta(a.stage).order - stageMeta(b.stage).order)
    .filter((c) => c.count > 0);
  const total = Math.max(snap.total, 1);
  const share = new Map(ordered.map((c) => [stageMeta(c.stage).label, Math.round((c.count / total) * 100)]));

  return (
    <div className="card">
      <div className="card__head">
        <h2>Lifecycle</h2>
        <span className="m">{snap.total.toLocaleString('en-US')} wallets, healthiest first</span>
        <span style={{ marginLeft: 'auto' }}>
          <Tooltip content="Every contact sits in exactly one stage. They are evaluated in order and the first match wins, so the stages always sum to the audience. Reactivated is a rule about the previous stage, not current behaviour.">
            <Icon name="info" size={14} color="var(--text-tertiary)" />
          </Tooltip>
        </span>
      </div>

      <div className="card__body">
        <div className="lc2__head">
          <div className="lc2__big">
            <b>{snap.reactivated}</b>
            <span>came back this week</span>
          </div>
          <div className="lc2__big lc2__big--warn">
            <b>{snap.slipping}</b>
            <span>started slipping</span>
          </div>
        </div>

        <HBarChart bare showValues
          title="" series={[{ name: 'Wallets', color: 'var(--chart-1)', points: ordered.map((c) => c.count) }]}
          labels={ordered.map((c) => stageMeta(c.stage).label)}
          colors={ordered.map((c) => STAGE_COLOR[c.stage])}
          hints={Object.fromEntries(ordered.map((c) => [stageMeta(c.stage).label, stageMeta(c.stage).desc]))}
          valueLabel={(v, label) => `${v.toLocaleString('en-US')} · ${share.get(label) ?? 0}% of audience`} />
      </div>
    </div>
  );
}

/* Ranges actually drive the numbers — picking 7d/90d rescales KPIs and the series so the
   control isn't decorative. A real backend swaps RANGES for a query param. */
const RANGES = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
] as const;

/* Analytics: recurring dashboards, with blended on/off-chain KPIs, trends, channel
   performance, and answers pinned from Intelligence. Deliberately no revenue metric:
   the product attributes conversions, not money. */
const KPIS = [
  { label: 'Wallets reached', base: TOTALS_30D.walletsReached, suffix: '', delta: '+12.4%', up: true, hint: 'Unique wallets sent at least one email or in-app push in the period.' },
  /* The headline strip was message and chain only, which made the product lane something you
     had to go and build a chart to see. If the claim is that the three lanes are one picture,
     the first five numbers on the page cannot be drawn from two of them. */
  { label: 'In-app actions', base: TOTALS_30D.productEvents, suffix: '', delta: '+9.2%', up: true, hint: 'Events your app sent us through track() in the period. What people did inside the product, whether or not it touched the chain.' },
  { label: 'Finished onboarding', base: TOTALS_30D.onboardingFinished, suffix: '', delta: '+6.4%', up: true, hint: 'Wallets that completed your setup flow in the period. A product-lane event: it happens before anyone transacts, so the chain cannot see it.' },
  { label: 'Email open rate', base: 42.3, suffix: '%', flat: true, delta: '+3.1pt', up: true, hint: 'Share of delivered emails opened. Email only. In-app push is measured as view rate, not opens.' },
  { label: 'Push view rate', base: 90.6, suffix: '%', flat: true, delta: '+1.8pt', up: true, hint: 'Share of delivered in-app pushes that were seen. High because a queued message is waiting when the wallet arrives, rather than competing in an inbox.' },
  { label: 'Active wallets', base: TOTALS_30D.activeWallets, suffix: '', delta: '+8.6%', up: true, hint: 'Wallets in your audience with at least one on-chain action in the period.' },
  { label: 'On-chain conversions', base: TOTALS_30D.onchainConversions, suffix: '', delta: '+22.8%', up: true, hint: 'Wallets that took a target on-chain action within the attribution window after a message.' },
];
/* Every row is a rate, so the label says "rate" and the tooltip names the denominator.
   "Email opens · 42.3%" read as a count to more than one person — and click-through rate
   is genuinely ambiguous in email tooling (clicks ÷ delivered here, not clicks ÷ opens),
   so the tooltip states which one this is rather than assuming CTR is common knowledge. */
/* `n` is the real number; `pct` was a hand-tuned bar width and nothing else — email open rate
   is 42.3% and was drawn at 82. That was survivable while the bar was decoration. Now that a
   chart draws it to scale, plotting the tuned width would make the picture disagree with the
   label beside it, so the charts read `n` and `pct` is gone. */
const OFFCHAIN = [
  { name: 'Email open rate', value: '42.3%', n: 42.3, hint: 'Share of delivered emails that were opened.' },
  { name: 'Push view rate', value: '90.6%', n: 90.6, hint: 'Share of delivered in-app pushes seen on screen. Not comparable to email opens. A push waits for the wallet instead of competing in an inbox.' },
  { name: 'Click rate', value: '11.8%', n: 11.8, hint: 'Share of delivered emails where someone clicked a link. Measured against everything delivered. Clicks as a share of opens is a different figure (click-to-open rate).' },
  { name: 'Unsubscribe rate', value: '0.4%', n: 0.4, hint: 'Share of delivered emails that led to an opt-out. Above about 0.5% is worth investigating.' },
];
/* Three counts. "30d retention" used to sit here too, and it is a percentage — on a shared
   axis with counts in the thousands it was drawn at whatever width looked reasonable rather
   than at its value. It belongs on the Retention tab, which has it. */
const ONCHAIN = [
  { name: 'New holders', value: '1,204', n: 1204, hint: 'Wallets that acquired the token or NFT for the first time in this period.' },
  { name: 'Swaps', value: '842', n: 842, hint: 'Token swaps made by wallets in your audience.' },
  { name: 'Post-message conversions', value: '1,164', n: 1164, hint: 'On-chain actions taken within the attribution window after receiving a message.' },
];
/* In-app push funnel. Queued delivery means "sent" is not a moment: a campaign is enqueued
   per wallet and fires on their next connect, so the honest funnel is
   Queued → Delivered → Viewed → Clicked, with expiry and still-pending as the two leaks.
   Numbers reconcile: delivered + expired + pending = queued. */
const PUSH_FUNNEL = [
  { name: 'Queued', value: 24_800, hint: 'Wallets the campaign was enqueued for.' },
  { name: 'Delivered', value: 18_120, hint: 'Fired when the wallet next connected.' },
  { name: 'Viewed', value: 16_420, hint: 'Actually seen on screen.' },
  { name: 'Clicked', value: 4_980, hint: 'Tapped the call to action.' },
];
const PUSH_LEAKS = [
  { name: 'Still pending', value: 4_240, tone: 'info', hint: 'Queued, not yet connected. Can still deliver.' },
  { name: 'Expired unseen', value: 2_440, tone: 'warn', hint: 'TTL elapsed before the wallet returned.' },
];
const PUSH_MEDIAN_LAG = '1.4 days';

/* Chart data (2.7). Every one of these was previously a sentence or a static bar — the
   dashboard is meant to be read at a glance, and a paragraph is not glanceable. */
const DAYS = ['1', '4', '7', '10', '13', '16', '19', '22', '25', '28', '30'];
/** Messages sent per channel, weekly. Stacked, because the total is the interesting number
 *  and the split is what explains it. */
const SENT_BY_CHANNEL = [
  { name: 'Email', color: 'var(--action-primary)', points: [3200, 3400, 3100, 3900, 4200, 4050, 4600, 4820] },
  { name: 'In-app push', color: 'var(--sky-500)', points: [2400, 2900, 3300, 3200, 3800, 4100, 4400, 4900] },
  { name: 'X', color: 'var(--orange-400)', points: [0, 0, 0, 0, 120, 260, 340, 410] },
];
/** Direct vs influenced, per channel. The same split every campaign report now shows. */
const CREDIT_BY_CHANNEL = [
  { name: 'Direct', color: 'var(--green-500)', points: [284, 512, 44] },
  { name: 'Influenced', color: 'var(--green-200)', points: [612, 388, 96] },
];
const CREDIT_LABELS = ['Email', 'Push', 'X'];
/** Share of a cohort still active on-chain, by day since first tracked action. The curve is
 *  the shape of the retention problem; a single 30d number hides where the drop happens. */
const RETENTION_CURVE = [
  { name: 'Messaged', color: 'var(--action-primary)', points: [100, 78, 69, 64, 61, 59, 57, 56, 55, 54, 54.2] },
  { name: 'Never messaged', color: 'var(--text-tertiary)', dashed: true, points: [100, 66, 53, 45, 40, 36, 33, 31, 30, 29, 28.4] },
];
/** Conversion rate, daily. A rate, not a count — volume already has its own chart. */
const CONV_RATE = [
  { name: 'Conversion rate · % of reached', color: 'var(--orange-500)', points: [3.1, 3.4, 3.2, 3.9, 4.1, 4.0, 4.4, 4.6, 4.5, 5.0, 5.2] },
];


export default function AnalyticsScreen() {
  const workspace = useWorkspaceMode();
  /* Which dashboard you are on, and whether you are looking at the list, are both in the
     address — /analytics is the index, /analytics/<id> is one dashboard. They were useState,
     which meant a dashboard could not be linked to, reloaded onto, or reached with the back
     button: three things people expect of anything that has a name. */
  const { dash } = useParams();
  const nav = useNavigate();
  /* Cards the user built, keyed by the tab they live on. A shipped tab is now a starting set
     rather than the whole tab — which is the difference between a dashboard we chose and one
     they own. */
  const [cards, setCards] = usePersistedState<Record<string, ChartSpec[]>>('dashCards', {});
  useEffect(() => {
    const old = (cards as Record<string, ChartSpec[] | undefined>).subscriptions;
    if (!old?.length) return;
    setCards((c) => {
      const { subscriptions = [], ...rest } = c as Record<string, ChartSpec[]>;
      return { ...rest, engagement: [...(rest.engagement ?? []), ...subscriptions] };
    });
  }, [cards, setCards]);
  const [custom, setCustom] = usePersistedState<{ id: string; label: string; createdAt?: string }[]>('dashTabs', []);
  const [indexQ, setIndexQ] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null);
  const [editing, setEditing] = useState<ChartSpec | null>(null);
  const [isNew, setIsNew] = useState(false);

  /* One default dashboard, called Dashboard, with its tabs; and any dashboards people make,
     each a page of their own charts. Overview to Retention are tabs of the default, not five
     dashboards: listing them as dashboards, and showing custom dashboards as extra tabs beside
     them, made the two ideas impossible to tell apart.

     Addresses: /analytics/<tab> is the default dashboard on that tab, /analytics/<id> is a
     dashboard someone made, and /analytics/all is the list of every dashboard. */
  const current = dash ?? 'overview';
  const index = current === 'all';
  const onDefault = !index && DASH_TABS.some((t) => t.id === current);
  const mine = custom.find((c) => c.id === current);
  /* A dashboard that was deleted, or a link typed wrong, is a real thing to land on. Saying
     so beats an empty page that looks like the app is broken. */
  const missing = !index && !onDefault && !mine;
  const tab = current;
  const tabLabel = DASH_TABS.find((t) => t.id === current)?.label;
  const tabCards = cards[tab] ?? [];
  /* The default dashboard first, then everyone's own. Charts on the default's tabs that people
     added themselves are counted, since they are the part that varies by workspace. */
  const extraOnDefault = DASH_TABS.reduce((n, t) => n + (cards[t.id] ?? []).length, 0);
  const indexRows = useMemo(() => {
    const q = indexQ.trim().toLowerCase();
    return [
      { id: 'overview', label: 'Dashboard', own: false, createdAt: undefined as string | undefined },
      ...custom.map((c) => ({ id: c.id, label: c.label, own: true, createdAt: c.createdAt })),
    ].filter((r) => r.label.toLowerCase().includes(q));
  }, [custom, indexQ]);
  const saveCard = (spec: ChartSpec) => {
    setCards((c) => {
      const list = c[tab] ?? [];
      const at = list.findIndex((x) => x.id === spec.id);
      return { ...c, [tab]: at === -1 ? [...list, spec] : list.map((x) => (x.id === spec.id ? spec : x)) };
    });
    setEditing(null);
  };
  const removeCard = (id: string) => {
    setCards((c) => ({ ...c, [tab]: (c[tab] ?? []).filter((x) => x.id !== id) }));
    setEditing(null);
  };
  /* A native prompt() is the wrong dialog here — it renders outside the product's own styling
     and browsers are free to suppress it, which would make the button silently do nothing. */
  const [naming, setNaming] = useState<string | null>(null);
  const addTab = () => {
    const label = (naming ?? '').trim();
    if (!label) return;
    const id = `u${Date.now().toString(36)}`;
    setCustom((v) => [...v, { id, label, createdAt: new Date().toISOString() }]);
    nav(`/analytics/${id}`);
    setNaming(null);
  };
  const show = (t: DashTab) => onDefault && current === t;
  const [range, setRange] = useState<typeof RANGES[number]>(RANGES[1]);
  /* The one range this dashboard's charts, Headline and lane strip all follow. */
  const dashRange = useMemo(() => ({
    range: range.id as RangeId,
    setRange: (id: RangeId) => setRange(RANGES.find((r) => r.id === id)!),
  }), [range]);
  const [publishing, setPublishing] = useState(false);
  /* Deleting a dashboard takes every chart on it and cannot be undone, which is more than a
     bare × should be allowed to do without saying so. */
  const [deleting, setDeleting] = useState<string | null>(null);
  const kpis = useMemo(() => KPIS.map((k) => ({
    ...k,
    display: k.flat
      ? `${k.base.toFixed(1)}${k.suffix}`
      : Math.round(k.base * RANGE_FACTOR[range.id]).toLocaleString('en-US') + k.suffix,
  })), [range]);

  /* Export builds a real CSV from what's on screen and downloads it. */
  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value', 'Period'],
      ...kpis.map((k) => [k.label, k.display, range.label]),
      [],
      ['Off-chain engagement', 'Value'],
      ...OFFCHAIN.map((c) => [c.name, c.value]),
      [],
      ['On-chain activity', 'Value'],
      ...ONCHAIN.map((c) => [c.name, c.value]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `onchainsuite-analytics-${range.id}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  /* An empty workspace has nothing to show here yet, so the section says what it is for and
     what fills it, rather than rendering the demo as if it were theirs. */
  if (workspace === 'empty') {
    return (
      <div className="page">
        <PageHeader title="Analytics" sub="Your numbers, as dashboards you can publish to a link." />
        <SectionEmpty icon="line-chart" title="No numbers yet" body="Dashboards chart what your holders and campaigns do. There is nothing to chart until your contract is indexed; the default Dashboard and its tabs fill in on their own after that." action={{ label: 'Go to Integrations', to: '/integrations' }} />
      </div>
    );
  }

  return (
    <div className="page page--wide"><div className="an"><DashboardRange.Provider value={dashRange}>
      <div className="an__head">
        {/* Named after what you are actually looking at, now that each dashboard is its own
            address. The breadcrumb keeps saying Dashboard, which is the section. */}
        <h1>{index ? 'Dashboards' : missing ? 'Dashboard not found' : onDefault ? 'Dashboard' : mine?.label}</h1>
        <span style={{ flex: 1 }} />
        {/* The page-level range control is gone: it forced every chart onto one window, which is
            wrong on a page where a retention curve and a week of sends are different questions.
            Each chart carries its own now. The strip keeps one because it is not a chart. */}
        {/* No Reports menu: it offered six named reports that all opened the same two bar
            charts already on Engagement, with an export identical to Export's. */}
        {!index && !missing && <>
        {/* Next to Export, because they answer the same question — how do I get this to
            someone who is not me — and the link is the one that does not go stale. */}
        <Button variant="secondary" icon="globe" onClick={() => setPublishing(true)}>Publish</Button>
        <Button variant="secondary" icon="download" onClick={exportCsv}>Export</Button>
        </>}
      </div>



      {/* The default dashboard's tabs, directly under its title, and only on the default
          dashboard. A dashboard someone made is one page, so its row carries what you can do
          to it instead. */}
      <nav className="atabs" aria-label={onDefault ? 'Dashboard tabs' : 'Dashboards'}>
        {onDefault && DASH_TABS.map((t) => (
          <Link key={t.id} className={`atabs__t${current === t.id ? ' on' : ''}`}
            aria-current={current === t.id ? 'page' : undefined} to={`/analytics/${t.id}`}>{t.label}</Link>
        ))}
        {mine && <>
          <button type="button" className="atabs__own" onClick={() => setRenaming({ id: mine.id, label: mine.label })}>
            <Icon name="pencil" size={13} />Rename
          </button>
          <button type="button" className="atabs__own atabs__own--del" onClick={() => setDeleting(mine.id)}>
            <Icon name="trash-2" size={13} />Delete
          </button>
        </>}
        <span className="atabs__right">
          {!index && !missing && (
            <RangePicker value={range.id as RangeId} onChange={dashRange.setRange} />
          )}
          <button type="button" className="atabs__add" onClick={() => setNaming('')} title="New dashboard">
            <Icon name="plus" size={15} />New dashboard
          </button>
          <Link className={`atabs__all${index ? ' on' : ''}`} to="/analytics/all">
            <Icon name="layout-grid" size={14} />All dashboards<i>{1 + custom.length}</i>
          </Link>
        </span>
      </nav>

      {/* The headline numbers are an overview, so they live on Overview. Above the tabs they
          sat on every tab unchanged, pushed the tabs halfway down the page, and made switching
          tabs look like it changed only the bottom half of it. */}
      {onDefault && current === 'overview' && <>
      <div className="an__striphead">
        <span>Headline</span>
      </div>
      <div className="an__strip">
        {kpis.map((k) => (
          <div className="an__kpi" key={k.label}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{k.label} · {range.id}<Tooltip content={k.hint}><Icon name="info" size={13} color="var(--text-tertiary)" /></Tooltip></span>
            <b>{k.display}</b>
            <span className={`an__delta an__delta--${k.up ? 'up' : 'down'}`}><Icon name={k.up ? 'trending-up' : 'trending-down'} size={13} />{k.delta}</span>
          </div>
        ))}
      </div>
      </>}

      {index && (
        <div className="dash">
          {/* The h1 already says Dashboards — a second heading directly under it was the
              same word twice with nothing between them. */}
          <div className="dash__head">
            <p>The default Dashboard and its tabs, and every dashboard you have made.</p>
          </div>

          <div className="dash__search">
            <Icon name="search" size={16} />
            <input value={indexQ} onChange={(e) => setIndexQ(e.target.value)} autoComplete="off"
              aria-label="Search dashboards" placeholder="Search dashboards" />
          </div>

          <div className="dash__table">
            <div className="dash__hrow">
              <span>Dashboard</span><span>Charts</span><span>Created</span><span />
            </div>
            {indexRows.map((r) => {
              const n = (cards[r.id] ?? []).length;
              return (
                <div className="dash__row" key={r.id}>
                  <Link className="dash__name" to={`/analytics/${r.id}`}>
                    <span className="dash__ic"><Icon name="layout-grid" size={14} /></span>{r.label}
                  </Link>
                  {/* The count is the useful column: an empty dashboard looks identical to a
                      full one, and it is the thing you forgot to finish. The default is never
                      empty, so it says what it is: its tabs, plus anything added to them. */}
                  <span className="dash__n">
                    {r.own
                      ? (n === 0 ? <em>No charts yet</em> : `${n} chart${n === 1 ? '' : 's'}`)
                      : `${DASH_TABS.length} tabs${extraOnDefault > 0 ? ` · ${extraOnDefault} of your charts` : ''}`}
                  </span>
                  <span className="dash__when">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : r.own ? NO_VALUE : 'Default'}</span>
                  <span className="dash__acts">
                    {r.own && <>
                      <button type="button" onClick={() => setRenaming({ id: r.id, label: r.label })}>Rename</button>
                      <button type="button" onClick={() => {
                        const id = `u${Date.now().toString(36)}`;
                        setCustom((v) => [...v, { id, label: `${r.label} copy`, createdAt: new Date().toISOString() }]);
                        setCards((m) => ({ ...m, [id]: (m[r.id] ?? []).map((spec) => ({ ...spec, id: `${spec.id}-c` })) }));
                        toast(`Duplicated “${r.label}”`);
                      }}>Duplicate</button>
                      <button type="button" className="dash__del" onClick={() => setDeleting(r.id)}>Delete</button>
                    </>}
                  </span>
                </div>
              );
            })}
            {indexRows.length === 0 && (
              <p className="dash__empty">No dashboard matches “{indexQ.trim()}”.</p>
            )}
          </div>
        </div>
      )}

      {missing && (
        <div className="dash__gone">
          <Icon name="layout-grid" size={22} color="var(--text-tertiary)" />
          <b>This dashboard does not exist</b>
          <p>It may have been deleted, or the link may be wrong. Every dashboard in the workspace is on the index.</p>
          <Link className="dash__goneb" to="/analytics/all">See all dashboards</Link>
        </div>
      )}

      {show('retention') && <LifecycleCard />}

      {/* The three lanes lead Overview: the whole claim of the product in one chart. Reachable
          value follows, because it is the number no other tool can produce. */}
      {show('overview') && <LanesChart />}
      {show('overview') && <ReachableValueCard />}
      {show('overview') && <EfficiencyStrip />}

      {/* "Reach & conversions over time" is gone: messages sent by channel and conversion rate
          below say the same thing with the split and the rate that actually get acted on. */}
      {show('overview') && (
        <div className="an__grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <BarChart title="Messages sent by channel" stacked series={SENT_BY_CHANNEL} />
          <LineChart title="Conversion rate" series={CONV_RATE} area unit="%" />
        </div>
      )}

      {show('conversions') && (
        <>
          <BarChart title="How each channel's conversions are credited" stacked categorical
            labels={CREDIT_LABELS} series={CREDIT_BY_CHANNEL} />
          <CampaignFunnel />
          {/* One card, not three. The distribution and the windows describe the same decision —
              where on the clock a message stops getting the credit — so they share an axis. */}
          <AttributionWindows />
        </>
      )}

      {show('retention') && (
        <>
          {/* Days since a wallet's first action, not a calendar window — a range picker here
              would be offering to change something this axis does not measure. */}
          <LineChart title="Still active, by day since first action" meta="% of cohort" categorical
            labels={DAYS} series={RETENTION_CURVE} unit="%" />
          {/* Side by side because they answer the same question at two speeds: the grid is
              retention over weeks, the flow is what moved this week. Reading one against the
              other is the point, and that needs them on screen together. */}
          <div className="an__grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
            <CohortGrid />
            <LifecycleFlow />
          </div>
        </>
      )}

      {show('engagement') && <FatigueCard />}

      {/* Both were the same hand-rolled track-and-fill rows, drawn slightly differently on each
          card. They are one component now — shadcn's mixed horizontal bars — which gives each
          measure a full line for its name instead of cramming it under a tick. */}
      {/* Full width, not two-up. A horizontal bar spends its left edge on the category name,
          and in half a row "Click-through rate" left about 90px for the bar itself — the labels
          were legible and the chart was not. */}
      {show('engagement') && <>
        <HBarChart title="Off-chain engagement" meta="% of delivered" unit="%" showValues mixed={false}
          legend="Messaging · % of delivered"
          hints={Object.fromEntries(OFFCHAIN.map((c) => [c.name, c.hint]))}
          labels={OFFCHAIN.map((c) => c.name)}
          series={[{ name: 'Rate', color: 'var(--chart-1)', points: OFFCHAIN.map((c) => c.n) }]} />
        <HBarChart title="On-chain activity" meta="This period" showValues mixed={false}
          legend="Wallet activity · on-chain"
          hints={Object.fromEntries(ONCHAIN.map((c) => [c.name, c.hint]))}
          labels={ONCHAIN.map((c) => c.name)}
          series={[{ name: 'Wallets', color: 'var(--chart-3)', points: ONCHAIN.map((c) => c.n) }]} />
      </>}

      {/* Queued → Delivered → Viewed → Clicked, as horizontal bars: four named steps read
          better down the page than crammed under ticks, and the leaks keep their own row
          because "still pending" can still deliver while "expired unseen" never will. */}
      {show('engagement') && (
        <HBarChart title="In-app push delivery" meta={`Median queue → delivery · ${PUSH_MEDIAN_LAG}`}
          mixed={false}
          labels={PUSH_FUNNEL.map((p) => p.name)}
          series={[{ name: 'Wallets', color: 'var(--chart-1)', points: PUSH_FUNNEL.map((p) => p.value) }]}
          footer={(
            <div className="pleaks" style={{ padding: '0 20px 18px' }}>
              {PUSH_LEAKS.map((l) => (
                <div className={`pleak pleak--${l.tone}`} key={l.name}>
                  <span className="pleak__n">{l.value.toLocaleString('en-US')}</span>
                  <span className="pleak__l">{l.name}</span>
                  <span className="pleak__h">{l.hint}</span>
                </div>
              ))}
            </div>
          )} />
      )}

      {/* Reach, after response: how many people each channel can get to at all. */}
      {show('engagement') && <ListGrowthChart />}

      {!index && !missing && <>
        {tabCards.map((c) => (
          <ChartCard key={c.id} spec={c} onEdit={() => { setIsNew(false); setEditing(c); }} />
        ))}
        <button type="button" className="cbadd" onClick={() => { setIsNew(true); setEditing(newSpec()); }}>
          <span className="cbadd__ic"><Icon name="plus" size={18} /></span>
          <span>
            <b>Add a chart</b>
            <span>Pick a measure, an audience and a split, in the same words the segment builder uses.</span>
          </span>
        </button>
      </>}

      {renaming && (
        <Modal title="Rename dashboard" onClose={() => setRenaming(null)}
          footer={<><Button variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button disabled={!renaming.label.trim()} onClick={() => {
              setCustom((v) => v.map((c) => (c.id === renaming.id ? { ...c, label: renaming.label.trim() } : c)));
              setRenaming(null);
            }}>Rename</Button></>}>
          <Input label="Name" value={renaming.label}
            onChange={(e) => setRenaming({ ...renaming, label: e.target.value })}
            helper="Published links keep the name they were created with." />
        </Modal>
      )}

      {naming !== null && (
        <Modal title="New dashboard" onClose={() => setNaming(null)}
          footer={<><Button variant="secondary" onClick={() => setNaming(null)}>Cancel</Button>
            <Button onClick={addTab} disabled={!naming.trim()}>Create</Button></>}>
          <form onSubmit={(e) => { e.preventDefault(); addTab(); }}>
            <Input label="Name" value={naming} onChange={(e) => setNaming(e.target.value)}
              placeholder="Weekly growth review"
              helper="A dashboard of your own, separate from the default one. Add charts to it with the builder." />
          </form>
        </Modal>
      )}

      {editing && (
        <ChartBuilder
          initial={editing}
          onSave={saveCard}
          onClose={() => setEditing(null)}
          onRemove={isNew ? undefined : () => removeCard(editing.id)}
        />
      )}

      {deleting && (() => {
        const t = custom.find((x) => x.id === deleting);
        const n = (cards[deleting] ?? []).length;
        return (
          <Modal title={`Delete “${t?.label ?? 'this dashboard'}”?`} onClose={() => setDeleting(null)}
            footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => {
                setCustom((v) => v.filter((c) => c.id !== deleting));
                setCards((c) => { const next = { ...c }; delete next[deleting]; return next; });
                setDeleting(null); nav('/analytics/all');
                toast(`“${t?.label ?? 'Dashboard'}” deleted`);
              }}>Delete dashboard</Button></>}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              This removes the dashboard and the {n} chart{n === 1 ? '' : 's'} on it. It cannot be undone.
              {' '}Any published link to it stops working.
            </p>
          </Modal>
        );
      })()}

      {publishing && (
        <PublishDialog title={onDefault ? `Dashboard: ${tabLabel}` : mine?.label ?? 'Dashboard'}
          specs={tabCards} lanes={tab === 'overview'} onClose={() => setPublishing(false)} />
      )}

    </DashboardRange.Provider></div></div>
  );
}
