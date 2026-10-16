import { useMemo, useRef, useState } from 'react';
import { SectionEmpty } from '../components/SectionEmpty';
import { useWorkspaceMode } from '../data/workspace';
import { PageHeader } from '../shell/Shell';
import { AddressChip, Badge, Button, Card, ChannelDots, Drawer, EmptyState, Input, Modal, PillTabs, Select, Table, type Column, NO_VALUE } from '../components/ui';
import { Icon } from '../components/icons';
import { toast } from '../components/toast';
import { downloadCsv } from '../data/persist';
import { parseContacts } from '../data/csv';
import {
  CONTACTS, store, useLists, useSuppressions, useTags,
} from '../data/store';
import { contactsInList, contactsWithTag } from '../data/mock';
import type { Contact } from '../data/types';
import { BAND_LABEL, healthFor } from '../data/health';
import { stageMeta, stageFor } from '../data/lifecycle';
import { enrolmentsFor } from '../data/relationships';
import { appMarks, chainMarks, tokenMarks } from '../data/holdings';
import { SegmentList } from '../components/SegmentList';
import { SyncButton, SyncModal, useWalletSync } from '../components/WalletSync';
import { agoLabel } from '../data/enrichment';
import { LANE_META, coverageFor, latestFor, quietSince, relativeLabel, timelineFor } from '../data/timeline';
import { Web3Mark } from '../components/Web3Mark';
import { SEGMENTS } from '../data/mock';

/* Segments sit here, between Tags and Suppressed (2.7). A segment is a slice of the audience,
   so it belongs with the other ways of slicing it — Intelligence keeps a view of the same list for
   asking questions about one, which is a different job from seeing what you have. */
type Tab = 'contacts' | 'lists' | 'tags' | 'segments' | 'suppressed';
type Detail = { kind: 'list' | 'tag'; id: string; name: string } | null;

const emailReachable = CONTACTS.filter((c) => c.reachable.includes('email')).length;
const pushReachable = CONTACTS.filter((c) => c.reachable.includes('push')).length;
const withWallet = CONTACTS.filter((c) => c.address).length;

