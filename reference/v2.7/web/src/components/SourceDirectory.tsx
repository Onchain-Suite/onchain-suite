import { useMemo, useState } from 'react';
import { Badge, Button, Modal } from './ui';
import { Icon } from './icons';
import { toast } from './toast';
import { copyText } from '../data/persist';
import {
  FRESHNESS, LANE_LABEL, SOURCES, SOURCE_KINDS, fallbackSources, requestSource, searchSources,
  setupDocUrl, sourceCount, sourcesOfKind, useRequestedSources,
  type DataSource, type Freshness, type SourceKind,
} from '../data/sources';
import { useContracts } from '../data/store';
import { useWorkspaceMode } from '../data/workspace';
import './source-directory.css';

/* The source directory.
 *
 * This was a search box over a flat grid, which was right about search and wrong about
 * everything after it: once you have more than a dozen sources, a flat list of equals gives
 * nobody a way to think about the set. Categories down one side, cards in the other, and the
 * search still covers everything at once — browse and search are different questions and the
 * page should answer both without making you choose a mode.
 *
 * Each card names who wrote the integration. A connector we maintain and one a vendor
 * maintains fail differently and get fixed on different timescales, and someone deciding
 * whether to depend on it should be able to see which they are looking at before they do.
 */
const FRESH_ICON: Record<Freshness, string> = { live: 'zap', scheduled: 'clock', 'one-off': 'upload' };

function Fresh({ f }: { f: Freshness }) {
  return (
    <span className={`sfresh sfresh--${f}`} title={FRESHNESS[f].can}>
      <Icon name={FRESH_ICON[f]} size={11} />{FRESHNESS[f].label}
    </span>
  );
}

/* The vendor's own icon, with a monogram behind it.
 *
 * Fetched from the vendor's domain rather than drawn by us — a hand-made approximation of
 * someone else's logo is their trademark rendered slightly wrong, which is worse than not
 * showing one. The monogram sits underneath and shows through whenever the request fails,
 * which it will: some of these block hotlinking, some have no icon at that size, and anyone
 * on a blocked network gets nothing. The card has to look finished either way, so the
 * fallback is the layout and the image is painted over it.
 *
 * It is a third-party request per logo, which is a real cost on a page that lists twenty.
 * They are lazy and async-decoded so they never hold up the grid, and anything we build
 * ourselves uses our own mark and makes no request at all.
 */
function Mark({ s }: { s: DataSource }) {
  const [failed, setFailed] = useState(false);
  const seed = s.name.charCodeAt(0) + s.name.length;
  const show = s.domain && !failed;
  return (
    <span className={`sdir__mark${show ? ' has-img' : ''}`}
      style={show ? undefined : { background: `var(--chart-${(seed % 5) + 1})` }} aria-hidden>
      {show
        ? <img src={`https://icons.duckduckgo.com/ip3/${s.domain}.ico`} alt="" loading="lazy"
            decoding="async" onError={() => setFailed(true)} />
        : s.name[0].toUpperCase()}
    </span>
  );
}

/* The catalogue's statuses are fixed, but two of them describe this workspace rather than the
   catalogue: whether your contracts are indexed, and whether a sheet has been imported. Read
   statically they told a workspace that had just paid — with nothing indexed — that both were
   connected, on the one screen the tour sends them to first. */
function useLiveStatus(s: DataSource): DataSource['status'] {
  const mode = useWorkspaceMode();
  const contracts = useContracts();
  if (s.id === 'contracts') return contracts.length ? 'connected' : 'available';
  if (mode === 'empty' && s.status === 'connected') return 'available';
  return s.status;
}

function Card({ s, onOpen }: { s: DataSource; onOpen: (s: DataSource) => void }) {
  const status = useLiveStatus(s);
  return (
    <button type="button" className={`sdir__card${status === 'soon' ? ' is-soon' : ''}`} onClick={() => onOpen(s)}>
      <span className="sdir__top">
        <Mark s={s} />
        <span className="sdir__name">
          <b>{s.name}{status === 'connected' && <Icon name="check-circle-2" size={13} className="sdir__verified" />}</b>
          <span>By {s.by ?? 'OnchainSuite'}</span>
        </span>
        {status === 'soon' && <Badge status="neutral">Soon</Badge>}
      </span>
      <span className="sdir__desc">{s.gives}</span>
      <span className="sdir__meta"><Fresh f={s.freshness} /><i>{LANE_LABEL[s.lane]}</i></span>
    </button>
  );
}

