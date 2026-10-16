import { useEffect, useState } from 'react';
import { SectionEmpty } from '../components/SectionEmpty';
import { useWorkspaceMode } from '../data/workspace';
import { Badge, Button, Chip, Select, Switch, NO_VALUE } from '../components/ui';
import { Icon } from '../components/icons';
import { toast } from '../components/toast';
import type { IconName } from '../components/icons';
import { EmailBuilder, PushBuilder } from './builders';
import { EMAIL_CTR, EMAIL_OPEN, MessageStatsTable, PUSH_CTR, PUSH_VIEW } from '../components/MessageStats';
import type { MessageStat } from '../components/MessageStats';
import { PageHeader } from '../shell/Shell';
import './automations.css';

/* ---------- types ---------- */
type StepType = 'wait' | 'email' | 'push' | 'tag' | 'webhook' | 'campaign' | 'list' | 'branch';
type Trigger = { id: string; label: string; configured: boolean };
type Act = { id: string; type: Exclude<StepType, 'branch'>; label: string; configured: boolean };
type Branch = { id: string; type: 'branch'; label: string; configured: boolean; cond: string; paths: { yes: { act: Act | null }; no: { act: Act | null } } };
type Step = Act | Branch;
type Mode = 'list' | 'recipes' | 'builder';
type Row = { id: string; name: string; trigger: string; status: 'success' | 'warning' | 'neutral'; statusLabel: string; enrolled: string; completed: string; conv: string; last: string };
type Recipe = { id: string; icon: IconName; scratch?: boolean; name: string; desc: string; trigger?: string; steps?: { type: Act['type']; label: string }[] };

const STEP_META: Record<StepType, { icon: IconName; kind: string; title: string; sub: string }> = {
  wait: { icon: 'clock', kind: 'Wait', title: 'Wait', sub: 'Pause before the next step' },
  email: { icon: 'mail', kind: 'Send email', title: 'Send email', sub: 'Email or reusable template' },
  push: { icon: 'smartphone', kind: 'Send in-app', title: 'Send in-app push', sub: 'Notification in your app' },
  tag: { icon: 'tag', kind: 'Add tag', title: 'Add tag', sub: 'Attach a tag to the contact' },
  webhook: { icon: 'webhook', kind: 'Webhook', title: 'Webhook', sub: 'Call an external URL with context' },
  campaign: { icon: 'megaphone', kind: 'Dispatch campaign', title: 'Dispatch campaign', sub: 'Trigger an existing campaign' },
  list: { icon: 'list-plus', kind: 'Add to list', title: 'Add to list', sub: 'Add the contact to a list' },
  branch: { icon: 'split', kind: 'Branch', title: 'Branch', sub: 'Split the flow on a condition' },
};
const TRIGGERS_ON: { icon: IconName; name: string; desc: string }[] = [
  { icon: 'zap', name: 'On-chain event', desc: 'Wallet interacts with a contract' },
  { icon: 'gem', name: 'Holder acquired', desc: 'New wallet mints or buys in' },
  { icon: 'repeat', name: 'Swap completed', desc: 'DEX trade or token exchange' },
  { icon: 'droplets', name: 'Liquidity added', desc: 'Deposits into your pools' },
  { icon: 'trending-down', name: 'Capital withdrawn', desc: 'Burns, unstakes, or withdraws' },
  { icon: 'file-check', name: 'Approval intent', desc: 'Approves a contract to spend' },
];
const TRIGGERS_OFF: { icon: IconName; name: string; desc: string }[] = [
  { icon: 'clipboard-list', name: 'Form submitted', desc: 'Wallet completes a capture form' },
  { icon: 'list', name: 'Joined a list', desc: 'Wallet is added to a list' },
  { icon: 'users', name: 'Segment entered', desc: 'Wallet joins a saved segment' },
  { icon: 'mail-open', name: 'Email opened', desc: 'Contact opens a previous email' },
  { icon: 'mouse-pointer-click', name: 'Email clicked', desc: 'Clicks a link in an email' },
  { icon: 'bell', name: 'Push viewed', desc: 'Views an in-app notification' },
  { icon: 'tag', name: 'Tag added', desc: 'A tag lands on the contact' },
  /* These two were the audit's phantom trigger: "Health threshold" shipped against a score
     that did not exist, so a flow built on it could never fire and nothing said so. The
     score is real as of 2.7, and stage transitions join it — a wallet slipping from engaged
     to at-risk is the moment retention work is actually worth doing. */
  { icon: 'heart-pulse', name: 'Health threshold', desc: 'Score crosses strong, watch or at risk' },
  { icon: 'rotate-ccw', name: 'Stage changed', desc: 'Moves between lifecycle stages' },
  { icon: 'moon', name: 'Goes dormant', desc: 'No activity for 30 days' },
];
const ACTIONS: { type: StepType; icon: IconName; name: string; desc: string }[] = [
  { type: 'email', icon: 'mail', name: 'Send email', desc: 'Email or reusable template' },
  { type: 'push', icon: 'smartphone', name: 'Send in-app', desc: 'Push to the matched wallet' },
  { type: 'wait', icon: 'clock', name: 'Wait', desc: 'Pause the flow for a duration' },
  { type: 'branch', icon: 'split', name: 'Branch', desc: 'Split paths on a condition' },
  { type: 'tag', icon: 'tag', name: 'Add tag', desc: 'Attach a tag to the contact' },
  { type: 'list', icon: 'list-plus', name: 'Add to list', desc: 'Add the contact to a list' },
  { type: 'webhook', icon: 'webhook', name: 'Webhook', desc: 'Call an external URL' },
  { type: 'campaign', icon: 'megaphone', name: 'Dispatch campaign', desc: 'Fire an existing campaign' },
];
const RECIPES: Recipe[] = [
  { id: 'scratch', icon: 'plus', scratch: true, name: 'Start from scratch', desc: 'Pick a trigger and build the flow step by step.' },
  { id: 'welcome', icon: 'hand', name: 'Welcome new wallets', desc: 'First connect → wait 1h → welcome email.', trigger: 'Holder acquired', steps: [{ type: 'wait', label: 'Wait 1 hour' }, { type: 'email', label: 'Email · “Welcome to Acme”' }] },
  { id: 'winback', icon: 'rotate-ccw', name: 'Win back dormant wallets', desc: 'Inactive 30d → email → wait 3d → follow-up push.', trigger: 'Goes dormant', steps: [{ type: 'email', label: 'Email · “We miss you”' }, { type: 'wait', label: 'Wait 3 days' }, { type: 'push', label: 'Push · “Your Hammers are waiting”' }] },
  { id: 'whale', icon: 'trending-down', name: 'Whale unstake alert', desc: 'Whale unstakes → instant push → wait 1d → retention email.', trigger: 'On-chain event · unstake > 10 ETH', steps: [{ type: 'push', label: 'Push · “Before you go…”' }, { type: 'wait', label: 'Wait 1 day' }, { type: 'email', label: 'Email · “Better staking terms”' }] },
];
const ROWS: Row[] = [
  { id: 'welcome', name: 'Welcome new wallets', trigger: 'Holder acquired', status: 'success', statusLabel: 'Active', enrolled: '1,204', completed: '38.2%', conv: '312', last: '12 min ago' },
  { id: 'whale', name: 'Whale unstake alert', trigger: 'On-chain event · unstake > 10 ETH', status: 'success', statusLabel: 'Active', enrolled: '86', completed: '61.6%', conv: '38', last: '2h ago' },
  { id: 'winback', name: 'Dormant 30d win-back', trigger: 'Goes dormant', status: 'warning', statusLabel: 'Paused', enrolled: '978', completed: '12.4%', conv: '74', last: '6d ago' },
  { id: 'postbuy', name: 'Post-purchase pack tips', trigger: 'On-chain event · buys a pack', status: 'neutral', statusLabel: 'Draft', enrolled: NO_VALUE, completed: NO_VALUE, conv: NO_VALUE, last: 'Never' },
];
/* Performance over time.
 *
 * This used to be decoration: a hardcoded height ramp with a CSS overlay pinned at 38% of
 * every bar, so the two colours encoded nothing and the chart couldn't be read. It now
 * plots the automation's own numbers — how many wallets entered in each period, and how
 * many of those finished the flow — so the bars reconcile with the KPI strip above:
 * the entries sum to "Entries · 30d" and the completed share equals "Completed".
 *
 * Shapes are fixed weights, not random, so the chart is stable across renders and tests. */