export default function AudienceScreen() {
  const workspace = useWorkspaceMode();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const lastSync = useWalletSync();
  const bothLanes = useMemo(() => {
    const wallets = CONTACTS.filter((c) => c.address);
    const n = wallets.filter((c) => coverageFor(c).product).length;
    return { n, wallets: wallets.length, pct: wallets.length ? Math.round((n / wallets.length) * 100) : 0 };
  }, []);
  const lists = useLists();
  const tags = useTags();
  const suppressions = useSuppressions();
  const [tab, setTab] = useState<Tab>('contacts');
  const [contact, setContact] = useState<Contact | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [modal, setModal] = useState<'list' | 'tag' | null>(null);

  const tabs = [
    { id: 'contacts', label: 'Contacts', count: CONTACTS.length },
    { id: 'lists', label: 'Lists', count: lists.length },
    { id: 'tags', label: 'Tags', count: tags.length },
    { id: 'segments', label: 'Segments', count: SEGMENTS.length },
    { id: 'suppressed', label: 'Suppressed', count: suppressions.length },
  ];

  /* 2.7 trades the Tags column for what the wallet actually holds and touches. Tags are our
     labels — a column of them shows you your own filing, not the contact. Chains, apps and
     tokens are indexed facts, and they are what someone scanning the list is reading for.
     Tags remain on the row drawer and keep their own tab; only the column goes. */
  /* Five columns at 2.7, down from eight.
   *
   * Eight forced the table to scroll sideways, which is the worst thing a list can do: you
   * cannot scan rows and read columns at the same time, so the extra columns cost you the
   * ones that were already there. Email, chains, apps, tokens and tags move to the drawer,
   * where there is room to show them properly rather than as three circles and a +2.
   *
   * What stays is what a growth manager scans for: who, what state they are in, what they
   * are worth, what they last did, and when. "Last did" is new and is the only column that
   * shows both lanes in one glance — which is the whole product in a table cell. */
  const contactCols: Column<Contact>[] = [
    { key: 'wallet', label: 'Contact', render: (r) => <WalletCell c={r} /> },
    { key: 'stage', label: 'Stage', render: (r) => <StageCell c={r} /> },
    /* Left-aligned, unlike the 2.5 Lifetime column it replaces.
     *
     * One right-aligned column in the middle of four left-aligned ones puts all of its
     * whitespace on one side: a canyon between Stage and the number, and the number pressed
     * up against Last did with nothing between them. Right alignment earns its keep when a
     * reader compares decimals down a column; these are short unit-suffixed amounts, and
     * tabular figures keep the digits even without it. */
    { key: 'ltv', label: 'Value', hint: 'Total value this wallet has moved through your contracts, in ETH.', render: (r) => (r.address ? `${r.ltvEth} ETH` : NO_VALUE) },
    { key: 'did', label: 'Last did', hint: 'The most recent thing this contact did, in your app or on the chain. Both lanes, one column.', render: (r) => <LastDidCell c={r} /> },
    { key: 'last', label: 'Last seen', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.lastActive}</span> },
  ];

  /* An empty workspace has nothing to show here yet, so the section says what it is for and
     what fills it, rather than rendering the demo as if it were theirs. */
  if (workspace === 'empty') {
    return (
      <div className="page">
        <PageHeader title="Audience" sub="Wallet-first identity. Segments are channel-aware. Reachable in-app is a different filter from has email." />
        <SectionEmpty icon="users" title="No one here yet" body="Your audience is the holders of your contracts, with email, push and X joined on as people connect them. It fills in once your contract is indexed." action={{ label: 'Go to Integrations', to: '/integrations' }} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader title="Audience" sub="Wallet-first identity. Segments are channel-aware. Reachable in-app is a different filter from has email."
        actions={<>
          <Button variant="secondary" icon="upload" onClick={() => setImporting(true)}>Import CSV</Button>
          <Button variant="secondary" icon="download" onClick={() => downloadCsv('onchainsuite-contacts.csv', [
            ['Wallet', 'ENS', 'Email', 'Reachable via', 'Tags', 'Lifetime ETH', 'Chains', 'Apps', 'Tokens', 'Last active'],
            ...CONTACTS.map((c) => [c.address ?? '', c.ens ?? '', c.email ?? (c.reachable.includes('email') ? 'ZK-protected' : ''), c.reachable.join(' · '), c.tags.join(' '), c.ltvEth, chainMarks(c.chains).map((m) => m.label).join(' '), appMarks(c.apps).map((m) => m.label).join(' '), tokenMarks(c.tokens).map((m) => m.label).join(' '), c.lastActive]),
          ])}>Export</Button>
          <SyncButton onOpen={() => setSyncing(true)} size="m" variant="primary" />
        </>} />

      {/* The same line Intelligence shows, from the same record — if one screen says the audience
          was read an hour ago, the other cannot say never. */}
      {lastSync && (
        <p className="aud__synced">
          <Icon name="database" size={13} color="var(--action-primary)" />
          Last synced {agoLabel(lastSync.at)} · {lastSync.added.toLocaleString('en-US')} added,
          {' '}{lastSync.updated.toLocaleString('en-US')} refreshed
        </p>
      )}

      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="stat"><span className="stat__label">Total contacts</span><div className="stat__value">{CONTACTS.length.toLocaleString('en-US')}</div><div className="stat__sub">{withWallet} with a wallet · {CONTACTS.length - withWallet} email-only</div></div>
        <div className="stat"><span className="stat__label">Email-reachable</span><div className="stat__value">{emailReachable.toLocaleString('en-US')}</div><div className="stat__sub">have a linked email</div></div>
        <div className="stat"><span className="stat__label">Push-reachable</span><div className="stat__value">{pushReachable.toLocaleString('en-US')}</div><div className="stat__sub">signed-in devices</div></div>
        {/* Coverage, which is the number that says whether the join is actually working.
            An audience where most wallets have no product events is not a broken audience —
            it is an instrumentation gap, and it is worth a tile rather than a chip on every
            row that happens to be missing one. */}
        <div className="stat">
          <span className="stat__label">Both lanes</span>
          <div className="stat__value">{bothLanes.pct}%</div>
          <div className="stat__sub">{bothLanes.n} of {bothLanes.wallets} wallets · {bothLanes.wallets - bothLanes.n} chain only</div>
        </div>
        <div className="stat"><span className="stat__label">Suppressed</span><div className="stat__value">{suppressions.length}</div><div className="stat__sub">unsubscribed or bounced</div></div>
      </div>

      {detail ? (
        <MemberView detail={detail} onBack={() => setDetail(null)} onOpenContact={setContact} />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <PillTabs tabs={tabs} active={tab} onChange={(t) => setTab(t as Tab)} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {tab === 'lists' && <Button size="s" icon="plus" onClick={() => setModal('list')}>New list</Button>}
              {tab === 'tags' && <Button size="s" icon="plus" onClick={() => setModal('tag')}>New tag</Button>}
            </div>
          </div>

          <Card pad={false} style={{ overflow: 'hidden' }}>
            {tab === 'contacts' && (
              <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                <Table className="aud__table" columns={contactCols} rows={CONTACTS} onRowClick={setContact} />
              </div>
            )}

            {tab === 'lists' && (
              lists.length ? (
                <Table
                  columns={[
                    { key: 'name', label: 'List', render: (r) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</span> },
                    { key: 'source', label: 'Source', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.source}</span> },
                    { key: 'type', label: 'Type', render: (r) => <Badge status={r.type === 'Growing' ? 'success' : 'neutral'}>{r.type}</Badge> },
                    { key: 'reach', label: 'Reachable via', render: (r) => (r.reach.length ? <ChannelDots ids={r.reach} /> : <span style={{ color: 'var(--text-tertiary)' }}>None</span>) },
                    { key: 'count', label: 'Contacts', numeric: true, render: (r) => contactsInList(r.id).length.toLocaleString('en-US') },
                    { key: 'updated', label: 'Updated', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.updated}</span> },
                    { key: 'chev', label: '', srLabel: 'Open', render: () => <Icon name="chevron-right" size={16} color="var(--text-tertiary)" /> },
                  ]}
                  rows={lists}
                  onRowClick={(r) => setDetail({ kind: 'list', id: r.id, name: r.name })}
                />
              ) : <EmptyState icon="list" title="No lists yet" desc="Lists are built from form sign-ups and imports." action={<Button icon="plus" onClick={() => setModal('list')}>New list</Button>} />
            )}

            {tab === 'tags' && (
              <Table
                columns={[
                  { key: 'name', label: 'Tag', render: (r) => <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.name}</span> },
                  { key: 'rule', label: 'Rule', render: (r) => <Badge status="neutral">{r.rule}</Badge> },
                  { key: 'count', label: 'Contacts', numeric: true, render: (r) => contactsWithTag(r.id).length.toLocaleString('en-US') },
                  { key: 'updated', label: 'Updated', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.updated}</span> },
                  { key: 'chev', label: '', srLabel: 'Open', render: () => <Icon name="chevron-right" size={16} color="var(--text-tertiary)" /> },
                ]}
                rows={tags}
                onRowClick={(r) => setDetail({ kind: 'tag', id: r.id, name: r.name })}
              />
            )}

            {tab === 'segments' && (
              <SegmentList />
            )}

            {tab === 'suppressed' && (
              suppressions.length ? (
                <Table
                  columns={[
                    { key: 'wallet', label: 'Wallet', render: (r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{r.ens && <span style={{ fontWeight: 500 }}>{r.ens}</span>}<AddressChip address={r.address} /></span> },
                    { key: 'reason', label: 'Reason', render: (r) => <Badge status={r.reason === 'Bounced' ? 'error' : 'warning'}>{r.reason}</Badge> },
                    { key: 'channel', label: 'Channel' },
                    { key: 'since', label: 'Since' },
                    { key: 'action', label: '', srLabel: 'Reinstate', render: (r) => <Button variant="tertiary" size="s" onClick={() => store.reinstate(r.id)}>Reinstate</Button> },
                  ]}
                  rows={suppressions}
                />
              ) : <EmptyState icon="shield-check" title="Nothing suppressed" desc="Unsubscribed and bounced wallets appear here." />
            )}
          </Card>
        </>
      )}

      {contact && <ContactDrawer contact={contact} onClose={() => setContact(null)} />}
      {modal === 'list' && <NewListModal onClose={() => setModal(null)} />}
      {importing && <ImportCsvModal onClose={() => setImporting(false)} />}
      {syncing && <SyncModal onClose={() => setSyncing(false)} />}
      {modal === 'tag' && <NewTagModal onClose={() => setModal(null)} />}
    </div>
  );
}

