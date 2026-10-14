import { useEffect, useRef, useState } from 'react';
import { Badge, Button, CheckMark, Checkbox, Chip, Select, Switch } from '../components/ui';
import { Icon } from '../components/icons';
import { EmailBuilder, defaultEmailBlocks, type Block } from './builders';
import { SEGMENTS } from '../data/mock';
import { useFrequency, useHoldout, useMobileInstall, usePushInstall, useSender, useX , useSegments } from '../data/store';
import { SINGLE_CAMPAIGN_FLOOR, minDetectableEffect, requiredN } from '../data/experiment';
import {
  CONSTRAINTS, GOALS, ROUTABLE, SEND_TIME, SEND_TIME_CURVE, goalById, sendTimeSummary,
} from '../data/campaignModel';
import { HandoffInline } from '../components/Handoff';
import type { ChannelId } from '../data/types';
import type { IconName } from '../components/icons';
import { FOOTER_LEGAL, FOOTER_LINKS, FOOTER_REASON, missingRequiredTags, renderTags } from '../data/email';
import { PushComposer, PushPreview, SURFACES, defaultPush, type PushContent } from './PushComposer';
import './campaign-wizard.css';

const EXCLUDABLE: { id: string; label: string; always?: boolean; n?: number }[] = [
  { id: 'suppressed', label: 'Suppressed & unsubscribed', always: true },
  { id: 'recent', label: 'Messaged in last 24h', n: 640 },
  { id: 'team', label: 'Internal / team wallets', n: 18 },
];
const CAMPAIGN_LISTS = [
  { id: 'news', name: 'Newsletter subscribers', desc: 'Form · Newsletter signup', email: 640, wallet: 320 },
  { id: 's2wait', name: 'Season 2 waitlist', desc: 'Form · Season 2 waitlist', email: 1040, wallet: 1204 },
  { id: 'airdrop', name: 'Airdrop applicants', desc: 'Form · Airdrop eligibility', email: 460, wallet: 512 },
  { id: 'vip', name: 'VIP holders', desc: 'Manual · CSV import', email: 40, wallet: 86 },
];
/* Invented, like the rest of the demo audience.
 *
 * These were five real-looking gmail addresses with the names to match. This screen lists
 * them under "who gets this message", so a screenshot of the campaign wizard published five
 * people's contact details next to a claim that we are about to email them. Same rule as the
 * ENS handles: sample data is invented, and the domain is one that cannot receive mail. */
const CONTACTS = [
  { name: 'Maya Okonkwo', email: 'maya@example.com', wallet: '0x3F4a…8a21' },
  { name: 'Leo Fairbairn', email: 'leo@example.com', wallet: '0x91Cb…4e07' },
  { name: 'Tunde Adeyemi', email: 'tunde@example.com', wallet: '0xA27d…c913' },
  { name: 'Sora Ikeda', email: 'sora@example.com', wallet: '0x50E8…1bb4' },
  { name: 'Dami Oyelaran', email: 'dami@example.com', wallet: '0xDD02…7f6a' },
];
const TEMPLATES = [
  { id: 'blank', name: 'Start blank', sub: 'Empty canvas', bars: [0.5, 0, 0, 0] },
  { id: 'launch', name: 'Acme is live', sub: 'Saved · 23 Jul', bars: [0.9, 0.7, 0.75, 0.4] },
  { id: 'digest', name: 'Weekly digest', sub: 'Library', bars: [0.6, 0.85, 0.8, 0.55] },
];
const STEPS = [
  { label: 'Audience', sub: 'Who receives it' },
  { label: 'Message', sub: 'Content & template' },
  { label: 'Review', sub: 'Check & send' },
];

/* The four campaign types. 2 sees the first two; 2.5 sees all of them.
 *
 * The two new ones are permission-gated in a way the originals are not, and the subtitles
 * say so up front — "opt-in subscribers", "accounts that follow you" — because the choice
 * of channel is the moment that constraint changes what the campaign can be, not the
 * moment they hit send. */
interface CampaignType { id: ChannelId; name: string; sub: string; icon: IconName }
const TYPES: CampaignType[] = [
  { id: 'email', name: 'Email', sub: 'Widest reach', icon: 'mail' },
  { id: 'push', name: 'In-app push', sub: 'Connected wallets', icon: 'smartphone' },
  { id: 'x', name: 'X DM', sub: 'Followers only', icon: 'at-sign' },
];

/* 2's two types keep their original wording. The 2.5 labels lead with reach because
   there are several to compare at a glance; 1.5 has nothing to compare against, so
   renaming them there would be a gratuitous change to a shipped screen. */

/* X DM content. Hard 10,000-character cap, but the practical limit is far lower — a DM
 * that reads as a mail-merge gets reported, and a reported sender loses the endpoint. */
const defaultXdm = {
  text: 'gm! Season 2 packs just went live. You held through Season 1, so your streak carries over.',
  url: 'acme.xyz/s2',
};
const opts = (a: string[]) => a.map((s) => ({ value: s, label: s }));
const fmt = (n: number) => n.toLocaleString('en-US');

/** Animated send progress: counter eases 0 → total, then onDone fires. */
function SendProgress({ total, label, onDone }: { total: number; label: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const dur = 3000; const t0 = performance.now(); let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * total));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => onDoneRef.current(), 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);
  return (
    <div className="wizdone" aria-live="polite">
      <span className="wizdone__icn wizdone__icn--live"><Icon name="send" size={24} strokeWidth={2} /></span>
      <span className="wizdone__count">{fmt(n)} <small>/ {fmt(total)}</small></span>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{label} you can safely leave this page.</p>
      <span className="wizdone__bar"><i style={{ width: `${(n / total) * 100}%` }} /></span>
    </div>
  );
}