const ENTRY_SHAPE = [0.72, 0.78, 0.83, 0.88, 0.92, 0.96, 1.0, 1.04, 1.08, 1.12, 1.16, 1.21];
const DONE_SHAPE = [0.86, 0.89, 0.92, 0.94, 0.97, 0.99, 1.01, 1.03, 1.05, 1.06, 1.08, 1.10];

/** Split a total into one bucket per weight, giving the remainder to the last one
 *  so the parts always add back up to the whole. */
function spread(total: number, shape: number[]) {
  const sum = shape.reduce((a, b) => a + b, 0);
  const parts = shape.map((w) => Math.round((total * w) / sum));
  const drift = total - parts.reduce((a, b) => a + b, 0);
  parts[parts.length - 1] += drift;
  return parts.map((n) => Math.max(0, n));
}

export function performanceSeries(enrolled: number, completedPct: number) {
  const entries = spread(enrolled, ENTRY_SHAPE);
  const targetDone = Math.round((enrolled * completedPct) / 100);
  // Weight completions by both volume and the warm-up curve, then rescale so the total
  // matches the headline exactly rather than drifting a few wallets away from it.
  const raw = entries.map((e, i) => e * DONE_SHAPE[i]);
  const rawSum = raw.reduce((a, b) => a + b, 0) || 1;
  const done = raw.map((r) => Math.round((r / rawSum) * targetDone));
  const drift = targetDone - done.reduce((a, b) => a + b, 0);
  done[done.length - 1] += drift;
  return entries.map((e, i) => ({
    period: `Week ${i + 1}`,
    entries: e,
    completed: Math.min(e, Math.max(0, done[i])),
  }));
}

const num = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0;

/* Per-message performance inside the flow.
 *
 * The flow-level numbers say the automation works; they don't say which message is doing
 * the work. A step's audience is whoever survived the steps before it, so each message is
 * measured against its own reach, not against the entry count — an email three steps deep
 * looking "worse" than one at the top is usually just a smaller denominator.
 *
 * Retention is spread evenly across the steps so the last one lands on the automation's
 * completion count. That keeps this table tied to the KPI strip instead of inventing a
 * second, conflicting funnel. */