/* Members of a list or tag — the drill-down that was missing in the prototype. */
function MemberView({ detail, onBack, onOpenContact }: { detail: NonNullable<Detail>; onBack: () => void; onOpenContact: (c: Contact) => void }) {
  const members = detail.kind === 'list' ? contactsInList(detail.id) : contactsWithTag(detail.id);
  const withEmail = members.filter((m) => m.reachable.includes('email')).length;
  return (
    <>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 14 }}>
        <Icon name="arrow-left" size={16} /> Back to {detail.kind === 'list' ? 'lists' : 'tags'}
      </button>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{detail.name}</h2>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{detail.kind === 'list' ? 'List' : 'Tag'} · {members.length} contacts · {withEmail} email-reachable</span>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--text-secondary)' }}>Every wallet in this {detail.kind}. Addresses show only for imported contacts. ZK-linked emails stay protected, so you can message them without ever seeing who they are.</p>
      <Card pad={false} style={{ overflow: 'hidden' }}>
        {members.length ? (
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <Table
              columns={[
                { key: 'wallet', label: 'Contact', render: (r) => <WalletCell c={r} /> },
                { key: 'email', label: 'Email', render: (r) => <EmailCell c={r} /> },
                { key: 'reach', label: 'Reachable via', render: (r) => <ChannelDots ids={r.reachable} /> },
                { key: 'ltv', label: 'Lifetime', numeric: true, render: (r) => `${r.ltvEth} ETH` },
              ]}
              rows={members}
              onRowClick={onOpenContact}
            />
          </div>
        ) : <EmptyState icon="users" title="Nothing in this list yet" desc="Contacts land here from form sign-ups, CSV imports and Loop steps that add to a list." />}
      </Card>
    </>
  );
}

