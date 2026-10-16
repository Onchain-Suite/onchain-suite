import { useMemo, useState } from 'react';
import { SectionEmpty } from '../components/SectionEmpty';
import { useWorkspaceMode } from '../data/workspace';
import { PageHeader } from '../shell/Shell';
import { Badge, Button, Card, ChannelDots, Chip, EmptyState, Table, type Column, NO_VALUE } from '../components/ui';
import './campaigns.css';
import { Icon } from '../components/icons';
import { EMAIL_CTR, EMAIL_OPEN, MessageStatsTable, PUSH_CTR, PUSH_VIEW } from '../components/MessageStats';
import type { MessageStat } from '../components/MessageStats';
import { toast } from '../components/toast';
import { useAsync } from '../data/useAsync';
import { api } from '../data/api';
import type { Campaign, CampaignStatus } from '../data/types';
import { CampaignWizard } from './CampaignWizard';
import { funnelFor, pct, slicesFor, type Funnel } from '../data/campaignModel';
import { computeLift, fmtPts, requiredN } from '../data/experiment';
import { attribute, attributionFor, windowLabel } from '../data/attribution';
import { useHoldout } from '../data/store';
import { TOTALS_30D } from '../data/workspaceTotals';

const STATUS_META: Record<CampaignStatus, { label: string; status: 'success' | 'info' | 'neutral' | 'warning' | 'error'; live?: boolean }> = {
  sent: { label: 'Sent', status: 'success' },
  sending: { label: 'Sending', status: 'info', live: true },
  scheduled: { label: 'Scheduled', status: 'info' },
  draft: { label: 'Draft', status: 'neutral' },
  paused: { label: 'Paused', status: 'neutral' },
  failed: { label: 'Failed', status: 'error' },
};

