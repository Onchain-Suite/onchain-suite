import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Card } from '../../components/data/Card.jsx';
import { Table } from '../../components/data/Table.jsx';
import { Identicon } from '../../components/data/Identicon.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';
import { Tag } from '../../components/feedback/Tag.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { IconButton } from '../../components/actions/IconButton.jsx';
import { AddressChip } from '../../components/product/AddressChip.jsx';
import { Drawer } from '../../components/overlays/Drawer.jsx';
import { Tooltip } from '../../components/feedback/Tooltip.jsx';
import { Modal } from '../../components/overlays/Modal.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { WalletIdentityCard } from '../../components/product/WalletIdentityCard.jsx';
import { Timeline } from '../../components/data/Timeline.jsx';
import { Pagination } from '../../components/navigation/Pagination.jsx';

const css = `
.osd-aud{max-width:1560px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-6);font-family:var(--font-sans);}
.osd-aud__head{display:flex;align-items:center;gap:16px;}
.osd-aud__head h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-aud__strip{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:grid;grid-template-columns:repeat(4,1fr);}
.osd-aud__stat{padding:18px 24px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--border-subtle);}
.osd-aud__stat:last-child{border-right:none;}
.osd-aud__stat b{font-size:24px;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1.2;display:flex;align-items:baseline;gap:8px;}
.osd-aud__stat b em{font-style:normal;font-size:12px;font-weight:500;color:var(--positive-600,#15803d);}
.osd-aud__stat span{font-size:var(--text-caption-size);color:var(--text-secondary);display:flex;align-items:center;gap:6px;}
.osd-aud__tabs{display:flex;gap:2px;border-bottom:1px solid var(--border-default);}
.osd-aud__tab{border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);padding:10px 16px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;display:inline-flex;align-items:center;gap:8px;}
.osd-aud__tab:hover{color:var(--text-primary);}
.osd-aud__tab.on{color:var(--text-primary);border-bottom-color:var(--action-primary);}
.osd-aud__tab i{font-style:normal;font-size:11px;font-weight:600;background:var(--surface-subtle);color:var(--text-tertiary);border-radius:99px;padding:1px 8px;}
.osd-aud__filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.osd-aud__search{display:flex;align-items:center;gap:10px;width:280px;height:34px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 12px;box-sizing:border-box;}
.osd-aud__search:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-aud__search input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);min-width:0;}
.osd-aud__search input::placeholder{color:var(--text-tertiary);}
.osd-aud__meta{margin-left:auto;font-size:var(--text-caption-size);color:var(--text-tertiary);font-variant-numeric:tabular-nums;}
.osd-aud__bulk{display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--bg-selected);border-radius:var(--radius-md);margin-bottom:8px;}
.osd-aud__foot{display:flex;justify-content:space-between;align-items:center;padding-top:10px;}
.osd-reach{display:inline-flex;gap:6px;}
.osd-reach__pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:99px;font-size:11px;font-weight:600;background:var(--bg-selected);color:var(--action-primary);}
.osd-reach__pill--off{background:var(--surface-subtle);color:var(--text-tertiary);text-decoration:line-through;text-decoration-thickness:1px;}
.osd-zk{display:inline-flex;align-items:center;gap:4px;height:20px;padding:0 7px;border-radius:99px;font-size:10px;font-weight:600;letter-spacing:0.2px;background:var(--bg-selected);color:var(--action-primary);}
.osd-zk--un{background:var(--surface-subtle);color:var(--text-tertiary);}
.osd-aud__empty{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:88px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.osd-aud__empty__icn{width:48px;height:48px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-aud__empty h2{margin:4px 0 0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-aud__empty p{margin:0 0 16px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:480px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-aud-css')) {
  const s = document.createElement('style'); s.id = 'osd-aud-css'; s.textContent = css; document.head.appendChild(s);
}

const WALLETS = [
  { id: '1', address: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', ens: 'vitalik.eth', email: true, push: true, zk: true, link: 'Email · Farcaster', tags: ['whale', 'season-1'], ltv: '42.8 ETH', last: '2h ago' },
  { id: '2', address: '0x8Cc47712bF3A0d2eE291B7A5C41f9E88Dd0121aB', ens: '', email: false, push: true, zk: true, link: 'App sign-in', tags: ['new'], ltv: '18.2 ETH', last: '6d ago' },
  { id: '3', address: '0xF31d99C02aE84b7cD1204E5F6a7B8C9D0E1F77c0', ens: 'nftmaxi.eth', email: true, push: true, zk: true, link: 'Email', tags: ['season-1', 'collector'], ltv: '9.7 ETH', last: '1d ago' },
  { id: '4', address: '0x44Ab0912CdEf34567890aBcDeF1234567890BeeF', ens: '', email: true, push: false, zk: false, link: 'Imported · not linked', tags: [], ltv: '4.1 ETH', last: '12d ago' },
  { id: '5', address: '0x9E0fD34567812345aBcD6789Ef0123456789Cafe', ens: 'degen.eth', email: false, push: true, zk: true, link: 'X (Twitter)', tags: ['dormant'], ltv: '0.8 ETH', last: '48d ago' },
];
const TAGS = [
  { id: 'whale', name: 'whale', count: 86, updated: '2h ago', source: 'Auto · balance > 10 ETH' },
  { id: 'season-1', name: 'season-1', count: 1893, updated: '1d ago', source: 'Manual' },
  { id: 'collector', name: 'collector', count: 412, updated: '3d ago', source: 'Auto · holds 5+ packs' },
  { id: 'new', name: 'new', count: 512, updated: '4h ago', source: 'Auto · first seen < 7d' },
  { id: 'dormant', name: 'dormant', count: 1120, updated: '1d ago', source: 'Auto · inactive 30d' },
];
const LISTS = [
  { id: 'news', name: 'Newsletter subscribers', source: 'Form · Newsletter signup', type: 'Growing', count: 640, reach: 'Email', updated: '2h ago' },
  { id: 's2wait', name: 'Season 2 waitlist', source: 'Form · Season 2 waitlist', type: 'Growing', count: 1204, reach: 'Email · Push', updated: '1d ago' },
  { id: 'airdrop', name: 'Airdrop applicants', source: 'Form · Airdrop eligibility', type: 'Growing', count: 512, reach: 'Email · Push', updated: '3h ago' },
  { id: 'vip', name: 'VIP holders', source: 'Manual · CSV import', type: 'Static', count: 86, reach: 'Push', updated: '5d ago' },
];
const SUPPRESSED = [
  { id: 's1', address: '0x71Fa4409cAB33D2eF00b7A5C41f9E88Dd0198cC1', ens: '', reason: 'Unsubscribed', channel: 'Email', when: 'Jul 20, 2026' },
  { id: 's2', address: '0x2B0d99C02aE84b7cD1204E5F6a7B8C9D0E1F4421', ens: 'paperhands.eth', reason: 'Bounced', channel: 'Email', when: 'Jul 18, 2026' },
  { id: 's3', address: '0xC4Ab0912CdEf34567890aBcDeF1234567890D00d', ens: '', reason: 'Muted push', channel: 'In-app push', when: 'Jul 12, 2026' },
];

function Reach({ email, push }) {
  return (
    <span className="osd-reach">
      <span className={`osd-reach__pill${email ? '' : ' osd-reach__pill--off'}`}><Icon name="mail" size={12} />Email</span>
      <span className={`osd-reach__pill${push ? '' : ' osd-reach__pill--off'}`}><Icon name="smartphone" size={12} />Push</span>
    </span>
  );
}

/** Audience v2 — wallet-first contacts with prominent channel reachability, Tags and
    Suppressed tabs in-section. Segments stay under Intelligence. */
export function AudienceScreen({ filled = true, onCreateCampaign }) {
  const [tab, setTab] = React.useState('contacts');
  const [selected, setSelected] = React.useState([]);
  const [drawer, setDrawer] = React.useState(null);
  const [lists, setLists] = React.useState(LISTS);
  const [tags, setTags] = React.useState(TAGS);
  const [suppressed, setSuppressed] = React.useState(SUPPRESSED);
  const [createOpen, setCreateOpen] = React.useState(null);
  const [draftName, setDraftName] = React.useState('');
  const [draftMeta, setDraftMeta] = React.useState('Growing');
  const [draftRule, setDraftRule] = React.useState('Manual');
  const openCreate = (kind) => { setDraftName(''); setDraftMeta('Growing'); setDraftRule('Manual'); setCreateOpen(kind); };
  const confirmCreate = () => {
    if (createOpen === 'list') setLists((v) => [{ id: 'l' + Date.now(), name: draftName.trim() || 'Untitled list', source: 'Manual · empty', type: draftMeta, reach: '—', count: 0, updated: 'just now' }, ...v]);
    else setTags((v) => [{ id: 't' + Date.now(), name: draftName.trim() || 'untitled', source: draftRule, count: 0, updated: 'just now' }, ...v]);
    setCreateOpen(null);
  };
  const [syncOpen, setSyncOpen] = React.useState(false);
  const [syncSrc, setSyncSrc] = React.useState('contract');
  const [syncState, setSyncState] = React.useState('form');
  const startSync = () => { setSyncState('running'); setTimeout(() => setSyncState('done'), 2200); };
  const closeSync = () => { setSyncOpen(false); setSyncState('form'); };
  const wallet = WALLETS.find((w) => w.id === drawer);
  return (
    <div className="osd-aud" data-screen-label={`Audience · ${tab}`}>
      <div className="osd-aud__head">
        <h1>Audience</h1>
        <span style={{ flex: 1 }}></span>
        <Button variant="secondary" icon="upload">Import CSV</Button>
        <Button icon="network" onClick={() => setSyncOpen(true)}>Sync wallets</Button>
      </div>
      {filled ? (
        <React.Fragment>
          <div className="osd-aud__strip">
            <div className="osd-aud__stat"><span>Total wallets</span><b>128,540 <em>+1,204 this week</em></b></div>
            <div className="osd-aud__stat"><span><Icon name="mail" size={13} />Email-reachable</span><b>4,182</b></div>
            <div className="osd-aud__stat"><span><Icon name="smartphone" size={13} />Push-reachable</span><b>5,210</b></div>
            <div className="osd-aud__stat"><span><Icon name="ban" size={13} />Suppressed</span><b>318</b></div>
          </div>
          <div className="osd-aud__tabs">
            <button type="button" className={`osd-aud__tab${tab === 'contacts' ? ' on' : ''}`} onClick={() => setTab('contacts')}>Contacts<i>128,540</i></button>
            <button type="button" className={`osd-aud__tab${tab === 'lists' ? ' on' : ''}`} onClick={() => setTab('lists')}>Lists<i>{lists.length}</i></button>
            <button type="button" className={`osd-aud__tab${tab === 'tags' ? ' on' : ''}`} onClick={() => setTab('tags')}>Tags<i>{tags.length}</i></button>
            <button type="button" className={`osd-aud__tab${tab === 'suppressed' ? ' on' : ''}`} onClick={() => setTab('suppressed')}>Suppressed<i>{suppressed.length}</i></button>
          </div>
          {tab === 'contacts' ? (
            <React.Fragment>
              <div className="osd-aud__filters">
                <div className="osd-aud__search"><Icon name="search" size={16} color="var(--text-tertiary)" /><input placeholder="Search address, ENS, or email…" aria-label="Search contacts" /></div>
                <Chip icon="mail">Email-reachable</Chip>
                <Chip icon="smartphone">Push-reachable</Chip>
                <Chip icon="tag">Tag</Chip>
                <span className="osd-aud__meta">Updated 2 min ago</span>
              </div>
              <Card compact style={{ overflow: 'hidden' }}>
                {selected.length > 0 ? (
                  <div className="osd-aud__bulk">
                    <span style={{ fontSize: 'var(--text-body-s-size)', fontWeight: 500 }}>{selected.length} selected</span>
                    <Button variant="secondary" size="s" icon="tag">Add tag</Button>
                    <Button variant="secondary" size="s" icon="megaphone" onClick={() => onCreateCampaign && onCreateCampaign({ name: `${selected.length} selected wallets` })}>New campaign</Button>
                    <Button variant="tertiary" size="s" icon="ban">Suppress</Button>
                    <IconButton icon="x" label="Clear selection" size="s" onClick={() => setSelected([])} />
                  </div>
                ) : null}
                <Table
                  selectable selected={selected} onSelect={setSelected}
                  columns={[
                    { key: 'wallet', label: 'Wallet', render: (r) => (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setDrawer(r.id)}>
                        <Identicon address={r.address} size={24} />
                        <AddressChip address={r.address} label={r.ens || undefined} />
                        <Tooltip content={r.zk ? `Identity ZK-verified · ${r.link}. The link is proven without exposing who they are.` : 'No verified identity link yet — imported wallet.'}>
                          <span className={`osd-zk${r.zk ? '' : ' osd-zk--un'}`}><Icon name={r.zk ? 'shield-check' : 'shield'} size={11} />ZK</span>
                        </Tooltip>
                      </span>
                    ) },
                    { key: 'reach', label: 'Reachable via', render: (r) => <Reach email={r.email} push={r.push} /> },
                    { key: 'tags', label: 'Tags', render: (r) => r.tags.length ? <span style={{ display: 'inline-flex', gap: 6 }}>{r.tags.map((t) => <Tag key={t}>{t}</Tag>)}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span> },
                    { key: 'ltv', label: 'Lifetime value', numeric: true, sortable: true },
                    { key: 'last', label: 'Last active', numeric: true },
                    { key: 'actions', label: '', render: () => <IconButton icon="ellipsis" label="Row actions" size="s" /> },
                  ]}
                  rows={WALLETS}
                />
                <div className="osd-aud__foot">
                  <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>Showing 1–5 of 128,540</span>
                  <Pagination page={1} pageCount={5142} />
                </div>
              </Card>
            </React.Fragment>
          ) : tab === 'lists' ? (
            <React.Fragment>
              <div className="osd-aud__filters">
                <div className="osd-aud__search"><Icon name="search" size={16} color="var(--text-tertiary)" /><input placeholder="Search lists…" aria-label="Search lists" /></div>
                <span style={{ flex: 1 }}></span>
                <Button size="s" icon="plus" onClick={() => openCreate('list')}>New list</Button>
              </div>
              <Card compact style={{ overflow: 'hidden' }}>
                <Table
                  onRowClick={() => {}}
                  columns={[
                    { key: 'name', label: 'List', render: (r) => (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--bg-selected)', color: 'var(--action-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="list" size={15} /></span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
                      </span>
                    ) },
                    { key: 'source', label: 'Source', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.source}</span> },
                    { key: 'type', label: 'Type', render: (r) => <Badge status={r.type === 'Static' ? 'neutral' : 'info'}>{r.type}</Badge> },
                    { key: 'reach', label: 'Reachable via', render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.reach}</span> },
                    { key: 'count', label: 'Contacts', numeric: true, render: (r) => r.count.toLocaleString('en-US') },
                    { key: 'updated', label: 'Updated', numeric: true },
                    { key: 'actions', label: '', render: () => <IconButton icon="ellipsis" label="List actions" size="s" /> },
                  ]}
                  rows={lists}
                />
              </Card>
            </React.Fragment>
          ) : tab === 'tags' ? (
            <React.Fragment>
              <div className="osd-aud__filters">
                <div className="osd-aud__search"><Icon name="search" size={16} color="var(--text-tertiary)" /><input placeholder="Search tags…" aria-label="Search tags" /></div>
                <span style={{ flex: 1 }}></span>
                <Button size="s" icon="plus" onClick={() => openCreate('tag')}>New tag</Button>
              </div>
              <Card compact style={{ overflow: 'hidden' }}>
                <Table
                  columns={[
                    { key: 'name', label: 'Tag', render: (r) => <Tag>{r.name}</Tag> },
                    { key: 'source', label: 'Rule' },
                    { key: 'count', label: 'Wallets', numeric: true, render: (r) => r.count.toLocaleString('en-US') },
                    { key: 'updated', label: 'Updated', numeric: true },
                    { key: 'actions', label: '', render: () => <IconButton icon="ellipsis" label="Tag actions" size="s" /> },
                  ]}
                  rows={tags}
                />
              </Card>
            </React.Fragment>
          ) : (
            <Card compact style={{ overflow: 'hidden' }}>
              <Table
                columns={[
                  { key: 'wallet', label: 'Wallet', render: (r) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Identicon address={r.address} size={24} />
                      <AddressChip address={r.address} label={r.ens || undefined} />
                    </span>
                  ) },
                  { key: 'reason', label: 'Reason', render: (r) => <Badge status={r.reason === 'Bounced' ? 'warning' : 'neutral'}>{r.reason}</Badge> },
                  { key: 'channel', label: 'Channel' },
                  { key: 'when', label: 'Since', numeric: true },
                  { key: 'actions', label: '', render: (r) => <Button variant="tertiary" size="s" onClick={() => setSuppressed((v) => v.filter((x) => x.id !== r.id))}>Reinstate</Button> },
                ]}
                rows={suppressed}
              />
            </Card>
          )}
        </React.Fragment>
      ) : (
        <div className="osd-aud__empty">
          <span className="osd-aud__empty__icn"><Icon name="users" size={24} strokeWidth={1.5} /></span>
          <h2>No wallets synced yet</h2>
          <p>Connect a contract or import a CSV. Wallets resolve into contacts automatically, and reachability updates as emails are linked and devices sign in.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button icon="network" onClick={() => setSyncOpen(true)}>Sync wallets</Button>
            <Button variant="secondary" icon="upload">Import CSV</Button>
          </div>
        </div>
      )}
      {wallet ? (
        <Drawer title={`Wallet ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`} onClose={() => setDrawer(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <WalletIdentityCard
              address={wallet.address} ens={wallet.ens || undefined} health="healthy"
              resolved="3 wallets · 2 channels"
              stats={[{ value: wallet.ltv, label: 'Lifetime value' }, { value: wallet.last, label: 'Last active' }, { value: String(wallet.tags.length), label: 'Tags' }]}
              channels={[{ type: 'email', reachable: wallet.email }, { type: 'push', reachable: wallet.push }]}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <span className={`osd-zk${wallet.zk ? '' : ' osd-zk--un'}`} style={{ height: 24 }}><Icon name={wallet.zk ? 'shield-check' : 'shield'} size={12} />ZK</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>{wallet.zk ? 'Identity ZK-verified' : 'No verified identity link'}</span>
                <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>{wallet.zk ? `Linked via ${wallet.link} · proven without exposing identity` : 'Imported wallet — no consented off-chain link'}</span>
              </div>
            </div>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: 'var(--text-heading-s-size)', fontWeight: 600, color: 'var(--text-primary)' }}>Tags</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {wallet.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                <Chip icon="plus">Add tag</Chip>
              </div>
            </div>
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: 'var(--text-heading-s-size)', fontWeight: 600, color: 'var(--text-primary)' }}>Activity</h3>
              <Timeline entries={[
                { title: 'Campaign "Vault77 is LIVE" opened', meta: 'Yesterday 09:12 UTC · email', status: 'info', icon: 'mail-open' },
                { title: 'Bought 3 Season 2 packs', meta: 'Yesterday 10:02 UTC · Base', status: 'success', icon: 'activity' },
                { title: 'Push "Whale unstake follow-up" viewed', meta: '3d ago · in-app push', status: 'info', icon: 'bell' },
                { title: 'Linked email address', meta: '5d ago', status: 'success', icon: 'link' },
              ]} />
            </div>
          </div>
        </Drawer>
      ) : null}
      {syncOpen ? (
        <Modal title="Sync wallets" size="m" onClose={closeSync}
          primaryLabel={syncState === 'form' ? 'Start sync' : syncState === 'done' ? 'Done' : null}
          onPrimary={syncState === 'form' ? startSync : closeSync}
          secondaryLabel={syncState === 'form' ? 'Cancel' : null}>
          {syncState === 'form' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)' }}>Bring new wallets into your audience from a source and keep them updated automatically. New addresses become contacts; their on-chain metrics fill in via <b>Enrich</b> in Intelligence.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['contract', 'box', 'Contract activity', 'Everyone who holds or has interacted with a contract'],
                  ['app', 'smartphone', 'App sign-ins', 'Wallets that connect to your app via the OnchainSuite SDK'],
                  ['list', 'list', 'Allowlist', 'Paste or upload a fixed list of addresses'],
                ].map(([id, icn, label, sub]) => (
                  <button key={id} type="button" onClick={() => setSyncSrc(id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', background: syncSrc === id ? 'var(--bg-selected)' : 'var(--bg-surface)', border: `1px solid ${syncSrc === id ? 'var(--action-primary)' : 'var(--border-default)'}` }}>
                    <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--surface-subtle)', color: syncSrc === id ? 'var(--action-primary)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icn} size={16} /></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <b style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</b>
                      <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)' }}>{sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              {syncSrc === 'contract' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Contract address</label>
                    <input placeholder="0x…" style={{ height: 38, boxSizing: 'border-box', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', outline: 'none' }} />
                  </div>
                  <Select label="Chain" options={['Base', 'Ethereum', 'Arbitrum', 'Optimism']} />
                </div>
              ) : syncSrc === 'app' ? (
                <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>Your SDK key is already installed — wallets sync from the moment users connect. Nothing else to configure.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Addresses</label>
                  <textarea placeholder="One address per line" style={{ minHeight: 96, boxSizing: 'border-box', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}></textarea>
                </div>
              )}
            </div>
          ) : syncState === 'running' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0 20px', textAlign: 'center' }}>
              <span style={{ width: 44, height: 44, borderRadius: 99, border: '3px solid var(--surface-subtle)', borderTopColor: 'var(--action-primary)', animation: 'osd-spin 0.9s linear infinite' }}></span>
              <style>{'@keyframes osd-spin{to{transform:rotate(360deg)}}'}</style>
              <b style={{ fontSize: 'var(--text-body-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>Scanning source…</b>
              <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)' }}>Large contracts can take a few minutes. We'll keep syncing in the background — you can close this.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 0 16px', textAlign: 'center' }}>
              <span style={{ width: 44, height: 44, borderRadius: 99, background: 'var(--bg-selected)', color: 'var(--action-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={20} strokeWidth={2.5} /></span>
              <b style={{ fontSize: 'var(--text-body-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>2,847 wallets found</b>
              <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)' }}>1,312 are new contacts · 1,535 already existed and were updated. This source now stays in sync automatically.</p>
            </div>
          )}
        </Modal>
      ) : null}
      {createOpen ? (
        <Modal title={createOpen === 'list' ? 'New list' : 'New tag'} size="s" onClose={() => setCreateOpen(null)} primaryLabel="Create" onPrimary={confirmCreate} secondaryLabel="Cancel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Name</label>
              <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder={createOpen === 'list' ? 'e.g. Newsletter subscribers' : 'e.g. whale'} style={{ height: 38, boxSizing: 'border-box', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', padding: '0 12px', fontFamily: 'inherit', fontSize: 'var(--text-body-s-size)', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            {createOpen === 'list' ? (
              <Select label="Type" options={['Growing', 'Static']} defaultValue={draftMeta} onChange={setDraftMeta} helper="Growing lists keep gaining members from forms and rules. Static lists are a fixed set." />
            ) : (
              <Select label="Rule" options={['Manual', 'Auto · balance > 10 ETH', 'Auto · holds 5+ packs', 'Auto · first seen < 7d', 'Auto · inactive 30d']} defaultValue={draftRule} onChange={setDraftRule} helper="Manual tags are applied by hand or by automations. Auto tags apply to any wallet matching the rule." />
            )}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