export function flowMessageStats(
  enrolled: number, completedPct: number, steps: { id: string; type: string; label: string }[],
): MessageStat[] {
  const messages = steps.filter((s) => s.type === 'email' || s.type === 'push');
  if (!messages.length || enrolled <= 0) return [];

  // Even per-step retention that ends on the completion count.
  const survival = Math.min(1, Math.max(0, completedPct / 100));
  const perStep = steps.length ? Math.pow(survival || 0.0001, 1 / steps.length) : 1;

  return steps.reduce<{ out: MessageStat[]; reach: number }>((acc, s, i) => {
    const reach = Math.round(enrolled * Math.pow(perStep, i));
    if (s.type !== 'email' && s.type !== 'push') return { ...acc, reach };
    const kind = s.type as 'email' | 'push';
    const engagedRate = kind === 'email' ? EMAIL_OPEN : PUSH_VIEW;
    const engaged = Math.round(reach * engagedRate);
    const clicked = kind === 'email'
      ? Math.round(reach * EMAIL_CTR)          // email CTR is measured against delivered
      : Math.round(engaged * PUSH_CTR);        // push clicks are measured against views
    acc.out.push({
      id: s.id, kind, label: s.label,
      sent: reach,
      engaged, engagedRate: reach ? (engaged / reach) * 100 : 0,
      clicked, clickRate: reach ? (clicked / reach) * 100 : 0,
    });
    return { ...acc, reach };
  }, { out: [], reach: enrolled }).out;
}