export default function CampaignsScreen() {
  const workspace = useWorkspaceMode();
  const { data, loading } = useAsync(api.campaigns, []);
  const campaigns = useMemo(() => data ?? [], [data]);
  const [filter, setFilter] = useState<'all' | CampaignStatus>('all');
  const [open, setOpen] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: campaigns.length };
    for (const cp of campaigns) c[cp.status] = (c[cp.status] ?? 0) + 1;
    return c;
  }, [campaigns]);

  const rows = filter === 'all' ? campaigns : campaigns.filter((c) => c.status === filter);

  const cols: Column<Campaign>[] = [
    { key: 'name', label: 'Campaign', render: (r) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</span>
        <ChannelDots ids={r.channels} />
      </span>
    ) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={STATUS_META[r.status].status} live={STATUS_META[r.status].live}>{STATUS_META[r.status].label}</Badge> },
    { key: 'recipients', label: 'Recipients', numeric: true, render: (r) => r.recipients ? r.recipients.toLocaleString() : NO_VALUE },
    // "Open rate" is wrong for the push-only rows — a push is viewed, never opened. The
    // drawer splits this properly; the column just needs a label that covers both.
    { key: 'open', label: 'Open / view rate', numeric: true, render: (r) => r.recipients && r.opened ? `${Math.round((r.opened / r.recipients) * 100)}%` : NO_VALUE },
    { key: 'click', label: 'Click rate', numeric: true, render: (r) => r.recipients && r.clicked ? `${Math.round((r.clicked / r.recipients) * 100)}%` : NO_VALUE },
    { key: 'created', label: 'Sent / scheduled', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.createdAt}</span> },
    { key: 'chev', label: '', srLabel: 'Open', render: () => <Icon name="chevron-right" size={16} color="var(--text-tertiary)" /> },
  ];

  const filters: { id: 'all' | CampaignStatus; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'sent', label: 'Sent' }, { id: 'scheduled', label: 'Scheduled' },
    { id: 'draft', label: 'Draft' }, { id: 'paused', label: 'Paused' },
  ];

  if (creating) return <CampaignWizard onExit={() => setCreating(false)} />;
  // Full page, not a drawer — a campaign has as much to show as an automation does.
  if (open) {
    return (
      <CampaignDetail
        campaign={open}
        all={campaigns}
        onBack={() => setOpen(null)}
        onEdit={() => { setOpen(null); setCreating(true); }}
        onDuplicate={() => { toast(`“${open.name}” duplicated as a draft`); setOpen(null); setCreating(true); }}
        onReschedule={() => { toast('Pick a new send time on the review step'); setOpen(null); setCreating(true); }}
      />
    );
  }

  /* An empty workspace has nothing to show here yet, so the section says what it is for and
     what fills it, rather than rendering the demo as if it were theirs. */
  if (workspace === 'empty') {
    return (
      <div className="page">
        <PageHeader title="Campaigns" sub="Search, filter and manage all of your campaigns from one place." />
        <SectionEmpty icon="megaphone" title="No campaigns yet" body="A campaign sends one message to an audience, by email, in-app push or X. There is nobody to send to until your contract is indexed and a channel is connected." action={{ label: 'Go to Integrations', to: '/integrations' }} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Campaigns" sub="Search, filter and manage all of your campaigns from one place."
        actions={<Button icon="plus" onClick={() => setCreating(true)}>Create campaign</Button>} />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="stat"><span className="stat__label">Messages sent · 30d</span><div className="stat__value">{TOTALS_30D.messagesSent.toLocaleString('en-US')}</div><div className="stat__sub">Email + in-app push</div></div>
        {/* 42.3% is the email figure Analytics publishes — labelling it plain "Open rate"
            next to a strip that counts push too implied it covered both channels. */}
        <div className="stat"><span className="stat__label">Email open rate</span><div className="stat__value">42.3%</div><div className="stat__sub">4,918 unique opens · email only</div></div>
        <div className="stat"><span className="stat__label">Click rate</span><div className="stat__value">11.8%</div><div className="stat__sub">1,371 unique clicks</div></div>
        <div className="stat"><span className="stat__label">Monthly allowance</span><div className="stat__value">312 <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>/ 500</span></div><div className="stat__sub">resets Aug 1</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map((f) => <Chip key={f.id} on={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} · {counts[f.id] ?? 0}</Chip>)}
      </div>

      <Card pad={false} style={{ overflow: 'hidden' }}>
        {loading ? <div className="sk" style={{ height: 260, margin: 16 }} />
          : rows.length ? <Table columns={cols} rows={rows} onRowClick={setOpen} />
          : <EmptyState icon="megaphone" title="No campaigns match this filter" desc="Switch to All to see every campaign, or create one." />}
      </Card>

    </div>
  );
}

/* Per-channel performance for a send.
 *
 * A campaign row carries one `opened` and one `clicked` figure, but a Smart campaign routes
 * each wallet down whichever channel can reach it — so those totals blend email opens with
 * push views. That average is not a real number: push is seen roughly twice as often as
 * email is opened, so a blended "open rate" moves with the channel mix rather than with
 * performance, and it labelled push-only sends "Open rate" when a push is never opened.
 *
 * The split below reallocates the campaign's own totals across its channels by each
 * channel's expected rate, so the parts still add back to the headline figures. */
const CHANNEL_LABEL = { email: 'Email', push: 'In-app push' } as const;
/** Share of a mixed audience routed to email — the rest are wallets with no email linked. */
const EMAIL_SHARE = 0.62;

