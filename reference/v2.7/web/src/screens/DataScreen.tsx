import { useState } from 'react';
import { PageHeader } from '../shell/Shell';
import { Button } from '../components/ui';
import { Icon } from '../components/icons';
import { ApiPanel } from '../components/ApiPanel';
import SourceDirectory from '../components/SourceDirectory';
import { MigrateList } from '../components/MigrateList';
import AddContract from '../components/AddContract';
import { PRODUCT_EVENTS, unmappedEvents } from '../data/productEvents';
import { ChannelsTab } from '../components/ChannelsTab';
import { store, useContracts } from '../data/store';
import { beginIndexing, useIndexing, usePendingProject, useWorkspaceMode } from '../data/workspace';
import './data.css';


/* Channels join Data (2.7).
 *
 * The earlier split was "Data is what comes in, Settings is what goes out", which put the
 * sending channels in Settings. The rule that survives contact with the product is simpler:
 * Data is every connection to something outside — sources in, channels out — and Settings is
 * the workspace itself, which is billing, people and preferences. Connecting Privy and
 * verifying a sending domain are the same task on the same day, and they were two pages apart.
 */
const TABS = [
  { id: 'sources', label: 'Sources', icon: 'network' },
  { id: 'events', label: 'Events', icon: 'zap' },
  { id: 'migrate', label: 'Migrate', icon: 'upload' },
  { id: 'channels', label: 'Channels', icon: 'radio-tower' },
  { id: 'webhooks', label: 'Webhooks', icon: 'webhook' },
  { id: 'api', label: 'API', icon: 'code-xml' },
] as const;
type Tab = typeof TABS[number]['id'];


