import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SectionEmpty } from '../components/SectionEmpty';
import { useWorkspaceMode } from '../data/workspace';
import { PageHeader } from '../shell/Shell';
import { useSearchParams } from 'react-router-dom';
import { AddressChip, Badge, Button, Identicon, Select } from '../components/ui';
import { Icon } from '../components/icons';
import { toast } from '../components/toast';
import type { IconName } from '../components/icons';
import { store, useSegments } from '../data/store';
import { SyncModal, SyncStatus, useWalletSync } from '../components/WalletSync';
import { SegmentRow } from '../components/SegmentList';
import { downloadCsv } from '../data/persist';
import { runQuery, type QueryResult } from '../data/queries';
import { ResultChart, defaultChartKind, type ChartKind } from './charts';
import { CampaignWizard } from './CampaignWizard';
import {
  ATTRIBUTE_FIELDS, EVENT_FIELDS, OPS as RULE_OPS, WINDOWS, addTo, describe, estimate,
  isEventField, newGroup, newPredicate, opMeta, removeNode, treeFromQueryRules, updateNode,
  type Group, type Op, type Predicate,
} from '../data/segmentRules';
import './intelligence.css';

const SUGGESTIONS: { icon: IconName; text: string; kind: 'onchain' | 'offchain' }[] = [
  { icon: 'coins', text: 'Top holders by token', kind: 'onchain' },
  { icon: 'layers', text: 'Wallet balances across chains', kind: 'onchain' },
  { icon: 'mail-open', text: 'Wallets that opened but never clicked', kind: 'offchain' },
  { icon: 'megaphone', text: 'Best-converting campaign by segment', kind: 'offchain' },
];

type Rule = { id: number; field: string; op: string; val: string };
let ruleId = 3;

/* The rule tree (2.7).
 *
 * Nesting, negation and frequency, which the flat builder could not express. Two details
 * carry most of the value.
 *
 * Changing the field switches the operator set, because attribute operators and event
 * operators are not interchangeable — "wallet balance has NOT done" is nonsense the old
 * builder would happily have let you write.
 *
 * And the window is a required control on every event predicate, never a default. "Has not
 * staked" is unanswerable without one, and quietly assuming 30 days produces an audience
 * that looks correct and is not. */
function RuleRow({ node, onChange, onRemove }: {
  node: Predicate; onChange: (n: Predicate) => void; onRemove: () => void;
}) {
  const meta = opMeta(node.op);
  const eventField = isEventField(node.field);
  const allowed = RULE_OPS.filter((o) => o.event === eventField);

  return (
    <div className="rule rule--tree">
      <Select
        options={[
          ...ATTRIBUTE_FIELDS.map((f) => ({ value: f, label: f })),
          ...EVENT_FIELDS.map((f) => ({ value: f, label: f })),
        ]}
        value={node.field}
        onChange={(e) => {
          const field = e.target.value;
          const nowEvent = isEventField(field);
          // Operator sets do not overlap, so switching kind has to reset it.
          const op: Op = nowEvent === eventField ? node.op : (nowEvent ? 'did' : 'gt');
          onChange({ ...node, field, op });
        }}
        style={{ width: 168 }} aria-label="Field" />

      <Select options={allowed.map((o) => ({ value: o.id, label: o.label }))} value={node.op}
        onChange={(e) => onChange({ ...node, op: e.target.value as Op })}
        style={{ width: 152 }} aria-label="Operator" />

      {meta.counted && (
        <input className="itxtin" type="number" min={1} value={node.count} style={{ width: 62 }} aria-label="Times"
          onChange={(e) => onChange({ ...node, count: Math.max(1, Number(e.target.value)) })} />
      )}
      {meta.counted && <span className="rule__jn">times</span>}

      {!meta.event && (
        <input className="itxtin" value={node.value} style={{ width: 110 }} aria-label="Value"
          onChange={(e) => onChange({ ...node, value: e.target.value })} />
      )}

      {meta.event && (
        <>
          <span className="rule__jn">in the last</span>
          <Select options={WINDOWS.map((w) => ({ value: String(w), label: `${w} days` }))} value={String(node.windowDays)}
            onChange={(e) => onChange({ ...node, windowDays: Number(e.target.value) })}
            style={{ width: 106 }} aria-label="Window" />
        </>
      )}

      <span style={{ marginLeft: 'auto', display: 'flex' }}>
        <Button variant="tertiary" size="s" icon="x" aria-label="Remove rule" onClick={onRemove} />
      </span>
    </div>
  );
}