export function campaignChannelStats(c: Campaign): MessageStat[] {
  const kinds = c.channels.filter((k): k is 'email' | 'push' => k === 'email' || k === 'push');
  if (!kinds.length || !c.recipients) return [];

  const sent: Record<string, number> = {};
  if (kinds.length === 1) {
    sent[kinds[0]] = c.recipients;
  } else {
    sent.email = Math.round(c.recipients * EMAIL_SHARE);
    sent.push = c.recipients - sent.email;   // remainder, so the split is lossless
  }

  // Split a campaign total across channels in proportion to each one's expected volume,
  // giving the remainder to the last channel so the parts always sum to the whole.
  const allocate = (total: number, weight: (k: 'email' | 'push') => number) => {
    const w = kinds.map((k) => sent[k] * weight(k));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    const out = w.map((x) => Math.round((total * x) / sum));
    out[out.length - 1] += total - out.reduce((a, b) => a + b, 0);
    return out;
  };
  const engaged = allocate(c.opened, (k) => (k === 'email' ? EMAIL_OPEN : PUSH_VIEW));
  const clicked = allocate(c.clicked, (k) => (k === 'email' ? EMAIL_CTR : PUSH_VIEW * PUSH_CTR));

  return kinds.map((k, i) => ({
    id: `${c.id}-${k}`,
    kind: k,
    label: CHANNEL_LABEL[k],
    sent: sent[k],
    engaged: Math.max(0, engaged[i]),
    engagedRate: sent[k] ? (Math.max(0, engaged[i]) / sent[k]) * 100 : 0,
    clicked: Math.max(0, clicked[i]),
    clickRate: sent[k] ? (Math.max(0, clicked[i]) / sent[k]) * 100 : 0,
  }));
}

/* Recent activity. Deterministic per campaign so the feed is stable across renders —
   a list that reshuffles every time you open it reads as noise, not as data. */
const ACTORS = ['maya.eth', '0x3F4a…8a21', 'leo.eth', '0x91Cb…4e07', 'hammer.eth', '0x77De…21b4'];
const EVENTS: { kind: 'Clicked' | 'Opened' | 'Viewed' | 'Unsubscribed' | 'Bounced'; tone: 'success' | 'info' | 'neutral' | 'warning' }[] = [
  { kind: 'Clicked', tone: 'success' }, { kind: 'Opened', tone: 'info' }, { kind: 'Viewed', tone: 'info' },
  { kind: 'Clicked', tone: 'success' }, { kind: 'Unsubscribed', tone: 'neutral' }, { kind: 'Bounced', tone: 'warning' },
];
const AGO = ['4 min ago', '22 min ago', '1h ago', '3h ago', '6h ago', '1d ago'];

export function campaignActivity(c: Campaign) {
  if (!c.recipients || c.status === 'scheduled' || c.status === 'draft') return [];
  const hasEmail = c.channels.includes('email');
  const seed = c.id.charCodeAt(c.id.length - 1);
  return ACTORS.map((w, i) => {
    const e = EVENTS[(i + seed) % EVENTS.length];
    // Pick the channel first, then make the verb agree with it. A push is viewed, never
    // opened; an email is never "viewed"; and only email can hard-bounce.
    const via = c.channels.length > 1 ? (i % 2 === 0 ? 'Email' : 'Push') : (hasEmail ? 'Email' : 'Push');
    const kind = via === 'Push'
      ? (e.kind === 'Opened' ? 'Viewed' : e.kind === 'Bounced' ? 'Clicked' : e.kind)
      : (e.kind === 'Viewed' ? 'Opened' : e.kind);
    return { w, kind, tone: e.tone, at: AGO[i], via };
  });
}

const rateOf = (c: Campaign, k: 'opened' | 'clicked') => (c.recipients ? (c[k] / c.recipients) * 100 : 0);

const mixKey = (c: Campaign) => [...c.channels].sort().join('+');

/* Other campaigns that actually delivered, same channel mix first.
 *
 * A rate is only comparable within a mix. In-app push is viewed roughly twice as often as
 * email is opened, so a push-only send outscores an email-only one on engagement no matter
 * how good either message was. Sorting same-mix peers to the top means the headline delta
 * is against a real peer; the rest are still listed, but flagged so no delta is drawn. */