export default function DataScreen() {
  const [tab, setTab] = useState<Tab>('sources');
  const [adding, setAdding] = useState(false);
  const contracts = useContracts();
  const mode = useWorkspaceMode();
  const project = usePendingProject();
  const indexing = useIndexing();

  return (
    <div className="page page--wide">
      <PageHeader title="Integrations" sub="Every connection in and out: where wallets come from, and how messages reach them." />

      {/* An empty workspace has one job on this screen, so it says so above the tabs rather
          than leaving it to be found under Events. */}
      {mode === 'empty' && (
        <div className={`dstart${indexing ? ' is-busy' : ''}`}>
          <span className="dstart__ic"><Icon name={indexing ? 'loader-circle' : 'network'} size={18} /></span>
          <div className="dstart__tx">
            <b>{indexing ? `Indexing ${indexing}…` : 'Start here: index your contract'}</b>
            <span>{indexing
              ? 'Reading holders, transfers and stakes. Every section fills in when this finishes.'
              : project
                ? <>You named <code>{project}</code> during setup. Everything else in the app fills in from it.</>
                : 'Paste an address, a name or a website. Everything else in the app fills in from it.'}</span>
          </div>
          {!indexing && <Button icon="plus" onClick={() => setAdding(true)}>Index {project ? 'it' : 'a contract'}</Button>}
        </div>
      )}

      <nav className="dtabs" aria-label="Integrations section">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`dtabs__t${tab === t.id ? ' on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={15} />{t.label}
          </button>
        ))}
      </nav>

      {tab === 'sources' && <SourceDirectory />}

      {tab === 'migrate' && (
        <div className="dsec">
          <section>
            <div className="dsec__head">
              <span className="dsec__ic"><Icon name="upload" size={16} /></span>
              <div>
                <h2>Move in from another tool</h2>
                <p>
                  Bring contacts, lists and consent across. Nothing is sent to anyone as part of a
                  migration, and anyone unsubscribed where they came from stays unsubscribed here.
                </p>
              </div>
            </div>
            <MigrateList />
          </section>
        </div>
      )}

      {tab === 'events' && (
        <div className="dsec">
          <section>
            <div className="dsec__head">
              <span className="dsec__ic"><Icon name="zap" size={16} /></span>
              <div>
                <h2>Indexed contracts</h2>
                <p>
                  Every behavioural trigger comes from here. A contract we do not index is a wallet we cannot
                  segment, score or message about, so this is the first thing to get right, not the last.
                </p>
              </div>
              <Button icon="plus" onClick={() => setAdding(true)}>Add contract</Button>
            </div>
            <div className="dtable">
              <div className="dtable__head">
                <span>Contract</span><span>Chain</span><span>Type</span><span>Tracked activity</span><span className="num">Holders</span>
              </div>
              {contracts.map((c) => (
                <div className="dtable__row" key={c.address}>
                  <span className="dtable__name"><b>{c.name}</b><span className="os-mono">{c.address.slice(0, 10)}…{c.address.slice(-6)}</span></span>
                  <span>{c.chain}</span>
                  <span>{c.kind}</span>
                  <span className="dchips">{c.activities.map((a) => <i key={a}>{a}</i>)}</span>
                  <span className="num os-mono">{c.holders.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {tab === 'events' && (
        <div className="dsec" style={{ marginTop: 16 }}>
          <section>
            <div className="dsec__head">
              <span className="dsec__ic"><Icon name="code" size={16} /></span>
              <div>
                <h2>Product events</h2>
                <p>
                  What customers do inside your own application, sent by your app through the SDK.
                  The other half of every segment that crosses both lanes: &ldquo;completed setup and
                  has not staked in 30 days&rdquo; needs one of each.
                </p>
              </div>
            </div>
            <div className="dtable dtable--events">
              <div className="dtable__head">
                <span>Event</span><span>Means</span><span>Properties</span><span className="num">30d</span><span className="num">Wallets</span><span>Last seen</span>
              </div>
              {PRODUCT_EVENTS.map((e) => (
                <div className="dtable__row" key={e.name}>
                  <span className="dtable__name"><b>{e.label || e.name}</b><span className="os-mono">{e.name}</span></span>
                  {/* An unnamed event is still usable in a rule — it just reads as a raw name on a
                      screen where everything else reads as English, which is how a segment ends up
                      built on the wrong one. */}
                  <span>{e.mapped ? 'Described' : <em className="dunmapped">Not described yet</em>}</span>
                  <span className="dchips">{e.properties.map((x) => <i key={x}>{x}</i>)}</span>
                  <span className="num os-mono">{e.volume.toLocaleString('en-US')}</span>
                  <span className="num os-mono">{e.wallets.toLocaleString('en-US')}</span>
                  <span>{e.lastSeen}</span>
                </div>
              ))}
            </div>
            {unmappedEvents().length > 0 && (
              <p className="dnote">
                <Icon name="info" size={14} />
                <span>
                  {unmappedEvents().length} events are arriving that nobody has described. They work in a
                  rule today under their raw name. Describing them is what stops someone picking the
                  wrong one.
                </span>
              </p>
            )}
          </section>
        </div>
      )}

      {tab === 'channels' && <ChannelsTab />}

      {tab === 'webhooks' && (
        <div className="dsec">
          <section>
            <div className="dsec__head">
              <span className="dsec__ic"><Icon name="webhook" size={16} /></span>
              <div>
                <h2>Outbound webhooks</h2>
                <p>Fire when something happens here that your systems need to know about.</p>
              </div>
            </div>
            <ApiPanel only="webhooks" />
          </section>
        </div>
      )}

      {tab === 'api' && (
        <div className="dsec">
          <section>
            <div className="dsec__head">
              <span className="dsec__ic"><Icon name="code-xml" size={16} /></span>
              <div>
                <h2>API keys</h2>
                <p>Read and write contacts, events and campaigns directly. Included on every plan.</p>
              </div>
            </div>
            <ApiPanel only="keys" />
          </section>
        </div>
      )}

      {adding && (
        <AddContract initial={mode === 'empty' ? project : undefined} onClose={() => setAdding(false)} onAdd={(list) => {
          store.addContracts(list);
          setAdding(false);
          if (mode === 'empty' && list[0]) beginIndexing(list[0].name);
        }} />
      )}

    </div>
  );
}