function GroupBlock({ group, root, onChange, depth }: {
  group: Group; root: Group; onChange: (g: Group) => void; depth: number;
}) {
  return (
    <div className={depth > 0 ? 'rgroup rgroup--nested' : 'rgroup'}>
      {group.children.map((child, i) => (
        <div key={child.id} className="rgroup__row">
          <button type="button" className="rgroup__jn"
            disabled={i === 0}
            title={i === 0 ? undefined : 'Switch between AND and OR'}
            onClick={() => onChange(updateNode(root, group.id, (n) =>
              n.kind === 'group' ? { ...n, op: n.op === 'and' ? 'or' : 'and' } : n))}>
            {i === 0 ? 'Where' : group.op === 'and' ? 'And' : 'Or'}
          </button>
          {child.kind === 'predicate' ? (
            <RuleRow node={child}
              onChange={(n) => onChange(updateNode(root, child.id, () => n))}
              onRemove={() => onChange(removeNode(root, child.id))} />
          ) : (
            <GroupBlock group={child} root={root} onChange={onChange} depth={depth + 1} />
          )}
        </div>
      ))}
      <div className="rgroup__add">
        <Button variant="tertiary" size="s" icon="plus"
          onClick={() => onChange(addTo(root, group.id, newPredicate()))}>Add rule</Button>
        {depth < 2 && (
          <Button variant="tertiary" size="s" icon="split"
            onClick={() => onChange(addTo(root, group.id, newGroup(group.op === 'and' ? 'or' : 'and')))}>Add group</Button>
        )}
      </div>
    </div>
  );
}

function RuleTree({ root, onChange, count }: { root: Group; onChange: (g: Group) => void; count?: number | null }) {
  /* One number on screen. When the rules came straight from a question, the count that
     question returned is the count, and the live preview beside this shows the same one;
     the moment a rule is edited, both switch to the estimate for the new rules. */
  const modelled = estimate(root, 128540);
  const est = count != null ? { count, approximate: false } : modelled;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <GroupBlock group={root} root={root} onChange={onChange} depth={0} />
      <div className="rsummary">
        <Icon name="users" size={14} color="var(--action-primary)" />
        <span>
          <b>{est.approximate ? '≈' : ''}{est.count.toLocaleString('en-US')}</b> wallets match
          {est.approximate && (
            /* Negation is an anti-join and does not stay fast at audience scale, so this is
               a sampled estimate. Saying so is cheaper than a spinner that implies precision. */
            <em> (estimated from a sample, because &ldquo;has not&rdquo; rules scan the whole event history)</em>
          )}
        </span>
      </div>
      <p className="rsummary__say">{describe(root)}</p>
    </div>
  );
}

/** Intelligence — chat-first explorer. Chat → SQL → result → save-as-segment / create-campaign
    is the core chain; Segments is the shared source of truth the campaign wizard reads. */