export function comparableCampaigns(all: Campaign[], current: Campaign) {
  const delivered = all.filter((c) => c.id !== current.id && c.recipients > 0 && c.opened > 0);
  const key = mixKey(current);
  const same = delivered.filter((c) => mixKey(c) === key);
  const other = delivered.filter((c) => mixKey(c) !== key);
  return [...same, ...other].slice(0, 3).map((c) => ({ ...c, sameMix: mixKey(c) === key }));
}

function Delta({ now, prev, unit = 'pt' }: { now: number; prev: number; unit?: string }) {
  if (!prev) return <span className="cdelta cdelta--flat">no prior</span>;
  const d = now - prev;
  const up = d >= 0;
  return (
    <span className={`cdelta cdelta--${up ? 'up' : 'down'}`}>
      <Icon name={up ? 'trending-up' : 'trending-down'} size={12} />
      {up ? '+' : ''}{d.toFixed(1)}{unit}
    </span>
  );
}

/* The normalised funnel (2.5).
 *
 * Open rate is an email idea. Push has views, X DMs have neither in any
 * comparable form — so a table with an "Open rate" column silently compares four different
 * events and calls the winner. This collapses all of them into "engaged", and then puts the
 * only channel-independent number — wallets that did the on-chain thing — at the end of the
 * row. The per-channel split underneath keeps the nuance without letting it lead.
 *
 * `lost` sits in the funnel rather than a footnote on purpose: an unsubscribe is a cost the
 * campaign incurred, and a channel that converts well while burning 2% of the list is not
 * actually winning. */