function PerformanceBars({ enrolled, completed }: { enrolled: string; completed: string }) {
  const series = performanceSeries(num(enrolled), num(completed));
  const max = Math.max(...series.map((s) => s.entries), 1);
  return (
    <>
      <div className="bars" role="img"
        aria-label={`Entries and completions per period. ${series.map((s) => `${s.period}: ${s.entries} entered, ${s.completed} completed`).join('. ')}`}>
        {series.map((s) => {
          const rate = s.entries ? Math.round((s.completed / s.entries) * 100) : 0;
          return (
            <div className="bars__col" key={s.period}
              title={`${s.period}: ${s.entries.toLocaleString('en-US')} entered · ${s.completed.toLocaleString('en-US')} completed (${rate}%)`}>
              <div className="bars__stack" style={{ height: `${(s.entries / max) * 100}%` }}>
                <div className="bars__done" style={{ height: `${s.entries ? (s.completed / s.entries) * 100 : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="bars__axis"><span>12 weeks ago</span><span>This week</span></div>
    </>
  );
}

const ENTRIES = [
  { w: 'maya.eth', status: 'Completed', path: 'Email → bought a pack', t: '14 min ago' },
  { w: '0x3F4a…8a21', status: 'In flow', path: 'Waiting · 1 hour', t: '38 min ago' },
  { w: 'leo.eth', status: 'Completed', path: 'Email → bought a pack', t: '2h ago' },
  { w: '0x91Cb…4e07', status: 'Exited', path: 'Unsubscribed', t: '5h ago' },
];
const opts = (a: string[]) => a.map((s) => ({ value: s, label: s }));
let nextId = 1;

/* The visible text sits in a sibling span, so the switch needs the name passed to it —
   otherwise it is an unlabelled checkbox to anything that isn't looking at the screen. */
function FlowToggle({ label, initial = true }: { label: string; initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return <Switch label={label} checked={on} onChange={setOn} />;
}

export default function AutomationsScreen() {
  const workspace = useWorkspaceMode();
  const [mode, setMode] = useState<Mode>('list');
  const [view, setView] = useState<'builder' | 'stats'>('builder');
  const [name, setName] = useState('Untitled Loop');
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [active, setActive] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [pickerAt, setPickerAt] = useState<number | string | null>(null);
  const [palQ, setPalQ] = useState('');
  const [row, setRow] = useState<Row | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pushEditor, setPushEditor] = useState<Act | null>(null);
  const locked = active;

  const openRecipe = (r: Recipe, asRow?: Row) => {
    if (r.scratch) { setName('Untitled Loop'); setTriggers([]); setSteps([]); setSel(null); }
    else {
      const tid = 't' + nextId++;
      setName(asRow ? asRow.name : r.name);
      setTriggers([{ id: tid, label: r.trigger!, configured: true }]);
      setSteps((r.steps ?? []).map((s) => ({ id: 'n' + nextId++, type: s.type, label: s.label, configured: true }) as Act));
      setSel('trig:' + tid);
    }
    setRow(asRow ?? null);
    setActive(asRow ? asRow.statusLabel === 'Active' : false);
    setView(asRow && asRow.statusLabel === 'Active' ? 'stats' : 'builder');
    setPickerAt(null); setMode('builder');
  };
  const openRow = (r: Row) => openRecipe(RECIPES.find((x) => x.id === r.id) ?? RECIPES[1], r);
  const insertStep = (idx: number, type: StepType) => {
    const node: Step = type === 'branch'
      ? { id: 'n' + nextId++, type: 'branch', label: 'Branch', configured: false, cond: 'Has a linked email', paths: { yes: { act: null }, no: { act: null } } }
      : { id: 'n' + nextId++, type, label: STEP_META[type].title, configured: false } as Act;
    setSteps((v) => [...v.slice(0, idx), node, ...v.slice(idx)]);
    setSel(node.id); setPickerAt(null); setView('builder');
  };
  const setPathAct = (branchId: string, path: 'yes' | 'no', type: Act['type']) => {
    const act: Act = { id: 'n' + nextId++, type, label: STEP_META[type].title, configured: false };
    setSteps((v) => v.map((s) => (s.id === branchId && s.type === 'branch' ? { ...s, paths: { ...s.paths, [path]: { act } } } : s)));
    setSel(`${branchId}::${path}`); setPickerAt(null);
  };
  const clearPathAct = (branchId: string, path: 'yes' | 'no') => { setSteps((v) => v.map((s) => (s.id === branchId && s.type === 'branch' ? { ...s, paths: { ...s.paths, [path]: { act: null } } } : s))); setSel(null); };
  const setTriggerFromPal = (t: { name: string }) => { if (locked || triggers.length >= 3 || triggers.some((x) => x.label === t.name)) return; const id = 't' + nextId++; setTriggers((v) => [...v, { id, label: t.name, configured: false }]); setSel('trig:' + id); setPickerAt(null); };
  const editTrigger = (id: string, patch: Partial<Trigger>) => setTriggers((v) => v.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTrigger = (id: string) => { setTriggers((v) => v.filter((t) => t.id !== id)); setSel(null); };
  const removeStep = (id: string) => { setSteps((v) => v.filter((s) => s.id !== id)); setSel(null); };

  const findNode = (id: string | null): { node: Step; branchId?: string; path?: 'yes' | 'no' } | null => {
    if (!id || id === 'trigger' || id.startsWith('trig:')) return null;
    if (id.includes('::')) {
      const [bid, p] = id.split('::') as [string, 'yes' | 'no'];
      const b = steps.find((s) => s.id === bid);
      return b && b.type === 'branch' && b.paths[p].act ? { node: b.paths[p].act!, branchId: bid, path: p } : null;
    }
    const s = steps.find((x) => x.id === id);
    return s ? { node: s } : null;
  };
  const configure = (id: string) => {
    if (id === 'trigger') return;
    if (id.startsWith('trig:')) { const tid = id.slice(5); setTriggers((v) => v.map((t) => (t.id === tid ? { ...t, configured: true } : t))); return; }
    if (id.includes('::')) { const [bid, p] = id.split('::') as [string, 'yes' | 'no']; setSteps((v) => v.map((s) => (s.id === bid && s.type === 'branch' && s.paths[p].act ? { ...s, paths: { ...s.paths, [p]: { act: { ...s.paths[p].act!, configured: true } } } } : s))); return; }
    setSteps((v) => v.map((s) => (s.id === id ? { ...s, configured: true } : s)));
  };

  const stepNodes: Step[] = [];
  steps.forEach((s) => { stepNodes.push(s); if (s.type === 'branch') { if (s.paths.yes.act) stepNodes.push(s.paths.yes.act); if (s.paths.no.act) stepNodes.push(s.paths.no.act); } });
  const hasBranch = steps.some((s) => s.type === 'branch');
  const unconfigured = triggers.filter((t) => !t.configured).length + stepNodes.filter((s) => !s.configured).length;
  const valid = triggers.length > 0 && unconfigured === 0 && steps.length > 0;
  useEffect(() => { if (!valid && active) setActive(false); }, [valid, active]);

  const query = palQ.toLowerCase();
  const trigOn = TRIGGERS_ON.filter((t) => t.name.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  const trigOff = TRIGGERS_OFF.filter((t) => t.name.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query));
  const actList = ACTIONS.filter((a) => a.name.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query));

  /* ---------- recipes ---------- */
  if (mode === 'recipes') {
    return (
      <div className="page page--wide"><div className="auto">
        <div className="flow__bar"><button type="button" className="flow__back" onClick={() => setMode('list')}><Icon name="arrow-left" size={16} />Loops</button></div>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>New Loop</h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>Start from a proven recipe, or build your own from a trigger.</p>
        </div>
        <div className="rcp">
          {RECIPES.map((r) => (
            <button key={r.id} type="button" className="rcp__card" onClick={() => openRecipe(r)}>
              <span className={`rcp__icn${r.scratch ? ' rcp__icn--scratch' : ''}`}><Icon name={r.icon} size={18} /></span>
              <span className="rcp__txt"><b>{r.name}</b><span>{r.desc}</span></span>
            </button>
          ))}
        </div>
      </div></div>
    );
  }

  /* ---------- builder ---------- */
  if (mode === 'builder') {
    const isLive = row && active;
    const msgStats = isLive ? flowMessageStats(num(row!.enrolled), num(row!.completed), steps) : [];
    const plus = (idx: number) => locked ? <span key={'p' + idx} className="flow__wire" style={{ height: 48 }} /> : (
      <div key={'p' + idx} style={{ display: 'contents' }}>
        <span className="flow__wire" />
        <button type="button" className={`flow__plus${pickerAt === idx ? ' on' : ''}`} aria-label="Add step" onClick={() => setPickerAt(pickerAt === idx ? null : idx)}><Icon name="plus" size={13} /></button>
        {pickerAt === idx && (
          <div className="flow__picker">
            {ACTIONS.map((a) => <button key={a.type} type="button" className="flow__pick" onClick={() => insertStep(idx, a.type)}><Icon name={a.icon} size={16} />{a.name}</button>)}
          </div>
        )}
        <span className="flow__wire" />
      </div>
    );
    const found = findNode(sel);
    const selStep = found && found.node.type !== 'branch' ? (found.node as Act) : null;
    const selBranch = found && found.node.type === 'branch' ? (found.node as Branch) : null;
    const selTrig = sel && sel.startsWith('trig:') ? triggers.find((t) => 'trig:' + t.id === sel) : null;
    const nested = !!sel && sel.includes('::');

    return (
      <div className="page page--wide"><div className="auto">
        <div className="flow__bar">
          <button type="button" className="flow__back" onClick={() => setMode('list')}><Icon name="arrow-left" size={16} />Loops</button>
          <span style={{ width: 1, height: 20, background: 'var(--border-default)' }} />
          <input className="flow__name" value={name} readOnly={locked} onChange={(e) => setName(e.target.value)} aria-label="Loop name" />
          {locked ? <span className="flow__warn" style={{ background: 'var(--bg-selected)', color: 'var(--action-primary)' }}><Icon name="lock" size={13} />Live. Pause to edit</span>
            : unconfigured > 0 ? <span className="flow__warn"><Icon name="triangle-alert" size={13} />{unconfigured === 1 ? '1 step needs setup' : `${unconfigured} steps need setup`}</span>
            : steps.length > 0 ? <Badge status="success">Ready</Badge> : null}
          <span className="flow__meta">{triggers.length + steps.length} nodes · {unconfigured} issues</span>
          <span style={{ flex: 1 }} />
          {row && <div className="flow__seg"><button type="button" className={view === 'builder' ? 'on' : ''} onClick={() => setView('builder')}>Builder</button><button type="button" className={view === 'stats' ? 'on' : ''} onClick={() => setView('stats')}>Stats</button></div>}
          <Switch label={active ? 'Active' : 'Off'} checked={active} disabled={!valid} onChange={setActive} />
          <Button variant="secondary" size="s" onClick={() => toast(`“${name.trim() || 'Untitled Loop'}” saved as a draft`)}>Save draft</Button>
        </div>

        {view === 'stats' ? (
          <>
            <div className="auto__strip">
              <div className="auto__stat"><span>Entries · 30d</span><b>{isLive ? row!.enrolled : '0'}</b></div>
              <div className="auto__stat"><span>Completed</span><b>{isLive ? row!.completed : '0%'}</b></div>
              <div className="auto__stat"><span>On-chain conversions</span><b>{isLive ? row!.conv : '0'}</b></div>
              <div className="auto__stat"><span>Last triggered</span><b>{isLive ? row!.last : NO_VALUE}</b></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: 16 }}>
              <div className="stats__card">
                <div className="stats__head">
                  <h3>Performance over time</h3>
                  {isLive && (
                    <div className="legend legend--sm">
                      <span><i style={{ background: 'var(--action-primary)' }} />Completed the flow</span>
                      <span><i style={{ background: 'var(--bg-selected)' }} />Entered</span>
                    </div>
                  )}
                </div>
                {isLive ? <PerformanceBars enrolled={row!.enrolled} completed={row!.completed} />
                  : <div className="stats__ph"><b>No performance data yet</b><span>Entries and conversion trends appear here once this Loop starts processing wallets.</span></div>}
              </div>
              <div className="stats__card"><h3>Recent entries</h3>
                {isLive ? <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {ENTRIES.map((e) => (
                    <div key={e.w + e.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 14 }}>
                      <b style={{ fontFamily: e.w.startsWith('0x') ? 'var(--font-mono)' : 'inherit', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, width: 110, flexShrink: 0 }}>{e.w}</b>
                      <Badge status={e.status === 'Completed' ? 'success' : e.status === 'In flow' ? 'info' : 'neutral'}>{e.status}</Badge>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.path}</span>
                      <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', fontSize: 12, flexShrink: 0 }}>{e.t}</span>
                    </div>
                  ))}
                </div> : <div className="stats__ph"><b>No entries yet</b><span>This table populates after this Loop begins processing wallets.</span></div>}
              </div>
            </div>

            <div className="stats__card">
              <div className="stats__head">
                <h3>Messages in this flow</h3>
                {isLive && msgStats.length > 0 && <span className="stats__sub">In the order they send</span>}
              </div>
              {!isLive
                ? <div className="stats__ph"><b>No message data yet</b><span>Each email and in-app push in this flow reports its own delivery and engagement once this Loop goes live.</span></div>
                : msgStats.length === 0
                  ? <div className="stats__ph"><b>This flow sends no messages</b><span>Add an email or in-app push step and its performance will appear here.</span></div>
                  : (
                    <MessageStatsTable
                      rows={msgStats}
                      sentHint="reached this step"
                      note={<>Each message is measured against the wallets that reached <em>it</em>, not the flow&apos;s
                        entry count. A later step has a smaller audience by design. Push view rate and email open
                        rate are different measures and shouldn&apos;t be compared to each other.</>}
                    />
                  )}
            </div>
          </>
        ) : (
          <div className="flow__grid">
            <aside className="pal" aria-label="Triggers and actions">
              <div className="pal__search"><Icon name="search" size={14} color="var(--text-tertiary)" /><input placeholder="Search triggers & actions…" value={palQ} onChange={(e) => setPalQ(e.target.value)} /></div>
              <div className="pal__body">
                <span className="pal__lbl">On-chain triggers · {trigOn.length}</span>
                {trigOn.map((t) => <button key={t.name} type="button" className="pal__item pal__item--trigger" disabled={locked} onClick={() => setTriggerFromPal(t)}><span className="pal__icn"><Icon name={t.icon} size={14} /></span><span className="pal__txt"><b>{t.name}</b><span>{t.desc}</span></span></button>)}
                <span className="pal__lbl">Off-chain triggers · {trigOff.length}</span>
                {trigOff.map((t) => <button key={t.name} type="button" className="pal__item pal__item--trigger" disabled={locked} onClick={() => setTriggerFromPal(t)}><span className="pal__icn"><Icon name={t.icon} size={14} /></span><span className="pal__txt"><b>{t.name}</b><span>{t.desc}</span></span></button>)}
                <span className="pal__lbl">Actions · {actList.length}</span>
                {actList.map((a) => <button key={a.type} type="button" className="pal__item" disabled={locked || !triggers.length || hasBranch} onClick={() => insertStep(steps.length, a.type)}><span className="pal__icn"><Icon name={a.icon} size={14} /></span><span className="pal__txt"><b>{a.name}</b><span>{a.desc}</span></span></button>)}
              </div>
            </aside>

            <div className="flow__canvas">
              {triggers.length ? (
                <>
                  {triggers.length > 1 && <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 2 }}>A wallet enters when <b style={{ color: 'var(--text-secondary)' }}>any</b> of these fire</span>}
                  {triggers.map((tg, ti) => (
                    <div key={tg.id} style={{ display: 'contents' }}>
                      {ti > 0 && <><span className="flow__wire" style={{ height: 14 }} /><span className="trig-or">OR</span><span className="flow__wire" style={{ height: 14 }} /></>}
                      <div className={`node${sel === 'trig:' + tg.id ? ' on' : ''}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel('trig:' + tg.id); } }} onClick={() => setSel('trig:' + tg.id)}>
                        {!tg.configured && <span className="node__pip" />}
                        <div className="node__head">
                          <span className="node__icn node__icn--trigger"><Icon name="zap" size={15} /></span>
                          <span className="node__txt"><i>Trigger{triggers.length > 1 ? ` ${ti + 1}` : ''}</i><b>{tg.label}</b></span>
                        </div>
                        {triggers.length > 1 && !locked && <button type="button" className="node__rm" aria-label="Remove trigger" onClick={(e) => { e.stopPropagation(); removeTrigger(tg.id); }}><Icon name="x" size={14} /></button>}
                      </div>
                    </div>
                  ))}
                  {triggers.length < 3 && !locked && (
                    <>
                      <span className="flow__wire" style={{ height: 14 }} />
                      <button type="button" className="trig-add" onClick={() => setPickerAt(pickerAt === 'trig' ? null : 'trig')}><Icon name="plus" size={13} />Add trigger</button>
                      {pickerAt === 'trig' && (
                        <div className="flow__picker" style={{ maxWidth: 320 }}>
                          {[...TRIGGERS_ON, ...TRIGGERS_OFF].filter((t) => !triggers.some((x) => x.label === t.name)).slice(0, 8).map((t) => <button key={t.name} type="button" className="flow__pick" onClick={() => setTriggerFromPal(t)}><Icon name={t.icon} size={16} />{t.name}</button>)}
                        </div>
                      )}
                    </>
                  )}
                  {steps.map((s, i) => (
                    <div key={s.id} style={{ display: 'contents' }}>
                      {plus(i)}
                      {s.type === 'branch' ? (
                        <>
                          <div className={`node${sel === s.id ? ' on' : ''}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(s.id); } }} onClick={() => setSel(s.id)}>
                            {!s.configured && <span className="node__pip" />}
                            <div className="node__head"><span className="node__icn"><Icon name="split" size={15} /></span><span className="node__txt"><i>Branch</i><b>{s.cond}</b><span>{s.configured ? 'Splits into two paths' : 'Needs setup'}</span></span></div>
                          </div>
                          <div className="br">
                            {(['yes', 'no'] as const).map((p) => (
                              <div className="br__col" key={p}>
                                <span className="br__lbl">{p === 'yes' ? 'If yes' : 'If no'}</span>
                                {s.paths[p].act ? (
                                  <div className={`node${sel === `${s.id}::${p}` ? ' on' : ''}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(`${s.id}::${p}`); } }} onClick={(e) => { e.stopPropagation(); setSel(`${s.id}::${p}`); }}>
                                    {!s.paths[p].act!.configured && <span className="node__pip" />}
                                    <div className="node__head"><span className="node__icn"><Icon name={STEP_META[s.paths[p].act!.type].icon} size={15} /></span><span className="node__txt"><i>{STEP_META[s.paths[p].act!.type].kind}</i><b>{s.paths[p].act!.label}</b></span></div>
                                  </div>
                                ) : locked ? <span className="flow__end">No action</span>
                                  : <button type="button" className="br__add" onClick={(e) => { e.stopPropagation(); setPickerAt(pickerAt === `${s.id}:${p}` ? null : `${s.id}:${p}`); }}><Icon name="plus" size={13} />Add step</button>}
                                {pickerAt === `${s.id}:${p}` && (
                                  <div className="flow__picker">
                                    {(['email', 'push', 'wait', 'tag', 'list'] as const).map((t) => <button key={t} type="button" className="flow__pick" onClick={() => setPathAct(s.id, p, t)}><Icon name={STEP_META[t].icon} size={16} />{STEP_META[t].title}</button>)}
                                  </div>
                                )}
                                <span className="flow__wire" />
                                <span className="flow__end">Exit flow</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className={`node${sel === s.id ? ' on' : ''}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(s.id); } }} onClick={() => setSel(s.id)}>
                          {!s.configured && <span className="node__pip" />}
                          <div className="node__head"><span className="node__icn"><Icon name={STEP_META[s.type].icon} size={15} /></span><span className="node__txt"><i>{STEP_META[s.type].kind}</i><b>{s.label}</b><span>{s.configured ? STEP_META[s.type].sub : 'Needs setup'}</span></span></div>
                        </div>
                      )}
                    </div>
                  ))}
                  {!hasBranch && <>{plus(steps.length)}<span className="flow__end">Exit flow</span></>}
                </>
              ) : (
                <div className="stats__ph" style={{ maxWidth: 340, background: 'var(--bg-surface)' }}><b>Start from a clean canvas</b><span>Pick a trigger from the left panel. A flow can start from up to three.</span></div>
              )}
            </div>

            <aside className="flow__panel">
              {locked ? (
                <><h3>Flow is live</h3><p className="hint">Wallets are moving through this Loop right now. Pause it to change the trigger, steps, or content. Wallets mid-flow finish their current step, then wait.</p><Button variant="secondary" size="s" icon="pause" onClick={() => setActive(false)}>Pause Loop</Button></>
              ) : selTrig ? (
                <>
                  <h3>{triggers.length > 1 ? `Trigger ${triggers.findIndex((t) => t.id === selTrig.id) + 1}` : 'Trigger'}</h3>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>Label</span><input className="txtin" value={selTrig.label} onChange={(e) => editTrigger(selTrig.id, { label: e.target.value })} /></label>
                  <Select label="Contract" options={opts(['Acme Packs · 0x3F4a…8a21', 'Acme Staking · 0x91Cb…4e07', 'Any contract'])} />
                  <Select label="Event" options={opts(['Any event', 'Mint', 'Purchase', 'Unstake', 'Transfer out'])} />
                  <Select label="Chain" options={opts(['Any chain', 'Base', 'Ethereum'])} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!selTrig.configured && <Button size="s" onClick={() => configure('trig:' + selTrig.id)}>Apply trigger</Button>}
                    {triggers.length > 1 && <Button variant="tertiary" size="s" icon="trash-2" onClick={() => removeTrigger(selTrig.id)}>Remove</Button>}
                  </div>
                  <p className="hint">{triggers.length > 1 ? 'A wallet enters when any of the triggers fires. You can start a flow from up to three.' : 'A wallet enters once per matching event, subject to the re-entry rule below. Add more triggers on the canvas to start this flow from several events.'}</p>
                </>
              ) : selBranch ? (
                <>
                  <h3>Branch</h3>
                  <Select label="Condition" options={opts(['Has a linked email', 'Is email-reachable', 'Is push-reachable', 'Is in segment…', 'Balance above…', 'Opened last email'])} defaultValue={selBranch.cond} />
                  <p className="hint">Wallets that match take the “yes” path; everyone else takes “no”. Add a step to each path below the branch.</p>
                  <div style={{ display: 'flex', gap: 8 }}>{!selBranch.configured && <Button size="s" onClick={() => configure(selBranch.id)}>Apply</Button>}<Button variant="tertiary" size="s" icon="trash-2" onClick={() => removeStep(selBranch.id)}>Remove</Button></div>
                </>
              ) : selStep ? (
                <>
                  <h3>{STEP_META[selStep.type].title}</h3>
                  {selStep.type === 'wait' && <Select label="Duration" options={opts(['1 hour', '6 hours', '1 day', '3 days', '7 days'])} />}
                  {selStep.type === 'email' && <><Select label="Template" options={opts(['Welcome series', 'Acme is live', 'Weekly digest', '+ New email…'])} /><Select label="Send as" options={opts(['Acme · no-reply@example.com'])} /><Button size="s" icon="pen-line" onClick={() => setEditorOpen(true)}>Open email builder</Button><p className="hint">Build the email in the full editor. Skipped for wallets without a linked email.</p></>}
                  {selStep.type === 'push' && <><Select label="Notification" options={opts(['Claim your starter pack', 'Season 2 packs are live', 'Your Hammers are waiting', '+ New notification…'])} /><Button size="s" icon="pen-line" onClick={() => setPushEditor(selStep)}>Open push builder</Button><p className="hint">Build the in-app push here. Delivered next time the wallet opens your app, or instantly if a device is active.</p></>}
                  {selStep.type === 'tag' && <Select label="Tag" options={opts(['season-2', 'whale', 'collector', 'new'])} />}
                  {selStep.type === 'list' && <Select label="List" options={opts(['Newsletter subscribers', 'Season 2 waitlist', 'VIP holders', 'Airdrop applicants', '+ New list…'])} />}
                  {selStep.type === 'webhook' && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>URL</span><input className="txtin" placeholder="https://api.example.com/hooks/…" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }} /></label>}
                  {selStep.type === 'campaign' && <Select label="Campaign" options={opts(['Acme is live', 'Pack drop: Season 2', 'Gas rebate week'])} />}
                  <div style={{ display: 'flex', gap: 8 }}>{!selStep.configured && <Button size="s" onClick={() => configure(sel!)}>Apply</Button>}<Button variant="tertiary" size="s" icon="trash-2" onClick={() => (nested && found ? clearPathAct(found.branchId!, found.path!) : removeStep(selStep.id))}>Remove</Button></div>
                </>
              ) : (
                <>
                  <h3>Flow settings</h3>
                  <div className="flow__panelrow"><span>Re-entry</span><Select aria-label="Re-entry" options={opts(['Never', 'After 30 days', 'Every time'])} style={{ width: 140 }} /></div>
                  <div className="flow__panelrow"><span>Exit on goal</span><FlowToggle label="Exit on goal" /></div>
                  <div className="flow__panelrow"><span>Respect quiet hours</span><FlowToggle label="Respect quiet hours" /></div>
                  <div className="flow__panelrow"><span>Max 1 message / 10h</span><FlowToggle label="Max 1 message / 10h" /></div>
                  <p className="hint">These caps apply across every Loop, so a wallet in three of them still hears from you at most once per window. Select a node to configure it.</p>
                </>
              )}
            </aside>
          </div>
        )}
        {editorOpen && <EmailBuilder name={selStep ? selStep.label : 'Loop email'} onClose={() => setEditorOpen(false)} />}
        {pushEditor && <PushBuilder name={pushEditor.label} onClose={() => setPushEditor(null)} />}
      </div></div>
    );
  }

  /* ---------- list ---------- */
  /* An empty workspace has nothing to show here yet, so the section says what it is for and
     what fills it, rather than rendering the demo as if it were theirs. */
  if (workspace === 'empty') {
    return (
      <div className="page">
        <PageHeader title="Loops" sub="Lifecycle flows that run without you. A wallet enters on a trigger (went quiet, staked, finished onboarding) and moves through the steps you set." />
        <SectionEmpty icon="zap" title="No Loops yet" body="A Loop moves each wallet through steps you set when something happens: a mint, a stake, a wallet going quiet. Those events start arriving once your contract is indexed." action={{ label: 'Go to Integrations', to: '/integrations' }} />
      </div>
    );
  }

  return (
    /* Not page--wide, unlike the builder below it. The list is one of three tabs, and the
       other two are standard width — so switching between them moved the whole page edge.
       The builder keeps the extra width because a canvas needs it. */
    <div className="page"><div className="auto">
      {/* The same header its two sibling tabs use. This one put the tabs first and then
          repeated a bare title underneath them with no description — so moving between
          Campaigns, Loops and Forms shifted the title, the action and the first card down
          the page, and Loops was the only one that never said what it was for. */}
      <PageHeader title="Loops"
        sub="Lifecycle flows that run without you. A wallet enters on a trigger (went quiet, staked, finished onboarding) and moves through the steps you set."
        actions={<Button icon="plus" onClick={() => setMode('recipes')}>New Loop</Button>} />
      <div className="auto__strip">
        <div className="auto__stat"><span>Active flows</span><b>2</b></div>
        <div className="auto__stat"><span>Entries · 30d</span><b>2,268</b></div>
        {/* The mean of each flow's rate, not of all wallets — those differ by 9 points here
            (37.4% vs 28.0% weighted), and "Avg completion" alone read as the latter. */}
        <div className="auto__stat"><span>Avg completion per flow</span><b>37.4%</b></div>
        <div className="auto__stat"><span>On-chain conversions</span><b>424</b></div>
      </div>
      <div className="auto__toolbar">
        <div className="auto__search"><Icon name="search" size={16} color="var(--text-tertiary)" /><input placeholder="Search Loops…" aria-label="Search Loops" /></div>
        <div style={{ display: 'flex', gap: 8 }}><Chip on>All · 4</Chip><Chip>Active · 2</Chip><Chip>Paused · 1</Chip><Chip>Draft · 1</Chip></div>
      </div>
      <div className="auto__tablecard">
        <table className="auto__table">
          <thead><tr><th>Loop</th><th>Status</th><th className="num">Entries · 30d</th><th className="num">Completed</th><th className="num">Conversions</th><th className="num">Last triggered</th><th style={{ width: 40 }}><span className="sr-only">Open</span></th></tr></thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.id} onClick={() => openRow(r)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openRow(r)}>
                <td><span className="auto__name"><b>{r.name}</b><span>{r.trigger}</span></span></td>
                <td><Badge status={r.status}>{r.statusLabel}</Badge></td>
                <td className="num">{r.enrolled}</td>
                <td className="num">{r.completed}</td>
                <td className="num">{r.conv}</td>
                <td className="num" style={{ color: 'var(--text-secondary)' }}>{r.last}</td>
                <td className="num"><Icon name="chevron-right" size={16} color="var(--text-tertiary)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div></div>
  );
}