/* The merged history — the drawer's reason to exist (2.7).
 *
 * Everywhere else the two lanes are joined in the abstract: a rule can mention both, a chart
 * can split by both. Here they are interleaved in the order they happened, which is the only
 * form in which the join reads as one story rather than two reports. Signed up, connected a
 * wallet, deposited, opened the email, placed a position, then nothing for a month.
 *
 * No other tool can draw this line. The 26 platforms we mapped cannot see the chain half, and
 * a block explorer cannot see the product half.
 */
function LaneTimeline({ contact }: { contact: Contact }) {
  const events = useMemo(() => timelineFor(contact), [contact]);
  const quiet = quietSince(events);
  const cov = coverageFor(contact);

  if (events.length === 0) {
    return (
      <>
        <Section label="History" />
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Nothing recorded yet. No product events, no chain activity.
        </p>
      </>
    );
  }

  return (
    <>
      <Section label="History" />
      <div className="tl">
        {/* The gap is the finding, not the absence of rows. A wallet that did five things and
            then stopped for a month is a different wallet from one that did five things last
            week, and a list sorted by date hides that unless you draw it. */}
        {quiet != null && (
          <div className="tl__quiet"><span /><b>Quiet for {quiet} days</b><span /></div>
        )}
        {events.map((e, i) => {
          const lane = LANE_META[e.lane];
          return (
            <div className="tl__row" key={`${e.label}-${i}`}>
              <span className="tl__dot" style={{ background: lane.color }} title={lane.label} />
              <span className="tl__body">
                <b>{e.label}</b>
                {e.detail && <span className="tl__detail">{e.detail}</span>}
              </span>
              <span className="tl__ago">{relativeLabel(e.minutesAgo)}</span>
            </div>
          );
        })}
      </div>
      <div className="tl__key">
        {(Object.keys(LANE_META) as (keyof typeof LANE_META)[]).map((k) => (
          <span key={k} className={cov[k] ? undefined : 'is-off'}>
            <i style={{ background: cov[k] ? LANE_META[k].color : 'var(--text-disabled)' }} />
            {LANE_META[k].label}
            {!cov[k] && ' · none'}
          </span>
        ))}
      </div>
    </>
  );
}