export default function IntelligenceScreen() {
  const workspace = useWorkspaceMode();
  const [params, setParams] = useSearchParams();
  const seeded = params.get('q');
  const intent = params.get('do');
  // 2.5 names the assistant. The glyph follows the name so the floating panel, the
  // dashboard bar and this page all read as one thing.
  const aiIcon = 'brain';

  const [tab, setTab] = useState<'chat' | 'segments'>('chat');
  const [conversation, setConversation] = useState<'empty' | 'seed'>('empty');
  const [result, setResult] = useState<QueryResult>(() => runQuery('Who are the top holders of $VAULT?'));
  const [draft, setDraft] = useState('');
  const [ansView, setAnsView] = useState<'table' | 'chart' | 'sql'>('table');
  const [chartKind, setChartKind] = useState<ChartKind>('bar');
  const [sqlText, setSqlText] = useState('');
  const [sqlDirty, setSqlDirty] = useState(false);
  // A segment draft handed over from a query result — keeps the two tabs correlated.
  const [fromQuery, setFromQuery] = useState<string | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(false);
  /* Shared with Audience: one record, so the two screens cannot disagree about when the
     audience was last read. */
  const lastRun = useWalletSync();
  const [prompt, setPrompt] = useState('');
  const [rules, setRules] = useState<Rule[]>([
    { id: 1, field: 'Wallet balance', op: 'is greater than', val: '10' },
    { id: 2, field: 'Email opened', op: 'is within', val: '7 days' },
  ]);
  /* Kept as state though nothing toggles it any more: the rule tree carries its own
     AND/OR per group, and this is the fallback the saved-segment description and the preview
     count still read. */
  const [match] = useState<'all' | 'any'>('all');
  const [tree, setTree] = useState<Group>(() => ({
    kind: 'group', id: 0, op: 'and',
    children: [newPredicate('Wallet balance'), { ...newPredicate('Staked'), op: 'did_not' as Op }],
  }));
  const [segName, setSegName] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [wizard, setWizard] = useState<{ segments: string[]; name: string } | null>(null);
  // Segments the user saves persist across reloads and appear alongside the seeded ones.
  /* Saved segments live in the store, not here. They were a private copy, so saving one and
     then building a campaign on it was a dead end — every other consumer read the seeded
     list. */
  const segments = useSegments();

  const ask = (q: string) => {
    const r = runQuery(q);
    setResult(r);
    setSqlText(r.sql);
    setSqlDirty(false);
    setChartKind(defaultChartKind(r.points, r.isTimeSeries));
    setDraft(''); setAnsView('table'); setConversation('seed');
  };

  /* Save as segment — carry the query across so the Segments tab shows the segment this
     result defines, not a blank draft. */
  const saveAsSegment = () => {
    setSegName(result.segment.name);
    setRules(result.segment.rules.map((r, i) => ({ ...r, id: 1000 + i })));
    // The builder opens on the question's own rules, not its default tree.
    setTree(treeFromQueryRules(result.segment.rules));
    setPreviewCount(result.segment.count);
    setFromQuery(result.question);
    setPrompt('');
    setTab('segments');
  };

  /* Home Ask bar and the Intelligence panel both hand off here with the question pre-loaded
     (one-directional; cleared once consumed). `do` carries the *action* the operator
     already chose, so a "Build a campaign" click in the panel lands on the wizard rather
     than on a result they have to act on a second time. */
  useEffect(() => {
    if (!seeded) return;
    const r = runQuery(seeded);
    setResult(r); setSqlText(r.sql); setSqlDirty(false);
    setChartKind(defaultChartKind(r.points, r.isTimeSeries));
    setDraft(''); setAnsView('table'); setConversation('seed');
    setTab('chat');

    if (intent === 'segment' && r.kind === 'data') {
      setSegName(r.segment.name);
      setRules(r.segment.rules.map((rule, i) => ({ ...rule, id: 2000 + i })));
      setTree(treeFromQueryRules(r.segment.rules));
      setPreviewCount(r.segment.count);
      setFromQuery(r.question);
      setTab('segments');
    } else if (intent === 'campaign' && r.kind === 'data') {
      setWizard({ segments: [r.segment.id], name: r.segment.name });
    }

    const nextParams = new URLSearchParams(params);
    nextParams.delete('q'); nextParams.delete('do');
    setParams(nextParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seeded, intent]);

  const closeEnrich = () => setEnrichOpen(false);
  /* Read from the rule tree, not a constant. This was a hardcoded 1,204 sitting under a
     heading that said "Live preview" and a caption that said "updates as you edit" — and
     editing the rules moved nothing. The tree already computes an estimate; it just was not
     wired to the card claiming to show one. */
  const count = estimate(tree, 128540).count.toLocaleString('en-US');
  const totalWallets = useMemo(() => segments.reduce((a, s) => a + s.count, 0), [segments]);

  if (wizard) return <CampaignWizard onExit={() => setWizard(null)} initialSegments={wizard.segments} initialName={wizard.name} />;

  const aiWrap = (children: ReactNode) => (
    <div className="msg"><span className="msg__ai"><Icon name={aiIcon} size={15} /></span><div className="msg__body">{children}</div></div>
  );

  const answer = aiWrap(
    <>
      <div className="msg__text">Here&apos;s what I found for <b>“{result.question}”</b>: {result.summary}.</div>
      <div className="ans">
        <div className="ans__tabs">
          {([['table', 'grid-2x2', 'Table'], ['chart', 'bar-chart-3', 'Chart'], ['sql', 'code', 'SQL']] as const).map(([id, ic, l]) => (
            <button key={id} type="button" className={`ans__tab${ansView === id ? ' on' : ''}`} onClick={() => setAnsView(id)}><Icon name={ic} size={13} />{l}</button>
          ))}
        </div>
        <div>
          {ansView === 'table' ? (
            <table className="ans__table">
              <thead><tr>{result.columns.map((c, i) => <th key={c} className={i ? 'num' : undefined}>{c}</th>)}</tr></thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.wallet ?? r.cells.join()}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {r.wallet && <Identicon address={r.wallet} size={22} />}
                        {r.ens && <b style={{ fontWeight: 500 }}>{r.ens}</b>}
                        {r.wallet && <AddressChip address={r.wallet} />}
                      </span>
                    </td>
                    {r.cells.map((c, i) => <td key={i} className="num" style={i === r.cells.length - 1 ? { color: 'var(--text-secondary)' } : undefined}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : ansView === 'chart' ? (
            <div className="ans__chart">
              <div className="chartbar">
                <span className="chartbar__lbl">Chart type</span>
                <div className="chartbar__seg">
                  {([['bar', 'chart-column', 'Bar'], ['line', 'chart-line', 'Line'], ['donut', 'chart-pie', 'Donut']] as const).map(([k, ic, l]) => (
                    <button key={k} type="button" className={chartKind === k ? 'on' : ''} onClick={() => setChartKind(k)} aria-pressed={chartKind === k}>
                      <Icon name={ic} size={13} />{l}
                    </button>
                  ))}
                </div>
                {chartKind === defaultChartKind(result.points, result.isTimeSeries) && (
                  <span className="chartbar__auto">Auto-picked for this result</span>
                )}
              </div>
              <ResultChart kind={chartKind} points={result.points} />
            </div>
          ) : (
            <>
              <textarea className="ans__sqled" value={sqlText} spellCheck={false} aria-label="SQL query"
                onChange={(e) => { setSqlText(e.target.value); setSqlDirty(e.target.value !== result.sql); }} />
              <div className="ans__sqlbar">
                <Button variant="tertiary" size="s" icon="rotate-ccw" disabled={!sqlDirty}
                  onClick={() => { setSqlText(result.sql); setSqlDirty(false); }}>Reset</Button>
                <Button variant={sqlDirty ? 'primary' : 'tertiary'} size="s" icon="play"
                  onClick={() => { setSqlDirty(false); setAnsView('table'); }}>Re-run</Button>
                {sqlDirty
                  ? <span className="ans__dirty"><Icon name="pencil" size={12} />Edited. Re-run to apply</span>
                  : <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>{totalWallets.toLocaleString('en-US')} rows scanned</span>}
              </div>
            </>
          )}
        </div>
        <div className="ans__acts">
          <Button variant="secondary" size="s" icon="users" onClick={saveAsSegment}>Save as segment</Button>
          <Button variant="secondary" size="s" icon="megaphone" onClick={() => setWizard({ segments: [result.segment.id], name: result.segment.name })}>Create campaign</Button>
          <Button variant="tertiary" size="s" icon="download" onClick={() => downloadCsv(`onchainsuite-${result.question.slice(0, 40).replace(/\W+/g, '-').toLowerCase()}.csv`, [
            result.columns,
            ...result.rows.map((r) => [r.ens || r.wallet || '', ...r.cells]),
          ])}>Export CSV</Button>
        </div>
      </div>
    </>
  );

  const unknownAnswer = aiWrap(
    <>
      <div className="msg__text">I can&apos;t answer that one. I work over your <b>on-chain activity</b> and <b>messaging engagement</b>. I can&apos;t predict prices, read the news, or fetch anything off-platform.</div>
      <div className="note">
        <span className="note__hd"><Icon name="compass" size={15} color="var(--action-primary)" />Try asking instead</span>
        <div className="note__chips">
          {['Top holders of $VAULT by chain', 'Wallets that opened my last email but didn’t buy', 'Average gas spent by my whales this month'].map((s) => (
            <button key={s} type="button" className="note__chip" onClick={() => ask(s)}><Icon name="corner-down-right" size={13} />{s}</button>
          ))}
        </div>
      </div>
    </>
  );
  const emptyAnswer = aiWrap(
    <>
      <div className="msg__text">The query ran, but <b>no wallets matched</b>. That usually means the data isn&apos;t indexed yet or the filter is too narrow.</div>
      <div className="note">
        <span className="note__hd"><Icon name="search-x" size={15} color="var(--text-tertiary)" />No results</span>
        <div className="note__chips">
          <button type="button" className="note__chip" onClick={() => setEnrichOpen(true)}><Icon name="sparkles" size={13} />Enrich more wallets</button>
          <button type="button" className="note__chip" onClick={() => ask('Top holders of $VAULT by chain')}><Icon name="sliders-horizontal" size={13} />Broaden the filter</button>
          <button type="button" className="note__chip" onClick={() => { setResult(runQuery('Top holders of $VAULT by chain')); setAnsView('sql'); }}><Icon name="code" size={13} />Edit the SQL</button>
        </div>
      </div>
    </>
  );
  const clarifyAnswer = aiWrap(
    <>
      <div className="msg__text">Happy to. Which did you mean?</div>
      <div className="note">
        <span className="note__hd"><Icon name="help-circle" size={15} color="var(--action-primary)" />Pick one to run</span>
        <div className="note__chips">
          {['Top wallets by token balance', 'Most active wallets in the last 30 days', 'Wallets with the highest engagement'].map((s) => (
            <button key={s} type="button" className="note__chip" onClick={() => ask(s)}><Icon name="corner-down-right" size={13} />{s}</button>
          ))}
        </div>
      </div>
    </>
  );

  /* An empty workspace has nothing to show here yet, so the section says what it is for and
     what fills it, rather than rendering the demo as if it were theirs. */
  if (workspace === 'empty') {
    return (
      <div className="page">
        <PageHeader title="Intelligence" sub="Ask about your holders in plain English." />
        <SectionEmpty icon="brain" title="Nothing to ask about yet" body="Intelligence answers questions about your holders: who went dormant, who the whales are, who opened but never clicked. It needs holders to answer from, and those arrive with your first indexed contract." action={{ label: 'Go to Integrations', to: '/integrations' }} />
      </div>
    );
  }

  return (
    <div className="page page--wide"><div className="int">
      <div className="int__head">
        <h1>Intelligence</h1>
        <span style={{ flex: 1 }} />
        {/* "Refresh" is what you do to a page. This reads the chain for every wallet you
            hold and decides whether everything downstream is working from facts or from
            months-old ones, so it is named for what it does and reports what it found. */}
        <SyncStatus run={lastRun} onOpen={() => setEnrichOpen(true)} />
      </div>

      <div className="int__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'chat'} className={`int__tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}><Icon name="message-square" size={16} />Chat</button>
        <button type="button" role="tab" aria-selected={tab === 'segments'} className={`int__tab${tab === 'segments' ? ' on' : ''}`} onClick={() => setTab('segments')}><Icon name="users" size={16} />Segments<i>{segments.length}</i></button>
      </div>

      {tab === 'chat' && (
        <div className="chat">
          <div className="chat__scroll">
            {conversation === 'empty' ? (
              <div className="chat__empty">
                <span className="chat__spark"><Icon name={aiIcon} size={20} /></span>
                <h2>Ask anything about onchain activity</h2>
                <p>Trace token holders, compare wallets, analyse gas, or cross on-chain behaviour with email, push and campaign engagement, in plain English.</p>
                <div className="chat__sugg">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.text} type="button" className="chat__suggbtn" onClick={() => ask(s.text)}>
                      <span className="chat__sicn"><Icon name={s.icon} size={16} /></span>
                      <span style={{ flex: 1 }}>{s.text}</span>
                      <span className="chat__kind">{s.kind === 'onchain' ? 'On-chain' : 'Off-chain'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="msg msg--user"><div className="msg__bubble">{result.question}</div></div>
                {result.kind === 'unknown' ? unknownAnswer : result.kind === 'empty' ? emptyAnswer : result.kind === 'clarify' ? clarifyAnswer : answer}
              </>
            )}
          </div>
          <div className="chat__composer">
            <div className="chat__input">
              <Icon name={aiIcon} size={16} color="var(--text-tertiary)" />
              <input placeholder="Ask anything about onchain activity…" aria-label="Ask a question" value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) ask(draft); }} />
            </div>
            <button type="button" className="chat__send" disabled={!draft.trim()} onClick={() => draft.trim() && ask(draft)} aria-label="Send"><Icon name="arrow-up" size={18} /></button>
          </div>
        </div>
      )}

      {tab === 'segments' && (
        <div className="seg__wrap">
          <div className="icard">
            <div className="icard__head"><h3>New segment</h3><span style={{ marginLeft: 'auto' }}><Badge status="neutral">Draft</Badge></span></div>
            <div className="icard__body">
              {fromQuery && (
                <div className="fromq">
                  <Icon name="sparkles" size={15} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span className="fromq__tx">
                    Built from your question <b>“{fromQuery}”</b>. The rules below are what that query matches. Edit anything before saving.
                  </span>
                  <button type="button" className="fromq__x" aria-label="Clear query source" onClick={() => { setFromQuery(null); setPreviewCount(null); setSegName(''); }}><Icon name="x" size={14} /></button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label htmlFor="seg-name" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Segment name</label>
                <input id="seg-name" className="itxtin" style={{ width: '100%' }} placeholder="e.g. Base whales" value={segName} onChange={(e) => setSegName(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label htmlFor="seg-prompt" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Describe your audience</label>
                <div className="ai">
                  <Icon name="sparkles" size={16} color="var(--action-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <textarea id="seg-prompt" className="ai__in" rows={2} placeholder="e.g. Base wallets over 10 ETH who opened our last email but didn't buy" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <Button size="s" icon="wand-sparkles" onClick={() => prompt.trim() && setRules([{ id: ruleId++, field: 'Wallet balance', op: 'is greater than', val: '10' }, { id: ruleId++, field: 'Email opened', op: 'is within', val: '7 days' }])}>Generate</Button>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>The prompt becomes editable rules below. Tweak anything by hand.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <RuleTree root={tree} count={previewCount}
                  onChange={(g) => { setTree(g); setPreviewCount(null); }} />
                <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  <Icon name="shield-check" size={13} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
                  Balance, token and gas rules are matched with zero-knowledge proofs. Wallets qualify without their exact values ever being exposed.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <Button variant="secondary" onClick={() => { setFromQuery(null); setSegName(''); setPreviewCount(null); }}>Cancel</Button>
                <Button icon="users" disabled={!segName.trim()} onClick={() => {
                  const desc = rules.map((r) => `${r.field} ${r.op} ${r.val}`).join(match === 'all' ? ' AND ' : ' OR ') || 'No rules';
                  const total = previewCount ?? estimate(tree, 128540).count;
                  /* Reach is part of a segment everywhere else in the product, so a saved one
                     has to carry it or the campaign wizard reads undefined and quietly sends
                     to nobody. */
                  store.saveSegment({
                    id: `seg-${Date.now()}`, name: segName.trim(), desc, count: total,
                    email: Math.round(total * 0.78), wallet: total, synced: 'just now',
                  });
                  setSegName(''); setFromQuery(null); setPreviewCount(null);
                  toast('Segment saved');
                }}>Save segment</Button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="icard">
              <div className="icard__head"><h3>Live preview</h3></div>
              <div className="icard__body">
                <div><span className="preview__count">{previewCount != null ? previewCount.toLocaleString('en-US') : count}</span><div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>matching wallets · estimated, recomputed as you edit</div></div>
                {result.rows.filter((r) => r.wallet).slice(0, 3).map((r) => (
                  <div key={r.wallet} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Identicon address={r.wallet!} size={22} />{r.ens && <b style={{ fontSize: 13, fontWeight: 500 }}>{r.ens}</b>}<AddressChip address={r.wallet!} /></div>
                ))}
                <Button variant="tertiary" size="s" icon="megaphone" onClick={() => setWizard({ segments: [result.segment.id], name: segName.trim() || 'New segment campaign' })}>Create campaign from segment</Button>
              </div>
            </div>
            <div>
              <p className="rep__lbl">Saved segments</p>
              <div className="seglist" style={{ marginTop: 8 }}>
                {segments.map((s) => <SegmentRow key={s.id} s={s} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {enrichOpen && <SyncModal onClose={closeEnrich} />}
    </div></div>
  );
}