function Detail({ s, onBack, onConnect }: { s: DataSource; onBack: () => void; onConnect: () => void }) {
  const status = useLiveStatus(s);
  return (
    <div className="sdet">
      <button type="button" className="sdet__back" onClick={onBack}>
        <Icon name="arrow-left" size={15} />Sources
      </button>

      <header className="sdet__head">
        <Mark s={s} />
        <div>
          <h2>{s.name}</h2>
          <p>{s.gives}</p>
        </div>
        {status === 'connected'
          ? <Badge status="success">Connected</Badge>
          : status === 'soon'
            ? <Badge status="neutral">Not available yet</Badge>
            : <Button icon="plus" onClick={onConnect}>Connect</Button>}
      </header>

      <div className="sdet__body">
        <aside className="sdet__meta">
          <div><span>Category</span><b>{SOURCE_KINDS.find((k) => k.id === s.kind)?.label}</b></div>
          <div><span>Built by</span><b>{s.by ?? 'OnchainSuite'}</b></div>
          <div><span>Data arrives</span><b>{FRESHNESS[s.freshness].label}</b></div>
          <div><span>Contributes</span><b>{LANE_LABEL[s.lane]}</b></div>
          <div>
            <span>Setup guide</span>
            <button type="button" className="sdet__link"
              onClick={() => { void copyText(setupDocUrl(s.id)); toast('Setup link copied'); }}>
              Copy link<Icon name="copy" size={12} />
            </button>
          </div>
        </aside>

        <div className="sdet__prose">
          <h3>Overview</h3>
          <p>{s.about ?? s.gives}</p>

          {s.how && (<>
            <h3>How it works</h3>
            <ul>{s.how.map((h) => <li key={h}>{h}</li>)}</ul>
          </>)}

          <h3>What it can trigger</h3>
          <p>{FRESHNESS[s.freshness].can}</p>

          {s.configure && (<>
            <h3>Configure</h3>
            <p>{s.configure}</p>
          </>)}
        </div>
      </div>
    </div>
  );
}

export default function SourceDirectory() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<SourceKind | 'all'>('all');
  const [detail, setDetail] = useState<DataSource | null>(null);
  const [connecting, setConnecting] = useState<DataSource | null>(null);
  const requested = useRequestedSources();

  const term = q.trim();
  const results = useMemo(() => searchSources(q), [q]);

  if (detail) {
    return <Detail s={detail} onBack={() => setDetail(null)} onConnect={() => setConnecting(detail)} />;
  }

  const groups = term
    ? [{ id: 'results' as const, label: `${results.length} ${results.length === 1 ? 'source' : 'sources'}`, items: results }]
    : SOURCE_KINDS.filter((k) => cat === 'all' || k.id === cat)
      .map((k) => ({ id: k.id, label: k.label, items: sourcesOfKind(k.id) }));

  return (
    <div className="sdir">
      <div className="sdir__search">
        <Icon name="search" size={16} />
        <input value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
          aria-label="Search sources"
          placeholder="What do you already use? Privy, Segment, Mixpanel, a spreadsheet, your contracts…" />
        {term && (
          <button type="button" onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={14} /></button>
        )}
      </div>

      <div className="sdir__cols">
        {/* The rail is hidden while searching: a category filter and a search that already
            spans every category are two answers to one question. */}
        {!term && (
          <nav className="sdir__rail" aria-label="Source categories">
            <button type="button" className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>
              <Icon name="layout-grid" size={15} />All<i>{SOURCES.length}</i>
            </button>
            {SOURCE_KINDS.map((k) => (
              <button key={k.id} type="button" className={cat === k.id ? 'on' : ''} onClick={() => setCat(k.id)}>
                <Icon name={k.icon} size={15} />{k.label}<i>{sourceCount(k.id)}</i>
              </button>
            ))}
          </nav>
        )}

        <div className="sdir__main">
          {term && results.length === 0 ? (
            <section className="sdir__miss">
              <h2>No one-click connection for &ldquo;{term}&rdquo; yet</h2>
              <p>
                Tell us and it goes on the list. What people search for here is how we choose what to
                build next. Either way your data can come in today: post it to a webhook, or call
                {' '}<code>track()</code> from your own app.
              </p>
              {requested.some((r) => r.toLowerCase() === term.toLowerCase())
                ? <p className="sdir__asked"><Icon name="check-circle-2" size={14} />Asked for. We&rsquo;ll email you when it lands.</p>
                : <Button icon="plus" onClick={() => { requestSource(term); toast(`Noted. We’ll look at ${term}`); }}>
                    Ask for {term}
                  </Button>}
              <div className="sdir__grid sdir__grid--alt">
                {fallbackSources().map((s) => <Card key={s.id} s={s} onOpen={setDetail} />)}
              </div>
            </section>
          ) : groups.map((g) => (
            <section key={g.id}>
              <h2 className="sdir__gh">{g.label}</h2>
              <div className="sdir__grid">
                {g.items.map((s) => <Card key={s.id} s={s} onOpen={setDetail} />)}
              </div>
            </section>
          ))}
        </div>
      </div>

      {connecting && (
        <Modal title={`Connect ${connecting.name}`} onClose={() => setConnecting(null)}
          footer={<><Button variant="secondary" onClick={() => setConnecting(null)}>Cancel</Button>
            <Button icon="external-link" onClick={() => { setConnecting(null); toast(`${connecting.name} connected`); }}>Authorise</Button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p className="sdet__lead">{connecting.about ?? connecting.gives}</p>
            <p className="sdet__can"><Fresh f={connecting.freshness} /><span>{FRESHNESS[connecting.freshness].can}</span></p>
            <div className="dsetup">
              <span>Hand this to whoever does the integration:</span>
              <code>{setupDocUrl(connecting.id)}</code>
              <Button variant="secondary" size="s" icon="copy"
                onClick={() => { void copyText(setupDocUrl(connecting.id)); toast('Setup link copied'); }}>Copy</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