/* What the table stopped showing. Chains, apps and tokens had a column each and three
   overlapping circles of room; here they get their names. */
function Holdings({ contact }: { contact: Contact }) {
  const rows: [string, ReturnType<typeof chainMarks>][] = [
    ['Chains', chainMarks(contact.chains)],
    ['Apps', appMarks(contact.apps)],
    ['Tokens', tokenMarks(contact.tokens)],
  ];
  if (rows.every(([, m]) => m.length === 0)) return null;
  return (
    <>
      <Section label="Holdings" />
      <div className="hold">
        {rows.map(([label, marks]) => (
          <div className="hold__row" key={label}>
            <span className="hold__lbl">{label}</span>
            {marks.length === 0
              ? <span className="hold__none">None recorded</span>
              : <span className="hold__marks">{marks.map((m) => <Web3Mark key={m.id} mark={m} size={18} />)}</span>}
            <span className="hold__names">{marks.map((m) => m.label).join(' · ')}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* Why did this wallet get that message? (2.7)
 *
 * The drawer could say what a contact is — balance, chain, channels, tags — and nothing about
 * what is currently happening to it. Every automation enrolment was invisible from here, so
 * the answer to the most common support question meant opening each flow and searching it.
 * A flow a wallet is sitting inside is also the reason it may look unreachable: it is not
 * suppressed, it is waiting on a step. */
function Journeys({ contact }: { contact: Contact }) {
  const enrolments = enrolmentsFor(contact);
  if (enrolments.length === 0) {
    return (
      <>
        <Section label="Journeys" />
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 20px' }}>
          Not in any Loop. Nothing is queued for this wallet.
        </p>
      </>
    );
  }
  return (
    <>
      <Section label="Journeys" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {enrolments.map((e) => (
          <div key={e.automation} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid var(--border-subtle)', borderRadius: 6, background: 'var(--bg-surface)' }}>
            <Icon name="workflow" size={15} color={e.status === 'in-flow' ? 'var(--action-primary)' : 'var(--text-tertiary)'} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{e.automation}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{e.step} · entered {e.since}</span>
            </span>
            <Badge status={e.status === 'in-flow' ? 'info' : e.status === 'completed' ? 'success' : 'neutral'} live={e.status === 'in-flow'}>
              {e.status === 'in-flow' ? 'In flow' : e.status === 'completed' ? 'Completed' : 'Exited'}
            </Badge>
          </div>
        ))}
      </div>
    </>
  );
}

function ContactDrawer({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  return (
    <Drawer
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="fingerprint" size={18} color="var(--action-primary)" />{contact.ens ?? (contact.address ? 'Wallet' : 'Contact')}</span>}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="users" onClick={() => {
          const name = `${contact.ens ?? 'Wallet'} shortlist`;
          store.addList(name, 'Static');
          toast(`Added to a new static list, “${name}”`);
        }}>Add to a list</Button>
        <Button icon="send" onClick={() => toast(contact.reachable.includes('push') ? 'Test push sent to this wallet' : 'Test email sent to this contact')}>Send a test</Button>
      </>}
    >
      <div style={{ marginBottom: 18 }}>
        {contact.address
          ? <AddressChip address={contact.address} />
          : <Badge status="neutral" dot={false}>Email only · no wallet linked yet</Badge>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Mini label="Lifetime value" value={contact.address ? `${contact.ltvEth} ETH` : NO_VALUE} />
        <Mini label="Home chain" value={contact.address ? contact.chain : NO_VALUE} />
      </div>
      <HealthPanel contact={contact} />
      <LaneTimeline contact={contact} />
      <Holdings contact={contact} />
      <Journeys contact={contact} />
      <Section label="Linked channels" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        <ChannelRow icon="mail" label="Email" value={contact.reachable.includes('email') ? (contact.email ?? 'ZK-protected · identity hidden') : 'not linked'} ok={contact.reachable.includes('email')} />
        <ChannelRow icon="smartphone" label="In-app push" value={contact.reachable.includes('push') ? 'device signed in' : 'not linked'} ok={contact.reachable.includes('push')} />
        <ChannelRow icon="at-sign" label="X" value={contact.reachable.includes('x') ? 'handle linked' : 'not linked'} ok={contact.reachable.includes('x')} />
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '4px 0 20px' }}>Identity source: {contact.identitySource}. The wallet is the record; channels attach to it and resolve lazily.</p>
      <Section label="Tags" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{contact.tags.length ? contact.tags.map((t) => <Badge key={t} status="neutral" dot={false}>{t}</Badge>) : <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No tags</span>}</div>
    </Drawer>
  );
}
/* Wallet cell — handles wallet-less (email-only) contacts captured before any wallet links. */
function WalletCell({ c }: { c: Contact }) {
  if (!c.address) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="mail" size={14} /> No wallet
        </span>
        <Badge status="neutral" dot={false}>Email only</Badge>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* One identity, not two. An ENS and its address side by side spent a third of the
          column saying the same thing twice; the address is in the drawer. */}
      {c.ens
        ? <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.ens}</span>
        : <AddressChip address={c.address} />}
      {/* ZK Shield is software now, so it gets a mark rather than a word. A badge reading
          "ZK" on every other row was spending a column's worth of attention on a state that
          is reassuring, not actionable. */}
      {c.zkVerified && (
        <span className="aud__shield" title="Shielded. The email behind this contact is verified by a zero-knowledge proof and hidden from your team. You can still message it.">
          <Icon name="shield-check" size={14} />
        </span>
      )}
      <ChannelDots ids={c.reachable} />
    </span>
  );
}