export function CampaignWizard({ onExit, initialSegments, initialName }: { onExit: () => void; initialSegments?: string[]; initialName?: string }) {
  const segments = useSegments();
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [name, setName] = useState(initialName || 'Pack drop: Season 2');
  /* 2 had two campaign types and modelled them as a boolean. 2.5 has four, so the
     primary channel is now the channel id itself. `push` is kept below so every existing
     1.5 branch keeps working untouched — the two new channels are additive. */
  const [primary, setPrimary] = useState<ChannelId>('email');
  const [audMode, setAudMode] = useState<'segments' | 'lists' | 'contacts' | 'everyone'>('segments');
  const [segs, setSegs] = useState<string[]>(initialSegments && initialSegments.length ? initialSegments : ['active', 'whales']);
  const [segQ, setSegQ] = useState('');
  const [lists, setLists] = useState<string[]>(['s2wait']);
  const [listQ, setListQ] = useState('');
  const [exclude, setExclude] = useState<string[]>(['suppressed']);
  const [picked, setPicked] = useState<number[]>([0, 1, 2]);
  const [smart, setSmart] = useState(true);
  const [utmOpen, setUtmOpen] = useState(false);
  const [subject, setSubject] = useState('Season 2 packs are live. Crack the vault');
  const [tplId, setTplId] = useState('launch');
  const [pushContent, setPushContent] = useState<PushContent>(defaultPush);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sendMode, setSendMode] = useState<'now' | 'later' | 'best'>('now');
  const [schedDay, setSchedDay] = useState(28);
  const [schedTime, setSchedTime] = useState('09:00');
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('optimus@example.com');
  const [testSent, setTestSent] = useState(false);
  const [replyTo, setReplyTo] = useState(false);
  const sender = useSender();
  const pushSdk = usePushInstall();
  const mobile = useMobileInstall();
  const xApp = useX();
  const freq = useFrequency();
  const holdout = useHoldout();
  // 2.5: what this campaign is for, and where to go if the first channel doesn't land.
  const [goal, setGoal] = useState('mint');
  const [fallback, setFallback] = useState<ChannelId | null>(null);
  const [fbWait, setFbWait] = useState(24);
  const [xContent, setXContent] = useState(defaultXdm);
  // The wizard owns the email body so it can check what it is actually about to send.
  const [emailBlocks, setEmailBlocks] = useState<Block[]>(() => defaultEmailBlocks());

  const push = primary === 'push';
  const isX = primary === 'x';
  const constraint = CONSTRAINTS[primary] ?? null;
  const missingTags = missingRequiredTags(emailBlocks.map((b) => b.text ?? '').join('\n'));
  // Each channel has its own setup gate. Email needs a verified domain and a compliant
  // footer; push needs an SDK that has reported someone reachable — without one the queue
  // drains into nothing and the campaign reads as "sent" while reaching nobody. Web and
  // mobile are separate installs, so the gate follows the chosen surface.
  const mobileSurface = pushContent.surface === 'mobile';
  const pushInstall = mobileSurface ? mobile : pushSdk;
  /* X gates on the same principle as the other two, but the second signal is the audience
     itself rather than a handshake: an authorised app with no followers can be set up
     perfectly and still reach zero people. */
  const blockedReason = isX
    ? xApp.status === 'none' ? 'Authorise your X app first'
      : xApp.status === 'pending' ? 'No followers with a linked wallet yet'
      : null
    : push
    ? pushInstall.status !== 'connected' ? `Set up ${mobileSurface ? 'mobile' : 'web'} push first` : null
    : sender.status !== 'verified' ? 'Verify a sending domain first'
    : missingTags.length ? `Footer is missing ${missingTags.join(', ')}`
    : null;

  const walletish = push || isX;
  const rawGross = audMode === 'everyone' ? (walletish ? 5210 : 4182)
    : audMode === 'contacts' ? picked.length
    : audMode === 'lists' ? CAMPAIGN_LISTS.filter((l) => lists.includes(l.id)).reduce((a, l) => a + (walletish ? l.wallet : l.email), 0)
    : segments.filter((s) => segs.includes(s.id)).reduce((a, s) => a + (walletish ? s.wallet : s.email), 0);
  /* On a permission-gated channel the segment is not the audience — the opt-in list is,
     and the segment only narrows it. Capping here rather than warning later is the point:
     every downstream number, including the send-window estimate, is then real.

     `typicalReach` is a population statistic, so it only applies to a population. In
     Contacts mode the operator has named specific people, and scaling a hand-picked list
     by a share is meaningless — three named contacts became "1 subscriber", and two became
     zero, which silently disabled Continue with nothing on screen to explain it. Named
     contacts are therefore taken at face value and only bounded by the opt-in ceiling. */
  const ceiling = isX ? xApp.reachableFollowers : Infinity;
  const gross = !constraint ? rawGross
    // "Everyone" on a permission-gated channel is the opt-in list itself, exactly — there
    // is no wider population to take a share of.
    : audMode === 'everyone' ? ceiling
    // Named contacts are taken at face value; only the opt-in ceiling bounds them.
    : audMode === 'contacts' ? Math.min(rawGross, ceiling)
    // Segments and lists are populations, which is the only place a share belongs.
    : Math.min(Math.round(rawGross * constraint.typicalReach), ceiling);
  /** Selected by the segment but unreachable on this channel — never silently dropped. */
  const unaddressable = Math.max(0, rawGross - gross);
  const excluded = EXCLUDABLE.filter((e) => exclude.includes(e.id) && !e.always).reduce((a, e) => a + (e.n ?? 0), 0);
  /* The frequency budget is a real deduction, not a warning — a contact already at their
     weekly cap is skipped, so showing them in the estimate would overstate reach.
     The share skipped has to fall as the cap rises: at 1/week most of an active audience
     is already spent, at 10/week almost none of it is. The previous form divided by
     `maxPerWeek - 2` clamped at 1, which made caps of 1, 2 and 3 all skip an identical
     11% — so tightening the budget threefold changed nothing on screen. */
  const overBudgetShare = 0.33 / freq.maxPerWeek;
  const overBudget = freq.enabled ? Math.round((gross - excluded) * overBudgetShare) : 0;
  const eligible = Math.max(0, gross - excluded - overBudget);
  /* The holdout comes out of the eligible audience, not off the top of the segment: it has
     to be a random slice of the people who would otherwise have been messaged, or it is not
     a control group. `recipients` stays the number actually sent, so every downstream
     estimate — send window, cost, preview — keeps meaning what it says. */
  const heldBack = Math.round(eligible * (holdout.campaignPct / 100));
  const recipients = Math.max(0, eligible - heldBack);
  const mde = heldBack > 0 ? minDetectableEffect(recipients, heldBack, 0.15) : Infinity;
  const measurable = heldBack > 0 && eligible >= SINGLE_CAMPAIGN_FLOOR;
  const goalMeta = goalById(goal);
  /* The primary channel, looked up rather than inferred.
     1.5 modelled the channel as a boolean and 1.8 added two more on top of it, so every
     surviving `push ? … : 'email'` quietly meant "email" for X. The route panel read that
     way and told an X campaign it was sending email. */
  const primaryMeta = ROUTABLE.find((r) => r.id === primary) ?? ROUTABLE.find((r) => r.id === 'email')!;
  const fallbackMeta = ROUTABLE.find((r) => r.id === fallback) ?? null;
  const fbConstraint = fallback ? CONSTRAINTS[fallback] ?? null : null;
  // Who the first hop failed to engage — the pool a fallback draws from.
  const unreached = Math.round(recipients * 0.62);
  // On a constrained channel only a fraction of that pool is addressable at all.
  const fallbackReach = fbConstraint ? Math.round(unreached * fbConstraint.typicalReach) : unreached;
  const noun = isX ? 'followers' : push ? 'wallets' : 'recipients';
  const toggleSeg = (id: string) => setSegs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleList = (id: string) => setLists((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleExcl = (id: string) => setExclude((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const pushPreview = <PushPreview c={pushContent} />;
  const pushSurfaceName = SURFACES.find((x) => x.id === pushContent.surface)!.name;
  // Queued web pushes fire on next connect, so 'send' is really 'enqueue'.
  const queued = push && pushContent.surface !== 'mobile' && pushContent.delivery === 'queue';
  // Rough split so the operator sees reach isn't instant. Typical 7-day return rate.
  const connectSoon = Math.round(recipients * 0.24);

  /* The conversion goal, demoted.
   *
   * It started life as the first question in the builder, which was wrong twice over. It
   * asked for a decision before the operator had chosen an audience or written anything,
   * and it is the same answer nearly every time — a project's campaigns almost all aim at
   * one event. Worse, it justified the position by claiming the goal could not be applied
   * retroactively, which is not true here: we index the chain, so the events and the send
   * timestamps both already exist and attribution can be recomputed whenever the goal
   * changes. So it sits on Review as a default you can override, and stays editable on the
   * report afterwards. */
  const goalPicker = (
    <div className="field">
      <span className="field__lbl">Conversion goal</span>
      <div className="goalgrid">
        {GOALS.map((g) => (
          <button key={g.id} type="button" className={`goalgrid__btn${goal === g.id ? ' on' : ''}`} onClick={() => setGoal(g.id)} aria-pressed={goal === g.id}>
            <Icon name={g.icon} size={15} />{g.label}
          </button>
        ))}
      </div>
      <p className="field__hint">
        {goal === 'none'
          ? 'No conversion tracking. This campaign reports reach and engagement only. You can add a goal later.'
          : `Wallets that ${goalMeta.verb} within ${goalMeta.windowDays} days of receiving this count as converted. Change it any time. Attribution recomputes from indexed on-chain events.`}
      </p>
    </div>
  );

  const audienceStep = (
    <div className="wiz__panelbody">
      <div className="field">
        <span className="field__lbl">Campaign type</span>
        <div className="sendopt sendopt--row sendopt--trio">
          {TYPES.map((t) => (
            <button key={t.id} type="button" className={primary === t.id ? 'on' : ''} onClick={() => {
              setPrimary(t.id);
              // Per-person send timing is email-only. Left set, it would silently carry
              // into a push or X campaign and claim a 24h window that channel never has.
              if (t.id !== 'email') setSendMode((m) => (m === 'best' ? 'now' : m));
              // A channel cannot fall back to itself. Switching primary onto the current
              // fallback would otherwise leave an X → X route selected.
              setFallback((f) => (f === t.id ? null : f));
            }}>
              <span className="sendopt__icn"><Icon name={t.icon} size={16} /></span>
              <span className="sendopt__txt"><b>{t.name}</b><span>{t.sub}</span></span>
              <span className="sendopt__dot" />
            </button>
          ))}
        </div>
        <p className="field__hint">
          {isX ? 'Delivered as an X DM, only to accounts that follow you.'
            : push ? 'Delivered inside your app. Contacts need a connected wallet.'
            : 'Delivered by email. Contacts need an email address.'}
        </p>
        {/* The setup blocker belongs on the step where Continue is disabled. Leaving it on
            review means an operator with an empty channel picks a type, finds Continue
            greyed out, and is told nothing about why until three steps later. */}
        {isX && blockedReason && recipients === 0 && (
          <div className="senderwarn">
            <Icon name="triangle-alert" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>{blockedReason}.</b>{' '}
              {xApp.status === 'pending'
                ? <>@{xApp.handle} is authorised, but X only allows DMs to accounts that follow you, and none of your followers has a linked wallet yet. Add a &ldquo;Link X&rdquo; field to your forms.</>
                : <>Authorise an X app in <b>Integrations → Channels</b> to send DMs.</>}
              {/* The dead end this used to be: "Integrations → Channels" is no help when
                  it is not your login. */}
              <span style={{ display: 'block', marginTop: 8 }}>
                <HandoffInline channel="x" compact />
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="field">
        <span className="field__lbl">Send to</span>
        {/* A tablist must contain tabs, and these never were — there are no tabpanels and
            no roving focus. They are a toggle group, so aria-pressed is the honest role. */}
        <div className="wiz__seg" role="group" aria-label="Audience source">
          {([['segments', 'Segments'], ['lists', 'Lists'], ['contacts', 'Contacts'], ['everyone', 'Everyone']] as const).map(([id, l]) => (
            <button key={id} type="button" aria-pressed={audMode === id}
              className={audMode === id ? 'on' : ''} onClick={() => setAudMode(id)}>{l}</button>
          ))}
        </div>

        {audMode === 'segments' ? (() => {
          const filtered = segments.filter((s) => (s.name + ' ' + s.desc).toLowerCase().includes(segQ.trim().toLowerCase()));
          return (
            <div className="segpick">
              <div className="segpick__search"><Icon name="search" size={15} color="var(--text-tertiary)" /><input placeholder="Search segments…" value={segQ} onChange={(e) => setSegQ(e.target.value)} aria-label="Search segments" /></div>
              <div className="segpick__list">
                {filtered.map((s) => (
                  <div key={s.id} className={`segpick__row${segs.includes(s.id) ? ' on' : ''}`} role="button" tabIndex={0}
                    aria-pressed={segs.includes(s.id)} aria-label={s.name}
                    onClick={() => toggleSeg(s.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSeg(s.id); } }}>
                    {/* The row is the control — a real checkbox here would be a second,
                        unlabelled control nested inside it. */}
                    <CheckMark on={segs.includes(s.id)} />
                    <span className="segpick__txt"><b>{s.name}</b><span>{s.desc}</span></span>
                    <span className="segpick__n">{fmt(walletish ? s.wallet : s.email)}</span>
                  </div>
                ))}
                {filtered.length === 0 && <div className="segpick__empty">No segments match “{segQ}”.</div>}
              </div>
              <div className="segpick__foot">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{segs.length} of {SEGMENTS.length} selected</span>
                {segs.length > 0 && <button type="button" className="segpick__clear" onClick={() => setSegs([])}>Clear</button>}
              </div>
            </div>
          );
        })() : audMode === 'lists' ? (() => {
          const filtered = CAMPAIGN_LISTS.filter((l) => (l.name + ' ' + l.desc).toLowerCase().includes(listQ.trim().toLowerCase()));
          return (
            <div className="segpick">
              <div className="segpick__search"><Icon name="search" size={15} color="var(--text-tertiary)" /><input placeholder="Search lists…" value={listQ} onChange={(e) => setListQ(e.target.value)} aria-label="Search lists" /></div>
              <div className="segpick__list">
                {filtered.map((l) => (
                  <div key={l.id} className={`segpick__row${lists.includes(l.id) ? ' on' : ''}`} role="button" tabIndex={0}
                    aria-pressed={lists.includes(l.id)} aria-label={l.name}
                    onClick={() => toggleList(l.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleList(l.id); } }}>
                    <CheckMark on={lists.includes(l.id)} />
                    <span className="segpick__txt"><b>{l.name}</b><span>{l.desc}</span></span>
                    <span className="segpick__n">{fmt(walletish ? l.wallet : l.email)}</span>
                  </div>
                ))}
                {filtered.length === 0 && <div className="segpick__empty">No lists match “{listQ}”.</div>}
              </div>
              <div className="segpick__foot">
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lists.length} of {CAMPAIGN_LISTS.length} selected</span>
                {lists.length > 0 && <button type="button" className="segpick__clear" onClick={() => setLists([])}>Clear</button>}
              </div>
            </div>
          );
        })() : audMode === 'contacts' ? (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {CONTACTS.map((c, i) => (
              <div className="contact" key={c.email}>
                <Checkbox label={c.name} labelHidden checked={picked.includes(i)} onChange={() => setPicked((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]))} />
                <span>{c.name}</span><em style={walletish ? { fontFamily: 'var(--font-mono)', fontSize: 12 } : undefined}>{walletish ? c.wallet : c.email}</em>
              </div>
            ))}
          </div>
        ) : (
          <p className="field__hint" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {isX ? `Every follower with a linked wallet: ${fmt(xApp.reachableFollowers)}. X rejects a DM to anyone who doesn't follow you.`
              : push ? 'All 5,210 contacts with a connected wallet. Muted devices are always excluded.'
              : 'All 4,182 contacts with a verified email. Unsubscribed and bounced addresses are always excluded.'}
          </p>
        )}
        {/* The constraint belongs here, attached to the audience, not on the review step.
            By review the operator has already written the message and made their plan
            around a reach number — telling them then that four fifths of it was never
            addressable is the same information delivered too late to be useful. */}
        {constraint && (
          <div className="constraint">
            <Icon name="info" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>{constraint.rule}</b> {constraint.because}
              {' '}Your selection covers <b>{fmt(rawGross)}</b> wallets, but only <b>{fmt(gross)}</b> are {constraint.noun}
              {ceiling !== Infinity && gross >= ceiling ? `, the whole of your ${fmt(ceiling)}-strong opt-in list` : ''}.
              {unaddressable > 0 && <> The other {fmt(unaddressable)} cannot be delivered to at all and are excluded from every number below.</>}
              <em className="constraint__grow">{constraint.grow}</em>
            </span>
          </div>
        )}
        {audMode === 'segments' && <p className="field__hint">Overlapping wallets are only messaged once.</p>}
        {audMode === 'lists' && <p className="field__hint">Lists are built from form sign-ups and imports. A wallet on several lists is only messaged once.</p>}
        {/* Email and push skip people for lack of an address or a device. X skips them
            for lack of consent, which the constraint block above already covers
            in full — running both would state the same shortfall twice, in two different
            framings, with two different numbers. */}
        {audMode === 'segments' && segs.length > 0 && !constraint && (() => {
          const chosen = segments.filter((s) => segs.includes(s.id));
          const tot = chosen.reduce((a, s) => a + s.count, 0);
          const reach = chosen.reduce((a, s) => a + (push ? s.wallet : s.email), 0);
          const skipped = Math.max(0, tot - reach);
          return skipped > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-selected)', border: '1px solid var(--border-default)' }}>
              <Icon name="triangle-alert" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{fmt(skipped)} of {fmt(tot)} wallets {push ? 'have no linked wallet for in-app push' : "don't have a verified email"} and will be skipped. {push ? 'Add email as a fallback channel' : 'Switch to In-app push'} to reach more.</span>
            </div>
          ) : null;
        })()}
      </div>

      <div className="field">
        <span className="field__lbl">Don't send to</span>
        <div className="segrow">
          {EXCLUDABLE.map((e) => (
            <Chip key={e.id} icon={e.always ? 'shield' : 'user-minus'} on={exclude.includes(e.id)} onClick={() => !e.always && toggleExcl(e.id)}>
              {e.label}{e.always ? ' · always' : e.n ? ` · ${fmt(e.n)}` : ''}
            </Chip>
          ))}
        </div>
        <p className="field__hint">Suppressed and unsubscribed wallets are always excluded. Excluded wallets are already removed from the estimate.</p>
        {/* Stated before the send, not discovered in the report. An operator who learns
            afterwards that their campaign could never have been measured has already spent
            the audience — this is the moment to raise the holdout or accept that the answer
            comes from the programme-level control instead. */}
        {heldBack > 0 && (
          <div className={measurable ? 'freqnote' : 'constraint'}>
            <Icon name={measurable ? 'flask-conical' : 'triangle-alert'} size={15}
              color={measurable ? 'var(--action-primary)' : 'var(--orange-600)'} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>{fmt(heldBack)} held back</b> as a control: {holdout.campaignPct}% of the eligible audience, picked at
              random and never messaged, so this campaign can be compared against not sending it.{' '}
              {measurable
                ? <>Enough to detect a lift of about <b>{mde.toFixed(1)}pt</b> or larger.</>
                : <>
                    <b>Too small to settle on its own</b>: at this size the smallest detectable lift is {mde.toFixed(1)}pt,
                    which no realistic campaign clears. You would need about {fmt(requiredN(0.15, 3, holdout.campaignPct))} recipients
                    to resolve 3pt. Turn on the <b>programme holdout</b> in Settings instead: it accumulates across every
                    campaign rather than restarting each send.
                  </>}
            </span>
          </div>
        )}
        {overBudget > 0 && (
          <div className="freqnote">
            <Icon name="hand" size={15} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>{fmt(overBudget)}</b> more are over your frequency budget. They have already had {freq.maxPerWeek} message{freq.maxPerWeek === 1 ? '' : 's'} this week across all channels, so they are skipped rather than queued. Already removed from the estimate. Change it in <b>Settings → Account → Message frequency</b>.
            </span>
          </div>
        )}
      </div>

      <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, padding: '0 2px' }}>
        <Icon name="shield-check" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
        Recipients are matched through ZK-verified identity links. You send to them without their wallet identity ever being exposed to you.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <Switch checked={smart} onChange={setSmart} label="Smart sending" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Smart sending</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Skip anyone who already heard from you in the last 10 hours</span>
        </div>
      </div>

      {!push && (
        <div className="adv">
          <button type="button" className="adv__head" onClick={() => setUtmOpen((v) => !v)} aria-expanded={utmOpen}>
            <Icon name="chart-no-axes-column" size={16} />UTM tracking
            <Badge status="success">On · auto</Badge>
            <Icon name={utmOpen ? 'chevron-up' : 'chevron-down'} size={16} color="var(--text-tertiary)" style={{ marginLeft: 'auto' }} />
          </button>
          {utmOpen && (
            <div className="adv__body">
              <p className="field__hint" style={{ margin: 0 }}>Links get <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>utm_source=onchainsuite</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>utm_medium=email</code> and the campaign id. Override only if you need to.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field"><span className="field__lbl" style={{ fontSize: 12 }}>utm_campaign</span><div className="txt"><input defaultValue="pack_drop_s2" /></div></div>
                <div className="field"><span className="field__lbl" style={{ fontSize: 12 }}>utm_content</span><div className="txt"><input placeholder="optional" /></div></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const xStep = (
    <div className="wiz__panelbody">
      <div className="wiz-2up">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="field">
            <span className="field__lbl">Message</span>
            <textarea className="dmin" rows={5} value={xContent.text} aria-label="X DM message"
              onChange={(e) => setXContent({ ...xContent, text: e.target.value })} />
            <p className="field__hint">A DM that reads as a mail-merge gets reported, and enough reports cost you the endpoint entirely. Behavioural detail is what stops it reading as a blast.</p>
          </div>
          <div className="field">
            <span className="field__lbl">Link</span>
            <div className="txt"><input value={xContent.url} onChange={(e) => setXContent({ ...xContent, url: e.target.value })} aria-label="Link" /></div>
            <p className="field__hint">X does not support buttons in DMs. The link goes in the body.</p>
          </div>
          <div className="constraint">
            <Icon name="triangle-alert" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <b>Report rate is the metric that matters here.</b> Unlike an unsubscribe, enough
              reports revoke your app&apos;s DM access across every campaign. This send is capped at
              {' '}{fmt(Math.min(recipients, 1000))} DMs a day by the API and paced automatically.
            </span>
          </div>
        </div>
        <div className="field" style={{ position: 'sticky', top: 8 }}>
          <span className="field__lbl">Preview</span>
          <div className="dmprev dmprev--x">
            <div className="dmprev__bar"><span className="dmprev__av">{(xApp.handle || 'X')[0].toUpperCase()}</span><b>@{xApp.handle || 'yourhandle'}</b></div>
            <div className="dmprev__body">
              <div className="dmprev__bubble dmprev__bubble--x">
                {xContent.text.split('\n').map((l, i) => <span key={i}>{l || ' '}</span>)}
                <span className="dmprev__link">{xContent.url}</span>
              </div>
            </div>
          </div>
          <p className="field__hint">Only accounts that follow @{xApp.handle || 'you'} can receive this.</p>
        </div>
      </div>
    </div>
  );

  const otherStep = push ? (
    <div className="wiz__panelbody">
      <div className="wiz-2up">
        <PushComposer value={pushContent} onChange={setPushContent} />
        <div className="field" style={{ position: 'sticky', top: 8 }}>
          <span className="field__lbl">Preview · {pushSurfaceName}</span>
          {pushPreview}
          <p className="field__hint">
            {pushContent.surface === 'mobile'
              ? 'Needs the mobile SDK and notification permission.'
              : `Rendered by the web SDK in your dApp. Shows ${pushContent.frequency.toLowerCase()}.`}
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="wiz__panelbody">
      <div className="wiz-2up">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="field"><span className="field__lbl">Subject line</span><div className="txt"><input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ paddingRight: 44 }} /><span className="txt__count" style={{ color: subject.length > 60 ? 'var(--orange-600)' : undefined }}>{subject.length}</span></div><p className="field__hint">Keep it under 60 characters so it doesn't truncate on mobile.</p></div>
          <div className="field"><span className="field__lbl">Preview text</span><div className="txt"><input defaultValue="Collect Packs. Earn Hammers. Crack the Vault." /></div></div>
          {sender.status !== 'verified' && (
            <div className="senderwarn">
              <Icon name="triangle-alert" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {sender.status === 'pending'
                  ? <><b>{sender.domain}</b> is awaiting DNS. Branded email can&apos;t send until DKIM and SPF resolve. Finish it in <b>Integrations → Channels → Email</b>.</>
                  : <>No verified sending domain. Branded email can&apos;t send until you verify one in <b>Integrations → Channels → Email</b>. In-app push is unaffected.</>}
              </span>
            </div>
          )}
          <Select label="Send as" options={opts(['Acme · no-reply@example.com', 'Acme · noreply@example.com'])} helper="Verified senders only. Manage them in Integrations → Channels → Email." />
          <Checkbox label="Send replies to a different address" checked={replyTo} onChange={setReplyTo} />
          {replyTo && <div className="field"><span className="field__lbl">Reply-to address</span><div className="txt"><input defaultValue="support@example.com" placeholder="replies@example.com" /></div><p className="field__hint">Replies land here instead of the sender address.</p></div>}
        </div>
        <div className="field">
          <span className="field__lbl">Template</span>
          <div className="tpl">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className={`tpl__card${tplId === t.id ? ' on' : ''}`} onClick={() => setTplId(t.id)}>
                <span className="tpl__thumb" aria-hidden>{t.bars.map((w, i) => <i key={i} style={{ height: i === 0 ? 12 : 7, width: `${w * 100}%`, opacity: w === 0 ? 0 : 1 }} />)}</span>
                <span className="tpl__meta"><b>{t.name}</b><span>{t.sub}</span></span>
              </button>
            ))}
          </div>
          <div><Button variant="secondary" size="s" icon="pen-line" onClick={() => setEditorOpen(true)}>Open in editor</Button></div>
        </div>
      </div>
    </div>
  );

  const messageStep = isX ? xStep : otherStep;

  const reviewStep = (
    <div className="wiz__panelbody">
      <div className="wiz-2up wiz-2up--review">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="field">
            <span className="field__lbl">Details</span>
            <div className="rev__rows">
              {([
                [0, 'Audience', `${fmt(recipients)} ${noun}${smart ? ' · smart sending on' : ''}`],
                [1, 'Message', isX ? `DM from @${xApp.handle || 'yourhandle'} · ${xContent.text.length} characters`
                  : push ? `“${pushContent.title}” · ${pushSurfaceName.toLowerCase()}`
                  : `${TEMPLATES.find((t) => t.id === tplId)!.name} · Acme · no-reply@example.com`],
                [1, 'Delivery', queued
                  ? `Queued per wallet · fires on next connect · expires in ${pushContent.ttlDays} days`
                  : isX ? 'Paced under the X DM rate limit'
                  : sendMode === 'best' ? `Staggered per person · completes within ${SEND_TIME.windowHours}h`
                  : push ? 'Delivered to wallets connected right now' : 'Sent immediately'],
                [0, 'Tracking', isX ? 'Delivered & clicked · report rate monitored'
                  : push ? 'Delivery & open tracking on' : 'Links auto-tagged with UTM parameters'],
              ] as const).map(([target, label, detail]) => (
                <div className="rev__row" key={label}>
                  <span className="check__ok"><Icon name="check" size={12} strokeWidth={2.5} /></span>
                  <span className="rev__rowtxt"><b>{label}</b><span>{detail}</span></span>
                  <button type="button" className="check__edit" onClick={() => setStep(target)}>Edit</button>
                </div>
              ))}
            </div>
          </div>
          {blockedReason && (
            <div className="senderwarn">
              <Icon name="triangle-alert" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                {isX
                  ? xApp.status === 'pending'
                    ? <><b>@{xApp.handle}</b> is authorised, but no follower has a linked wallet yet. X only permits DMs to accounts that follow you, so until a follower links a wallet there is nobody to send to.</>
                    : <>This can&apos;t send until you authorise an X app with DM access in <b>Integrations → Channels</b>.</>
                  : push
                  ? mobileSurface
                    ? mobile.status === 'pending'
                      ? mobile.apns || mobile.fcm
                        ? <>No device has registered for <b>{mobile.bundleId}</b> yet. A device token only exists once someone grants the notification prompt. Finish it in <b>Integrations → Channels</b>.</>
                        : <><b>{mobile.bundleId}</b> has no store credential yet, so nothing can register a device. Add APNs or FCM in <b>Integrations → Channels</b>.</>
                      : <>This push can’t send until the mobile SDK is set up. Register your app in <b>Integrations → Channels</b>.</>
                    : pushSdk.status === 'pending'
                      ? <>The SDK on <b>{pushSdk.origin}</b> hasn’t reported a connected wallet yet, so there is nobody to queue this for. Finish it in <b>Integrations → Channels</b>.</>
                      : <>This push can’t send until the SDK is installed in your dApp. Set it up in <b>Integrations → Channels</b>.</>
                  : missingTags.length && sender.status === 'verified'
                    ? <>This email can&apos;t send: its footer is missing <b>{missingTags.join(', ')}</b>. Every email must identify the sender and offer a way to unsubscribe. Fix it in <b>Open in editor</b> on the Message step.</>
                    : <>This email can&apos;t send until you verify a sending domain in <b>Integrations → Channels → Email</b>.</>}
              </span>
            </div>
          )}
          {queued && (
            <div className="queuenote">
              <Icon name="clock" size={15} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                <b>{fmt(recipients)}</b> wallets get this queued. It fires the next time each one connects, roughly <b>{fmt(connectSoon)}</b> within 7 days, the rest as they return. Anything unseen after{' '}
                {pushContent.ttlDays} days expires. Report on <b>Queued → Delivered → Viewed → Clicked</b>, not opens.
              </span>
            </div>
          )}
          {/* Fallback, not multi-send.
              Picking two channels and firing both is the thing that makes people mute you.
              A route sends the second only to the people the first failed to reach, which
              is why the wait is mandatory and the estimate below is a subset, not a sum. */}
          <div className="field">
            <span className="field__lbl">If they don&apos;t engage</span>
            <div className="route">
              <div className="route__now">
                <span className="route__ic"><Icon name={primaryMeta.icon} size={15} /></span>
                <span className="route__tx"><b>{primaryMeta.label}</b><span>Sends first, to everyone</span></span>
                <span className="route__n">{fmt(recipients)}</span>
              </div>
              <div className="route__arm">
                <select className="route__sel" value={fallback ?? ''} onChange={(e) => setFallback((e.target.value || null) as ChannelId | null)} aria-label="Fallback channel">
                  <option value="">No fallback (send once)</option>
                  {ROUTABLE.filter((r) => r.id !== primary).map((r) => (
                    <option key={r.id} value={r.id}>Then try {r.label}</option>
                  ))}
                </select>
                {fallback && (
                  <select className="route__sel route__sel--slim" value={fbWait} onChange={(e) => setFbWait(Number(e.target.value))} aria-label="Wait before fallback">
                    {[6, 12, 24, 48, 72].map((h) => <option key={h} value={h}>after {h}h</option>)}
                  </select>
                )}
              </div>
              {fallbackMeta && (
                <div className="route__then">
                  <span className="route__ic"><Icon name={fallbackMeta.icon} size={15} /></span>
                  <span className="route__tx"><b>{fallbackMeta.label}</b><span>{fallbackMeta.note}</span></span>
                  <span className="route__n">~{fmt(fallbackReach)}</span>
                </div>
              )}
            </div>
            {/* The constraint is part of the number, not a caveat under it. Showing an
                unmissed-audience figure for X and then explaining afterwards that most
                of them aren't addressable is how an operator ends up planning a campaign
                around reach that never existed. */}
            {fbConstraint && (
              <div className="constraint">
                <Icon name="info" size={15} color="var(--orange-600)" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  <b>{fbConstraint.rule}</b> {fbConstraint.because}{' '}
                  Of the {fmt(unreached)} this would fall through to, about <b>{fmt(fallbackReach)}</b> are {fbConstraint.noun}. The rest can&apos;t be delivered to at all, and are not counted above.
                  <em className="constraint__grow">{fbConstraint.grow}</em>
                </span>
              </div>
            )}
            <p className="field__hint">
              {fallbackMeta
                ? `Only people who haven't opened or clicked after ${fbWait} hours get the ${fallbackMeta.label} message: ${fmt(fallbackReach)} of them. Nobody receives both.`
                : 'Everyone gets one message on one channel. Add a fallback to reach the people it misses.'}
            </p>
          </div>

          {goalPicker}

          <div className="field">
            <span className="field__lbl">Delivery</span>
            <div className="sendopt">
              <button type="button" className={sendMode === 'now' ? 'on' : ''} onClick={() => setSendMode('now')}>
                <span className="sendopt__icn"><Icon name="send" size={16} /></span>
                <span className="sendopt__txt"><b>Send now</b><span>Delivery starts immediately</span></span>
                <span className="sendopt__dot" />
              </button>
              <button type="button" className={sendMode === 'later' ? 'on' : ''} onClick={() => setSendMode('later')}>
                <span className="sendopt__icn"><Icon name="clock" size={16} /></span>
                <span className="sendopt__txt"><b>Schedule</b><span>Pick a date and time</span></span>
                <span className="sendopt__dot" />
              </button>
              {/* Email only. Push and X already arrive when the person is present — a
                  device is either connected or it isn't — so a per-person send hour is an
                  email idea and offering it elsewhere would be theatre. */}
              {!push && !isX && (
                <button type="button" className={sendMode === 'best' ? 'on' : ''} onClick={() => setSendMode('best')}>
                  <span className="sendopt__icn"><Icon name="target" size={16} /></span>
                  <span className="sendopt__txt"><b>Best time per person</b><span>Staggered over {SEND_TIME.windowHours}h</span></span>
                  <span className="sendopt__dot" />
                </button>
              )}
            </div>
            {sendMode === 'best' && (
              <div className="besttime">
                <div className="besttime__hd">
                  <b>Predicted delivery spread</b>
                  <span>{sendTimeSummary(recipients)}</span>
                </div>
                <div className="besttime__chart" role="img" aria-label={`Predicted delivery by hour. Peak around ${SEND_TIME.fallbackHour}:00 and again in the early evening.`}>
                  {SEND_TIME_CURVE.map((v, h) => (
                    <span key={h} className="besttime__bar" title={`${h}:00, ${Math.round(recipients * (v / 100))} recipients`}>
                      <i style={{ height: `${(v / Math.max(...SEND_TIME_CURVE)) * 100}%` }} />
                    </span>
                  ))}
                </div>
                <div className="besttime__axis"><span>00:00</span><span>12:00</span><span>23:00</span></div>
                <p className="besttime__note">
                  Each contact is sent at their own historical peak-open hour, learned from
                  when they have opened before. The {Math.round((1 - SEND_TIME.modelled) * 100)}% with too little
                  history fall back to your workspace peak of {SEND_TIME.fallbackHour}:00.
                  <b> The campaign completes over {SEND_TIME.windowHours} hours, not at one moment</b>, so don&apos;t use it for a timed drop.
                </p>
              </div>
            )}
            {sendMode === 'later' && (
              <div style={{ marginTop: 8, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <b style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>July 2026</b>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><Icon name="chevron-left" size={14} /></span>
                    <span style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><Icon name="chevron-right" size={14} /></span>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 0' }}>{d}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const past = d < 24; const on = d === schedDay;
                    return <button key={d} type="button" disabled={past} onClick={() => setSchedDay(d)} style={{ aspectRatio: '1', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 12, fontVariantNumeric: 'tabular-nums', cursor: past ? 'default' : 'pointer', background: on ? 'var(--action-primary)' : 'transparent', color: on ? '#fff' : past ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: past ? 0.4 : 1, fontWeight: on ? 600 : 400 }}>{d}</button>;
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>At</span>
                  <div className="txt" style={{ width: 130 }}><input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} /></div>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>Sends Jul {schedDay}, {schedTime} · your timezone</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="field">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="field__lbl" style={{ marginRight: 'auto' }}>{isX ? 'DM preview' : push ? 'Notification preview' : 'Inbox preview'}</span>
            <Button variant="secondary" size="s" icon="flask-conical" onClick={() => { setTestOpen((v) => !v); setTestSent(false); }}>Send a test</Button>
          </div>
          {testOpen && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)' }}>
              {testSent ? (
                <>
                  <span className="check__ok"><Icon name="check" size={12} strokeWidth={2.5} /></span>
                  {/* Every channel confirms in its own terms. This branch used to test only
                      `push`, so X fell through to email's wording and named an address and
                      a subject line that X does not have. */}
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                    {isX ? <>Test DM sent from <b>@{xApp.handle || 'yourhandle'}</b> to your workspace admins.</>
                      : push ? 'Test push sent to your device.'
                      : <>Test sent to <b>{testTo}</b>. The subject is prefixed with [TEST].</>}
                  </span>
                  <button type="button" className="check__edit" onClick={() => setTestSent(false)}>Send another</button>
                </>
              ) : isX ? (
                <>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text-secondary)' }}>
                    Sends to the X accounts of your workspace admins.
                  </span>
                  <Button size="s" onClick={() => setTestSent(true)}>Send test</Button>
                </>
              ) : push ? (
                <>
                  <span style={{ flex: 1, fontSize: 14, color: 'var(--text-secondary)' }}>Sends to devices signed in with your admin wallet.</span>
                  <Button size="s" onClick={() => setTestSent(true)}>Send test</Button>
                </>
              ) : (
                <>
                  <div className="txt" style={{ flex: 1 }}><input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" aria-label="Test recipient email" /></div>
                  <Button size="s" onClick={() => setTestSent(true)} disabled={!testTo.includes('@')}>Send test</Button>
                </>
              )}
            </div>
          )}
          <div className="rev__mail">
            {isX ? (
              <dl className="rev__meta"><dt>From</dt><dd>@{xApp.handle || 'yourhandle'}</dd><dt>To</dt><dd>{fmt(recipients)} followers</dd></dl>
            ) : push ? (
              <dl className="rev__meta"><dt>To</dt><dd>{fmt(recipients)} wallets</dd><dt>Opens</dt><dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 12 }}>{pushContent.ctaUrl}</dd></dl>
            ) : (
              <dl className="rev__meta"><dt>From</dt><dd>Acme · no-reply@example.com</dd><dt>To</dt><dd>{fmt(recipients)} recipients</dd><dt>Subject</dt><dd>{subject || 'No subject yet'}</dd></dl>
            )}
            {isX ? (
              <div className="rev__mailbody">
                <div className="dmprev__bubble dmprev__bubble--x" style={{ margin: 16 }}>
                  {xContent.text.split('\n').map((l, i) => <span key={i}>{l || ' '}</span>)}
                  <span className="dmprev__link">{xContent.url}</span>
                </div>
              </div>
            ) : push ? pushPreview : (
              <div className="rev__mailbody" aria-label="Email body preview">
                <div className="rev__email">
                  <span className="rev__banner"><Icon name="image" size={22} strokeWidth={1.5} /></span>
                  <h3>Season 2 packs are live</h3>
                  <p>Collect Packs, earn Hammers, and take your shot at cracking the vault. Season 2 adds 12 new pack tiers and a bigger prize pool.</p>
                  <span className="rev__cta">Open Acme</span>
                  <span className="rev__emailfoot">
                    {[FOOTER_REASON, FOOTER_LEGAL, FOOTER_LINKS].map((l) => <span key={l} style={{ display: 'block' }}>{renderTags(l)}</span>)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const summary = (
    <aside className="sum">
      <div className="sum__card">
        <div className="sum__big"><b>{fmt(recipients)}</b><span>Estimated {noun}</span></div>
        <dl>
          <div className="sum__row"><dt>Goal</dt><dd>{goalMeta.label}{goal !== 'none' ? ` · ${goalMeta.windowDays}d window` : ''}</dd></div>
          <div className="sum__row"><dt>Channel</dt><dd>{TYPES.find((t) => t.id === primary)!.name}{fallbackMeta ? ` → ${fallbackMeta.label}` : ''}</dd></div>
          {/* Sender, template and CTA are per-channel — an X campaign has no template and
              no from-address, and showing email's would be a lie on screen. */}
          {isX ? (
            <div className="sum__row"><dt>Sender</dt><dd>@{xApp.handle || 'yourhandle'}</dd></div>
          ) : push ? (
            <div className="sum__row"><dt>Opens</dt><dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 12 }}>{pushContent.ctaUrl}</dd></div>
          ) : (
            <>
              <div className="sum__row"><dt>Sender</dt><dd>no-reply@example.com</dd></div>
              <div className="sum__row"><dt>Template</dt><dd>{TEMPLATES.find((t) => t.id === tplId)!.name}</dd></div>
            </>
          )}
          {unaddressable > 0 && <div className="sum__row"><dt>Not reachable</dt><dd>{fmt(unaddressable)} on this channel</dd></div>}
          <div className="sum__row"><dt>Delivery</dt><dd>
            {queued ? 'On next connect'
              : sendMode === 'best' ? `Completes within ${SEND_TIME.windowHours}h`
              : sendMode === 'now' ? 'Immediately'
              : `Jul ${schedDay}, ${schedTime}`}
          </dd></div>
          {queued && <div className="sum__row"><dt>Expires</dt><dd>{pushContent.ttlDays} days</dd></div>}
          {excluded > 0 && <div className="sum__row"><dt>Excluded</dt><dd>{fmt(excluded)} wallets</dd></div>}
          {overBudget > 0 && <div className="sum__row"><dt>Over budget</dt><dd>{fmt(overBudget)} skipped</dd></div>}
          {heldBack > 0 && <div className="sum__row"><dt>Held back</dt><dd>{fmt(heldBack)} · control</dd></div>}
          <div className="sum__row"><dt>Smart sending</dt><dd>{smart ? 'On' : 'Off'}</dd></div>
        </dl>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', padding: '0 4px' }}>Draft autosaves as you go. Nothing sends until you confirm on the review step.</p>
    </aside>
  );

  if (sent || sending) {
    return (
      <div className="page page--wide"><div className="wiz">
        <div className="wiz__panel" style={{ maxWidth: 720, margin: '48px auto 0', width: '100%' }}>
          {sending ? (
            <SendProgress total={recipients} label={isX ? 'Sending X DMs…' : push ? 'Sending pushes…' : 'Sending emails…'} onDone={() => { setSending(false); setSent(true); }} />
          ) : (
            <div className="wizdone">
              <span className="wizdone__icn"><Icon name="check" size={26} strokeWidth={2.5} /></span>
              <h2>{sendMode === 'later' ? 'Campaign scheduled' : 'Campaign is on its way'}</h2>
              <p>{sendMode === 'best'
                ? `“${name}” is going out to ${fmt(recipients)} ${noun}, each at their own best hour. Delivery completes within ${SEND_TIME.windowHours} hours. Results fill in as it runs.`
                : sendMode === 'now'
                ? `“${name}” is sending to ${fmt(recipients)} ${noun}. Results will appear on the campaign page within a few minutes.`
                : `“${name}” will send on Jul ${schedDay} at ${schedTime} to ${fmt(recipients)} ${noun}. You can edit it any time before then.`}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={onExit}>Back to campaigns</Button>
                <Button variant="tertiary" onClick={() => { setSent(false); setStep(0); }}>Create another</Button>
              </div>
            </div>
          )}
        </div>
      </div></div>
    );
  }

  const stepBody = step === 0 ? audienceStep : step === 1 ? messageStep : reviewStep;
  return (
    <div className="page page--wide"><div className="wiz">
      {editorOpen && <EmailBuilder name={TEMPLATES.find((t) => t.id === tplId)!.name} blocks={emailBlocks} onBlocksChange={setEmailBlocks} onClose={() => setEditorOpen(false)} />}
      <div className="wiz__bar">
        <button type="button" className="wiz__back" onClick={onExit}><Icon name="arrow-left" size={16} />Campaigns</button>
        <span className="wiz__sep" />
        <div className="wiz__name"><input value={name} onChange={(e) => setName(e.target.value)} aria-label="Campaign name" /><Icon name="pen-line" size={14} color="var(--text-tertiary)" /></div>
        <span className="wiz__saved" style={{ marginLeft: 'auto' }}><Icon name="check" size={13} />Draft saved</span>
        <Button variant="tertiary" size="s" onClick={onExit}>Save &amp; exit</Button>
      </div>
      <div className="wiz__grid">
        <nav className="wiz__rail" aria-label="Campaign steps">
          {STEPS.map((s, i) => (
            <button key={s.label} type="button" disabled={i > step} onClick={() => i < step && setStep(i)}
              className={`wstep${i === step ? ' wstep--active' : ''}${i < step ? ' wstep--done' : ''}`}>
              <span className="wstep__dot">{i < step ? <Icon name="check" size={13} strokeWidth={2.5} /> : i + 1}</span>
              <span className="wstep__txt"><b>{s.label}</b><span>{s.sub}</span></span>
            </button>
          ))}
        </nav>
        <section className="wiz__panel">
          <div className="wiz__panelhead">
            <h2>{step === 0 ? 'Who gets this?' : step === 1 ? 'What are you sending?' : 'Ready to send?'}</h2>
            <p>{step === 0 ? 'Pick the campaign type, then choose segments, lists, contacts or everyone.'
              : step === 1 ? (isX ? 'Write the DM. Keep it personal. This one is easy to get reported.'
                : push ? 'Write the notification and set where it opens.'
                : 'Write the email and pick a template.')
              : 'Give it one last look. This is exactly what lands.'}</p>
          </div>
          {stepBody}
          <div className="wiz__foot">
            {step > 0 ? <Button variant="secondary" icon="arrow-left" onClick={() => setStep(step - 1)}>Back</Button> : <span />}
            <span style={{ flex: 1 }} />
            {step < 2
              ? <Button trailingIcon="arrow-right" onClick={() => setStep(step + 1)} disabled={recipients === 0}>Continue</Button>
              : <Button icon={sendMode === 'later' ? 'clock' : sendMode === 'best' ? 'target' : 'send'} disabled={!!blockedReason}
                  title={blockedReason ?? undefined}
                  onClick={() => (sendMode === 'later' ? setSent(true) : setSending(true))}>
                  {sendMode === 'later' ? 'Schedule campaign'
                    : sendMode === 'best' ? `Start staggered send · ${fmt(recipients)}`
                    : queued ? `Queue for ${fmt(recipients)} ${noun}`
                    : `Send to ${fmt(recipients)} ${noun}`}
                </Button>}
          </div>
        </section>
        {summary}
      </div>
    </div></div>
  );
}