function ConversionFunnel({ campaign }: { campaign: Campaign }) {
  const holdout = useHoldout();
  const f = funnelFor(campaign);
  const slices = slicesFor(campaign);
  /* Bar widths need the same zero guard the percentage labels get from `rate()`. A campaign
     that reached nobody — a failed send, which is exactly when someone opens this — gave
     `0 / 0` and emitted `width: NaN%`, which the browser drops, collapsing the chart. */
  const barWidth = (n: number) => (f.reached > 0 ? `${Math.max(2, (n / f.reached) * 100)}%` : '0%');
  const steps = [
    { label: 'Reached', n: f.reached, sub: 'messages that landed', tone: 'var(--action-primary)' },
    { label: 'Engaged', n: f.engaged, sub: 'opened, viewed or read', tone: 'var(--sky-500)' },
    { label: 'Converted', n: f.converted, sub: 'completed the goal on-chain', tone: 'var(--green-500)' },
  ];
  /* Direct means it landed inside the tight window after a click; influenced means later, or
     after only an open. Reporting them as one number is how a channel takes credit it did not
     earn — and with fallback routes in play, the earlier hop takes it by default. */
  const attr = attribute(campaign, f.converted);

  return (
    <div className="funnel">
      <div className="funnel__head">
        <h3>Outcome</h3>
        <span className="funnel__sub">One funnel for every channel: the only comparison that holds across all of them</span>
      </div>
      <LiftRow campaign={campaign} f={f} pctHeld={holdout.campaignPct} />
      <div className="funnel__steps">
        {steps.map((s, i) => (
          <div className="funnel__step" key={s.label}>
            <span className="funnel__lbl">{s.label}</span>
            <b className="funnel__n">{s.n.toLocaleString('en-US')}</b>
            <span className="funnel__pct">{i === 0 ? '100%' : `${pct(s.n, f.reached)} of reached`}</span>
            <span className="funnel__bar"><i style={{ width: barWidth(s.n), background: s.tone }} /></span>
          </div>
        ))}
        <div className="funnel__step funnel__step--loss">
          <span className="funnel__lbl">Lost</span>
          <b className="funnel__n">{f.lost.toLocaleString('en-US')}</b>
          <span className="funnel__pct">unsubscribed, blocked or muted</span>
          <span className="funnel__bar"><i style={{ width: barWidth(f.lost), background: 'var(--red-500)' }} /></span>
        </div>
      </div>
      {attr && (
        <div className="attrsplit">
          <span className="attrsplit__lbl">Of those conversions</span>
          <span className="attrsplit__v attrsplit__v--direct">
            <b>{attr.direct.toLocaleString('en-US')}</b>
            <span>direct: inside {windowLabel(attributionFor(campaign.channels[0] ?? 'email').directMinutes)} of a click</span>
          </span>
          <span className="attrsplit__v">
            <b>{attr.influenced.toLocaleString('en-US')}</b>
            <span>influenced: later, or after only an open</span>
          </span>
          {attr.contested > 0 && (
            <span className="attrsplit__v attrsplit__v--soft">
              <b>{attr.contested.toLocaleString('en-US')}</b>
              <span>credited to the last touch: two channels in window</span>
            </span>
          )}
        </div>
      )}

      <div className="funnel__split">
        {slices.map((s) => (
          <div className="funnel__chan" key={s.channel}>
            <ChannelDots ids={[s.channel]} />
            <span className="funnel__chanlbl">{s.channel === 'push' ? 'In-app push' : s.channel === 'x' ? 'X DM' : s.channel[0].toUpperCase() + s.channel.slice(1)}</span>
            <span className="funnel__chanstat"><b>{s.reached.toLocaleString('en-US')}</b> reached</span>
            <span className="funnel__chanstat"><b>{pct(s.engaged, s.reached)}</b> {s.engagedLabel.toLowerCase()}</span>
            <span className="funnel__chanstat funnel__chanstat--goal"><b>{pct(s.converted, s.reached)}</b> converted</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Campaign lift (2.7).
 *
 * The one number that says whether the campaign did anything. It reports three ways and two
 * of them are refusals, which is the point: a lift smaller than the sample could resolve is
 * not a small lift, it is no measurement at all, and printing "+1.2pt" there would be read
 * as a result by everyone who saw it. */
function LiftRow({ campaign, f, pctHeld }: { campaign: Campaign; f: Funnel; pctHeld: number }) {
  // The held-back arm is reconstructed from the same policy the send used.
  const nHeld = Math.round((f.reached / (1 - pctHeld / 100)) * (pctHeld / 100));
  const seed = campaign.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  // Control converts a little below treatment in this data; the spread varies by campaign
  // so the three verdicts are all reachable in the demo.
  const heldRate = (f.converted / Math.max(f.reached, 1)) * (0.55 + (seed % 40) / 100);
  const heldConv = Math.round(nHeld * heldRate);
  /* Deliberately the unattributed total, not the direct count. Windows exist to guess which
     conversions a message caused when nothing was held back; a holdout answers that directly,
     so narrowing it to a window here would throw away the only clean measurement on the page. */
  const lift = computeLift(f.converted, f.reached, heldConv, nHeld, pctHeld);

  const tone = lift.verdict === 'significant' ? 'lift--good' : lift.verdict === 'inconclusive' ? 'lift--flat' : 'lift--unknown';
  return (
    <div className={`lift ${tone}`}>
      <div className="lift__main">
        <span className="lift__lbl">Lift vs. not sending</span>
        {lift.verdict === 'underpowered' ? (
          <b className="lift__none">Not measurable</b>
        ) : (
          <b className="lift__val">{fmtPts(lift.points)}</b>
        )}
      </div>
      <p className="lift__note">Counts every conversion in the period. The holdout already tells you which were caused, so no attribution window is applied.</p>
      <p className="lift__say">
        {lift.verdict === 'significant' ? (
          <>
            <b>{(lift.treatedRate * 100).toFixed(1)}%</b> of the {f.reached.toLocaleString('en-US')} messaged converted, against{' '}
            <b>{(lift.heldRate * 100).toFixed(1)}%</b> of the {nHeld.toLocaleString('en-US')} held back.
            That gap is unlikely to be chance (p&nbsp;=&nbsp;{lift.p.toFixed(3)}). The campaign caused roughly{' '}
            <b>{Math.round((lift.treatedRate - lift.heldRate) * f.reached).toLocaleString('en-US')}</b> conversions that would not have happened.
          </>
        ) : lift.verdict === 'inconclusive' ? (
          <>
            Treated and held-back converted at {(lift.treatedRate * 100).toFixed(1)}% and {(lift.heldRate * 100).toFixed(1)}%.
            The sample could have resolved a {lift.mde.toFixed(1)}pt difference and this one is within noise
            (p&nbsp;=&nbsp;{lift.p.toFixed(2)}). No evidence the campaign moved anything either way.
          </>
        ) : (
          <>
            Only <b>{nHeld.toLocaleString('en-US')}</b> wallets were held back, which can resolve a difference of{' '}
            <b>{lift.mde.toFixed(1)}pt</b> at best. The observed {fmtPts(lift.points)} sits inside that margin, so it
            carries no information. Reaching 3pt resolution here needs about{' '}
            <b>{requiredN(0.15, 3, pctHeld).toLocaleString('en-US')}</b> recipients, or a programme holdout, which pools
            every campaign instead of starting over each send.
          </>
        )}
      </p>
    </div>
  );
}

function CampaignDetail({ campaign, all, onBack, onEdit, onDuplicate, onReschedule }: {
  campaign: Campaign; all: Campaign[]; onBack: () => void;
  onEdit: () => void; onDuplicate: () => void; onReschedule: () => void;
}) {
  const m = STATUS_META[campaign.status];
  const pending = campaign.status === 'scheduled' || campaign.status === 'draft';
  const channels = pending ? [] : campaignChannelStats(campaign);
  const multi = channels.length > 1;
  const activity = campaignActivity(campaign);
  const peers = comparableCampaigns(all, campaign);
  const prev = peers.find((p) => p.sameMix);   // only a same-mix peer earns a headline delta
  const openRate = rateOf(campaign, 'opened');
  const clickRate = rateOf(campaign, 'clicked');
  // A push-only send has no "opens" — the headline has to name the right event.
  const engagementLabel = campaign.channels.length === 1 && campaign.channels[0] === 'push' ? 'View rate' : 'Open / view rate';

  return (
    <div className="auto">
      <div className="flow__bar">
        <button type="button" className="flow__back" onClick={onBack}><Icon name="arrow-left" size={16} />Campaigns</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{campaign.name}</span>
        <Badge status={m.status} live={m.live}>{m.label}</Badge>
        <ChannelDots ids={campaign.channels} />
        <span className="flow__meta">{campaign.type}</span>
        <span style={{ flex: 1 }} />
        {pending
          ? <><Button variant="secondary" size="s" onClick={onReschedule}>Reschedule</Button><Button size="s" icon="pencil" onClick={onEdit}>Edit campaign</Button></>
          : <Button variant="secondary" size="s" icon="copy" onClick={onDuplicate}>Duplicate</Button>}
      </div>

      <div className="auto__strip">
        <div className="auto__stat"><span>Recipients</span><b>{campaign.recipients ? campaign.recipients.toLocaleString() : NO_VALUE}</b></div>
        <div className="auto__stat">
          <span>{engagementLabel}</span>
          <b>{pending ? 'Pending' : `${openRate.toFixed(1)}%`}</b>
          {!pending && prev && <Delta now={openRate} prev={rateOf(prev, 'opened')} />}
        </div>
        <div className="auto__stat">
          <span>Click rate</span>
          <b>{pending ? 'Pending' : `${clickRate.toFixed(1)}%`}</b>
          {!pending && prev && <Delta now={clickRate} prev={rateOf(prev, 'clicked')} />}
        </div>
        <div className="auto__stat"><span>{pending ? 'Scheduled for' : 'Sent'}</span><b style={{ fontSize: 18 }}>{campaign.createdAt}</b></div>
      </div>

      {!pending && <ConversionFunnel campaign={campaign} />}

      <div className="cgrid">
        <div className="stats__card">
          <div className="stats__head">
            <h3>Performance by channel</h3>
            {multi && <span className="stats__sub">Each wallet was routed to one channel</span>}
          </div>
          {channels.length === 0
            ? <div className="stats__ph"><b>Nothing sent yet</b><span>Delivery and engagement appear here once this campaign goes out.</span></div>
            : (
              <MessageStatsTable
                rows={channels}
                firstCol="Channel"
                sentHint="routed here"
                note={multi
                  ? <>A Smart campaign sends each wallet down whichever channel can reach it, so these are separate
                    audiences that add up to {campaign.recipients.toLocaleString()} recipients. Open rate and view rate
                    measure different events. Read each channel on its own rather than averaging them.</>
                  : <>Measured against everyone this campaign was sent to. Click rate is against recipients,
                    not against {campaign.channels[0] === 'push' ? 'views' : 'opens'}.</>}
              />
            )}
        </div>

        <div className="stats__card">
          <h3>Recent activity</h3>
          {activity.length === 0
            ? <div className="stats__ph"><b>No activity yet</b><span>Opens, views, clicks and opt-outs land here as wallets engage.</span></div>
            : (
              <div className="cact">
                {activity.map((a) => (
                  <div className="cact__row" key={a.w}>
                    <b>{a.w}</b>
                    <Badge status={a.tone}>{a.kind}</Badge>
                    <span className="cact__via">{a.via}</span>
                    <span className="cact__at">{a.at}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="stats__card">
        <div className="stats__head">
          <h3>Compared with previous campaigns</h3>
          <span className="stats__sub">Deltas are this campaign against that row</span>
        </div>
        {/* A campaign that hasn't sent has no rates — putting it in the table at 0.0% would
            read as "it performed badly" rather than "it hasn't run". */}
        {pending
          ? <div className="stats__ph"><b>Not sent yet</b><span>Once this campaign goes out, it appears here next to your recent sends with the difference in each rate.</span></div>
          : peers.length === 0
          ? <div className="stats__ph"><b>Nothing to compare against yet</b><span>Once more than one campaign has gone out, this shows how each performed against the others.</span></div>
          : (
            <>
              <div className="cmp">
                <div className="cmp__head"><span>Campaign</span><span>Recipients</span><span>Open / view rate</span><span>Click rate</span></div>
                {/* The anchor is trivially its own mix, so it carries the flag too. */}
                {[{ ...campaign, sameMix: true }, ...peers].map((c, i) => (
                  <div className={`cmp__row${i === 0 ? ' cmp__row--this' : ''}`} key={c.id}>
                    <span className="cmp__name">
                      <b>{c.name}</b>
                      {i === 0 && <span className="cmp__tag">This one</span>}
                      <ChannelDots ids={c.channels} />
                    </span>
                    <span className="cmp__n">{c.recipients.toLocaleString()}</span>
                    <span className="cmp__n">
                      {rateOf(c, 'opened').toFixed(1)}%
                      {i > 0 && (c.sameMix ? <Delta now={openRate} prev={rateOf(c, 'opened')} /> : <span className="cmp__mix">different mix</span>)}
                    </span>
                    <span className="cmp__n">
                      {rateOf(c, 'clicked').toFixed(1)}%
                      {i > 0 && c.sameMix && <Delta now={clickRate} prev={rateOf(c, 'clicked')} />}
                    </span>
                  </div>
                ))}
              </div>
              <p className="msgs__note">
                <Icon name="info" size={13} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Deltas are only drawn against campaigns with the same channel mix. In-app push is viewed
                  about twice as often as email is opened, so a push-heavy send outscores an email-only one
                  whatever the message said. Rows on a different mix are listed for context but not differenced.
                </span>
              </p>
            </>
          )}
      </div>
    </div>
  );
}