/* Lifecycle stage, which was not on the table at all and is the single most scannable thing
   about a row: it is the column that tells you whether to care. */
function StageCell({ c }: { c: Contact }) {
  const m = stageMeta(stageFor(c));
  return <span className={`aud__stage aud__stage--${m.tone}`}><Icon name={m.icon} size={13} />{m.label}</span>;
}

/* Both lanes in one cell.
 *
 * A dot coloured by lane, the thing they did, and how long ago. Scanning the column shows you
 * at a glance whether your audience is doing things in your app, on the chain, or neither —
 * and a wallet we hold no product data for says so rather than looking identical to one we
 * know everything about. */
function LastDidCell({ c }: { c: Contact }) {
  const last = latestFor(c);
  if (!last) {
    return <span style={{ color: 'var(--text-tertiary)' }}>Nothing recorded</span>;
  }
  const lane = LANE_META[last.lane];
  return (
    <span className="aud__did">
      {/* Hollow when we hold no product events for this wallet: the row still says which lane
          the event came from, and also that one lane is missing, without spending a chip on
          it. The audience-wide number is on the strip above. */}
      <i style={coverageFor(c).product
        ? { background: lane.color }
        : { borderColor: lane.color, background: 'transparent' }}
        className={coverageFor(c).product ? undefined : 'is-hollow'}
        title={coverageFor(c).product ? lane.label : `${lane.label} · no product events for this wallet yet`} />
      <span className="aud__didtx">{last.label}{last.detail ? <em> · {last.detail}</em> : null}</span>
      <span className="aud__didago">{relativeLabel(last.minutesAgo)}</span>
    </span>
  );
}

/* Renders an email cell honouring the ZK-identity rule: reachable-but-ZK-protected contacts
   never expose their address to the operator; only imported addresses are shown. */
function EmailCell({ c }: { c: Contact }) {
  if (!c.reachable.includes('email')) return <span style={{ color: 'var(--text-tertiary)' }}>No email</span>;
  if (c.email) return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>{c.email}</span>;
  return (
    <span title="Email is verified by a zero-knowledge proof. The address is hidden from operators. You can still message this wallet."
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 13 }}>
      <Icon name="shield-check" size={14} color="var(--action-primary)" /> ZK-protected
    </span>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '12px 14px' }}><div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{label}</div><div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{value}</div></div>;
}
function Section({ label }: { label: string }) {
  return <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>{label}</div>;
}
function ChannelRow({ icon, label, value, ok }: { icon: 'mail' | 'smartphone' | 'at-sign'; label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: 4 }}>
      <span style={{ width: 30, height: 30, borderRadius: 4, background: 'var(--surface-subtle)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={15} /></span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', fontFamily: value.includes('@') ? 'var(--font-mono)' : undefined }}>{value}</span>
      {ok ? <Icon name="check-circle-2" size={16} color="var(--green-500)" /> : null}
    </div>
  );
}

function NewListModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'Growing' | 'Static'>('Growing');
  const create = () => { if (name.trim()) { store.addList(name.trim(), type); onClose(); } };
  return (
    <Modal title="New list" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={create} disabled={!name.trim()}>Create list</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="Name" placeholder="e.g. Newsletter subscribers" value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as 'Growing' | 'Static')}
          options={[{ value: 'Growing', label: 'Growing' }, { value: 'Static', label: 'Static' }]}
          helper="Growing lists keep gaining members from forms and rules. Static lists are a fixed set." />
      </div>
    </Modal>
  );
}
function NewTagModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [rule, setRule] = useState<'Manual' | 'Auto'>('Manual');
  const create = () => { if (name.trim()) { store.addTag(name.trim(), rule); onClose(); } };
  return (
    <Modal title="New tag" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={create} disabled={!name.trim()}>Create tag</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="Name" placeholder="e.g. whale" value={name} onChange={(e) => setName(e.target.value)} />
        <Select label="Rule" value={rule} onChange={(e) => setRule(e.target.value as 'Manual' | 'Auto')}
          options={[{ value: 'Manual', label: 'Manual (you assign it)' }, { value: 'Auto', label: 'Auto (rule-based)' }]} />
      </div>
    </Modal>
  );
}

/* Health and stage on the contact (2.7).
 *
 * The drivers are the feature, not the number. A score on its own is a verdict nobody can
 * act on; the breakdown names which campaign to run, and lets an operator disagree with the
 * model out loud rather than quietly ignoring it. */
function HealthPanel({ contact }: { contact: Contact }) {
  const h = healthFor(contact);
  const stage = stageMeta(stageFor(contact));
  const tone = h.band === 'strong' ? 'var(--green-600)' : h.band === 'watch' ? 'var(--orange-600)' : 'var(--red-600)';
  return (
    <>
      <Section label="Health" />
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.6px', color: tone, fontVariantNumeric: 'tabular-nums' }}>{h.score}</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: tone }}>{BAND_LABEL[h.band]}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Icon name={stage.icon} size={14} />{stage.label}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {h.drivers.map((d) => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
              <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{d.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: d.points >= 0 ? 'var(--text-secondary)' : 'var(--red-600)' }}>
                {d.points >= 0 ? '+' : ''}{d.points}
              </span>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Recency weighs heaviest. It is the only one of these that predicts rather than describes.
        </p>
      </div>
    </>
  );
}

/* Import — a real CSV upload as well as paste.
 *
 * The button has always said "Import CSV"; until now the dialog only took pasted text, so
 * the one thing its name promised was the one thing it could not do. Parsing lives in
 * data/csv.ts. What matters here is showing the operator what the file actually yielded
 * before they commit — including the rows that will not import. */
function ImportCsvModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const lists = useLists();
  /* Import used to drop contacts into the audience at large, which meant the operator had
   * no handle on the batch afterwards — no way to message exactly these people, or to undo
   * one bad file. A destination is now required: an existing list, or a new one named here. */
  const [dest, setDest] = useState('');
  const [newList, setNewList] = useState('');
  const creating = dest === '__new';
  const destReady = creating ? newList.trim() !== '' : dest !== '';

  const parsed = useMemo(() => parseContacts(text), [text]);
  const total = parsed.rows.length;

  const destName = creating ? newList.trim() : lists.find((l) => l.id === dest)?.name ?? '';
  const commit = () => {
    // Both branches have to leave the same trace, or picking an existing list is a toast
    // with nothing behind it while creating one is a real change.
    const source = `CSV import · ${fileName ?? 'pasted rows'}`;
    const listId = creating ? store.addList(newList.trim(), 'Static', source) : dest;
    store.importInto(listId, total, source);
    onClose();
    toast(`${total.toLocaleString('en-US')} contact${total === 1 ? '' : 's'} queued for import into “${destName}”`);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result ?? '')); setFileName(file.name); };
    reader.onerror = () => toast('Could not read that file. Save it as .csv or .tsv and try again, or paste the rows in instead.', 'triangle-alert');
    reader.readAsText(file);
  };

  return (
    <Modal title="Import contacts" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!total || !destReady} onClick={commit}
          title={!total ? 'Add contacts first' : !destReady ? 'Choose a list to import into' : undefined}>
          Import {total ? total.toLocaleString('en-US') : ''}
        </Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          className={`drop${dragging ? ' drop--on' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
        >
          <Icon name="upload" size={20} color="var(--text-tertiary)" />
          <b>{fileName ?? 'Drop a CSV here'}</b>
          <span>{fileName ? 'Loaded. Drop another to replace it' : 'or paste rows below'}</span>
          <Button variant="secondary" size="s" onClick={() => fileRef.current?.click()}>Choose file</Button>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden aria-label="CSV file"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
        </div>

        <textarea aria-label="Contacts to import" value={text} onChange={(e) => { setText(e.target.value); setFileName(null); }} rows={5}
          placeholder={'email,wallet\nholder@acme.com,0x1A2b…9F3e\n\n…or one identifier per line'}
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'vertical' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <Select label="Import into" value={dest} onChange={(e) => setDest(e.target.value)}
            options={[
              { value: '', label: 'Choose a list…' },
              ...lists.map((l) => ({ value: l.id, label: l.name })),
              { value: '__new', label: '+ Create a new list…' },
            ]}
            helper={creating ? undefined : 'Every import lands in a list, so you can message or remove exactly this batch later.'} />
          {creating && (
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            <Input autoFocus label="New list name" value={newList} onChange={(e) => setNewList(e.target.value)}
              placeholder="e.g. Season 3 waitlist"
              helper="Created as a static list. It holds exactly who this file contains." />
          )}
        </div>

        {text.trim() !== '' && (
          <div className="imp">
            <div className="imp__row"><b>{total.toLocaleString('en-US')}</b><span>ready to import</span></div>
            {(parsed.emails > 0 || parsed.wallets > 0 || parsed.both > 0) && (
              <p className="imp__break">
                {[parsed.both && `${parsed.both} with both`, parsed.emails && `${parsed.emails} email only`, parsed.wallets && `${parsed.wallets} wallet only`]
                  .filter(Boolean).join(' · ')}
                {parsed.mapped.email || parsed.mapped.wallet
                  ? `, mapped from ${[parsed.mapped.email, parsed.mapped.wallet].filter(Boolean).join(' and ')}`
                  : ''}
              </p>
            )}
            {parsed.duplicates > 0 && (
              <p className="imp__break">{parsed.duplicates} duplicate{parsed.duplicates === 1 ? '' : 's'} merged. Nobody is messaged twice.</p>
            )}
            {parsed.skipped.length > 0 && (
              <>
                <button type="button" className="imp__skip" onClick={() => setShowSkipped((v) => !v)} aria-expanded={showSkipped}>
                  <Icon name="triangle-alert" size={13} />
                  {parsed.skipped.length} row{parsed.skipped.length === 1 ? '' : 's'} will not import
                  <Icon name={showSkipped ? 'chevron-down' : 'chevron-right'} size={13} />
                </button>
                {showSkipped && (
                  <ul className="imp__list">
                    {parsed.skipped.slice(0, 8).map((s) => (
                      <li key={`${s.line}-${s.raw}`}><b>Line {s.line}</b> <code>{s.raw || '(empty)'}</code>: {s.reason}</li>
                    ))}
                    {parsed.skipped.length > 8 && <li>…and {parsed.skipped.length - 8} more</li>}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

