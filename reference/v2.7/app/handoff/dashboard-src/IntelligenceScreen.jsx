import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Modal } from '../../components/overlays/Modal.jsx';
import { Identicon } from '../../components/data/Identicon.jsx';
import { AddressChip } from '../../components/product/AddressChip.jsx';
import { SEGMENTS } from './segments.js';

const css = `
.osd-int{max-width:1560px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-5);font-family:var(--font-sans);}
.osd-int__head{display:flex;align-items:center;gap:16px;}
.osd-int__head h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-int__enrich{display:inline-flex;align-items:center;gap:8px;font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-int__tabs{display:flex;gap:2px;border-bottom:1px solid var(--border-default);}
.osd-int__tab{border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);padding:10px 16px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;display:inline-flex;align-items:center;gap:8px;}
.osd-int__tab:hover{color:var(--text-primary);}
.osd-int__tab.on{color:var(--text-primary);border-bottom-color:var(--action-primary);}
.osd-int__tab i{font-style:normal;font-size:11px;font-weight:600;background:var(--surface-subtle);color:var(--text-tertiary);border-radius:99px;padding:1px 8px;}
.osd-chat{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:flex;flex-direction:column;height:640px;overflow:hidden;}
.osd-chat__scroll{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:20px;}
.osd-chat__empty{margin:auto;max-width:640px;width:100%;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.osd-chat__spark{width:44px;height:44px;border-radius:var(--radius-round);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-chat__empty h2{margin:0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-chat__empty p{margin:0 0 12px;font-size:var(--text-body-s-size);color:var(--text-secondary);max-width:420px;}
.osd-chat__sugg{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;}
.osd-note{border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--surface-subtle);padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
.osd-note__hd{display:flex;align-items:center;gap:8px;font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-note__chips{display:flex;flex-wrap:wrap;gap:8px;}
.osd-note__chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border-default);border-radius:99px;background:var(--bg-surface);padding:6px 12px;font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--text-primary);cursor:pointer;}
.osd-note__chip:hover{border-color:var(--action-primary);color:var(--action-primary);background:var(--bg-selected);}
.osd-chat__suggbtn{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);cursor:pointer;text-align:left;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);transition:border-color var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard);}
.osd-chat__suggbtn:hover{border-color:var(--action-primary);background:var(--bg-selected);}
.osd-chat__suggbtn .osd-chat__sicn{color:var(--text-tertiary);display:flex;flex-shrink:0;}
.osd-msg{display:flex;gap:12px;max-width:100%;}
.osd-msg--user{justify-content:flex-end;}
.osd-msg--user .osd-msg__bubble{background:var(--action-primary);color:#fff;border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:var(--text-body-s-size);max-width:70%;}
.osd-msg__ai{width:30px;height:30px;border-radius:var(--radius-round);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-msg__body{display:flex;flex-direction:column;gap:12px;min-width:0;flex:1;}
.osd-msg__text{font-size:var(--text-body-s-size);line-height:1.55;color:var(--text-primary);}
.osd-ans{border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;}
.osd-ans__tabs{display:flex;gap:2px;padding:8px 10px 0;border-bottom:1px solid var(--border-subtle);background:var(--surface-subtle);}
.osd-ans__tab{border:none;background:none;font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--text-secondary);padding:6px 10px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;display:inline-flex;align-items:center;gap:6px;}
.osd-ans__tab.on{color:var(--text-primary);border-bottom-color:var(--action-primary);}
.osd-ans__body{padding:0;}
.osd-ans__table{width:100%;border-collapse:collapse;font-size:var(--text-body-s-size);}
.osd-ans__table th{text-align:left;padding:9px 16px;font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);border-bottom:1px solid var(--border-subtle);white-space:nowrap;}
.osd-ans__table td{padding:0 16px;height:44px;color:var(--text-primary);border-bottom:1px solid var(--border-subtle);}
.osd-ans__table tbody tr:last-child td{border-bottom:none;}
.osd-ans__table .num{text-align:right;font-variant-numeric:tabular-nums;}
.osd-ans__sql{margin:0;padding:16px;background:var(--neutral-900,#111);color:#e6e6e6;font-family:var(--font-mono);font-size:13px;line-height:1.6;overflow-x:auto;}
.osd-ans__sql .kw{color:#c792ea;}
.osd-ans__sql .fn{color:#82aaff;}
.osd-ans__sql .st{color:#c3e88d;}
.osd-ans__sqlbar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--border-subtle);background:var(--surface-subtle);}
.osd-ans__chart{padding:20px 16px;}
.osd-bars{display:flex;align-items:flex-end;gap:8px;height:160px;}
.osd-bars__col{flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;}
.osd-bars__bar{width:100%;background:var(--action-primary);border-radius:4px 4px 0 0;opacity:0.85;}
.osd-bars__lbl{font-size:11px;color:var(--text-tertiary);white-space:nowrap;}
.osd-ans__acts{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border-subtle);}
.osd-chat__composer{border-top:1px solid var(--border-default);padding:14px 20px;display:flex;align-items:center;gap:10px;}
.osd-chat__input{flex:1;display:flex;align-items:center;gap:10px;background:var(--surface-subtle);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 14px;height:44px;}
.osd-chat__input:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);background:var(--bg-surface);}
.osd-chat__input input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);min-width:0;}
.osd-chat__send{width:36px;height:36px;border-radius:var(--radius-md);border:none;background:var(--action-primary);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.osd-chat__send:disabled{opacity:0.4;cursor:not-allowed;}
.osd-seg__wrap{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:var(--space-5);align-items:start;}
.osd-card{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);}
.osd-card__head{padding:16px 20px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:12px;}
.osd-card__head h3{margin:0;font-size:var(--text-heading-s-size,16px);font-weight:600;color:var(--text-primary);}
.osd-card__body{padding:18px 20px;display:flex;flex-direction:column;gap:16px;}
.osd-ai{display:flex;gap:10px;align-items:flex-start;background:var(--bg-selected);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:12px 14px;}
.osd-ai__in{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);resize:none;min-height:20px;}
.osd-rule{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px 12px;}
.osd-rule__jn{font-size:var(--text-label-s-size);font-weight:600;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-tertiary);width:36px;}
.osd-txtin{height:36px;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:0 12px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;}
.osd-txtin:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-preview__count{font-size:34px;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;letter-spacing:-1px;line-height:1.1;}
.osd-seglist{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden;}
.osd-seglist__row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border-subtle);cursor:pointer;}
.osd-seglist__row:last-child{border-bottom:none;}
.osd-seglist__row:hover{background:var(--surface-hover);}
.osd-seglist__ic{width:34px;height:34px;border-radius:var(--radius-sm);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-seglist__meta{display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-seglist__meta b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-seglist__meta span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-seglist__count{margin-left:auto;text-align:right;}
.osd-seglist__count b{font-size:var(--text-body-m-size);font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;display:block;}
.osd-seglist__count span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-rep__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4);}
.osd-rep__card{border:1px solid var(--border-default);border-radius:var(--radius-lg);background:var(--bg-surface);padding:18px;display:flex;flex-direction:column;gap:10px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-rep__card:hover{border-color:var(--border-strong);box-shadow:var(--elevation-1);}
.osd-rep__ic{width:38px;height:38px;border-radius:var(--radius-md);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;}
.osd-rep__card b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-rep__card p{margin:0;font-size:var(--text-caption-size);color:var(--text-secondary);line-height:1.45;}
.osd-rep__lbl{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);margin:4px 0 0;}
.osd-int__empty{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:80px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.osd-int__empty__icn{width:48px;height:48px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-int__empty h2{margin:4px 0 0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-int__empty p{margin:0 0 16px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:460px;}
`;
if (typeof document !== 'undefined') {
  const prev = document.getElementById('osd-int-css');
  if (prev) prev.remove();
  const s = document.createElement('style'); s.id = 'osd-int-css'; s.textContent = css; document.head.appendChild(s);
}

const SUGGESTIONS = [
  { icon: 'coins', text: 'Top holders by token', kind: 'onchain' },
  { icon: 'layers', text: 'Wallet balances across chains', kind: 'onchain' },
  { icon: 'mail-open', text: 'Wallets that opened but never clicked', kind: 'offchain' },
  { icon: 'megaphone', text: 'Best-converting campaign by segment', kind: 'offchain' },
];
const HOLDERS = [
  { addr: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', ens: 'vitalik.eth', bal: '4,820', pct: '3.9%' },
  { addr: '0x8Cc47712bF3A0d2eE291B7A5C41f9E88Dd0121aB', ens: '', bal: '3,140', pct: '2.5%' },
  { addr: '0xF31d99C02aE84b7cD1204E5F6a7B8C9D0E1F77c0', ens: 'nftmaxi.eth', bal: '2,610', pct: '2.1%' },
  { addr: '0x44Ab0912CdEf34567890aBcDeF1234567890BeeF', ens: '', bal: '1,980', pct: '1.6%' },
  { addr: '0x9E0fD34567812345aBcD6789Ef0123456789Cafe', ens: 'degen.eth', bal: '1,540', pct: '1.2%' },
];
const CHART = [
  { l: 'Base', h: 92 }, { l: 'Ethereum', h: 64 }, { l: 'Arbitrum', h: 41 }, { l: 'Optimism', h: 28 }, { l: 'Polygon', h: 16 },
];
const SEGMENTS_REMOVED = [
  { id: 'whales', name: 'Base whales', desc: 'Balance > 10 ETH · active 7d', count: '1,204', synced: '2 min ago' },
  { id: 'new', name: 'New Season 2 buyers', desc: 'Bought a pack in the last 7 days', count: '512', synced: '18 min ago' },
  { id: 'dormant', name: 'Dormant, was active', desc: 'No activity 30d · LTV > 5 ETH', count: '978', synced: '1h ago' },
];
const RULE_FIELDS = ['Wallet balance', 'Chain activity', 'Token held', 'Last active', 'Gas spent', 'Email opened', 'Email clicked', 'Push viewed', 'Campaign received', 'Form submitted', 'Tag', 'Segment'];

/** Intelligence — chat-first analytics (SQL merged into answers) with Segments and Reports tabs and an Enrich flow. */
export function IntelligenceScreen({ filled = true, onCreateCampaign, seedQuestion, onSeedConsumed }) {
  const [tab, setTab] = React.useState('chat');
  const [conversation, setConversation] = React.useState(filled ? 'seed' : 'empty');
  const [lastQ, setLastQ] = React.useState('Who are the top holders of $VAULT and which chains are they on?');
  const [resultKind, setResultKind] = React.useState('data');
  const [draft, setDraft] = React.useState('');
  const [ansView, setAnsView] = React.useState('table');
  const [enrichOpen, setEnrichOpen] = React.useState(false);
  const [enrichState, setEnrichState] = React.useState('form');
  const [prompt, setPrompt] = React.useState('');
  const [rules, setRules] = React.useState([{ id: 1, field: 'Wallet balance', op: 'is greater than', val: '10' }, { id: 2, field: 'Email opened', op: 'is within', val: '7 days' }]);
  const [match, setMatch] = React.useState('all');
  let ruleId = 3;

  const classify = (q) => {
    const s = q.toLowerCase();
    if (/(price|worth|predict|will |should i|forecast|next week|moon|weather|news|when moon)/.test(s)) return 'unknown';
    if (/(solana|bitcoin|\bdoge\b|cardano|tiktok)/.test(s)) return 'empty';
    if (s.trim().split(/\s+/).length <= 2 || /^(show me wallets|top users|best wallets|good ones)\b/.test(s)) return 'clarify';
    return 'data';
  };
  const ask = (q) => { setLastQ(q); setResultKind(classify(q)); setDraft(''); setAnsView('table'); setConversation('seed'); };
  React.useEffect(() => {
    if (seedQuestion) { setTab('chat'); ask(seedQuestion); if (onSeedConsumed) onSeedConsumed(); }
  }, [seedQuestion]);
  const startEnrich = () => { setEnrichState('running'); setTimeout(() => setEnrichState('done'), 2200); };
  const closeEnrich = () => { setEnrichOpen(false); setEnrichState('form'); };
  const count = match === 'all' ? '1,204' : '18,932';

  const answer = (
    <div className="osd-msg">
      <span className="osd-msg__ai"><Icon name="sparkles" size={15} /></span>
      <div className="osd-msg__body">
        <div className="osd-msg__text">Here's what I found for <b>“{lastQ}”</b> — the top matching wallets and how they spread across chains.</div>
        <div className="osd-ans">
          <div className="osd-ans__tabs">
            {[['table', 'grid-2x2', 'Table'], ['chart', 'bar-chart-3', 'Chart'], ['sql', 'code', 'SQL']].map(([id, ic, l]) => (
              <button key={id} type="button" className={`osd-ans__tab${ansView === id ? ' on' : ''}`} onClick={() => setAnsView(id)}><Icon name={ic} size={13} />{l}</button>
            ))}
          </div>
          <div className="osd-ans__body">
            {ansView === 'table' ? (
              <table className="osd-ans__table">
                <thead><tr><th>Wallet</th><th className="num">$VAULT</th><th className="num">Supply</th></tr></thead>
                <tbody>
                  {HOLDERS.map((h) => (
                    <tr key={h.addr}>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Identicon address={h.addr} size={22} /><AddressChip address={h.addr} label={h.ens || undefined} /></span></td>
                      <td className="num">{h.bal}</td>
                      <td className="num" style={{ color: 'var(--text-secondary)' }}>{h.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : ansView === 'chart' ? (
              <div className="osd-ans__chart">
                <div className="osd-bars">
                  {CHART.map((c) => (
                    <div className="osd-bars__col" key={c.l}>
                      <div className="osd-bars__bar" style={{ height: `${c.h}%` }}></div>
                      <span className="osd-bars__lbl">{c.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <React.Fragment>
                <pre className="osd-ans__sql"><span className="kw">SELECT</span> wallet, <span className="fn">SUM</span>(balance) <span className="kw">AS</span> vault{'\n'}<span className="kw">FROM</span> holders{'\n'}<span className="kw">WHERE</span> token = <span className="st">'$VAULT'</span>{'\n'}<span className="kw">GROUP BY</span> wallet{'\n'}<span className="kw">ORDER BY</span> vault <span className="kw">DESC</span> <span className="kw">LIMIT</span> <span className="st">50</span>;</pre>
                <div className="osd-ans__sqlbar">
                  <Button variant="tertiary" size="s" icon="pencil">Edit query</Button>
                  <Button variant="tertiary" size="s" icon="play">Re-run</Button>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>128,540 rows scanned · 240 ms</span>
                </div>
              </React.Fragment>
            )}
          </div>
          <div className="osd-ans__acts">
            <Button variant="secondary" size="s" icon="users">Save as segment</Button>
            <Button variant="secondary" size="s" icon="megaphone" onClick={() => onCreateCampaign && onCreateCampaign({ segments: ['whales'], name: 'Top $VAULT holders' })}>Create campaign</Button>
            <Button variant="tertiary" size="s" icon="download">Export CSV</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const aiWrap = (children) => (
    <div className="osd-msg"><span className="osd-msg__ai"><Icon name="sparkles" size={15} /></span><div className="osd-msg__body">{children}</div></div>
  );
  const unknownAnswer = aiWrap(
    <React.Fragment>
      <div className="osd-msg__text">I can't answer that one. I work over your <b>on-chain activity</b> and <b>messaging engagement</b> — I can't predict prices, read the news, or fetch anything off-platform.</div>
      <div className="osd-note">
        <span className="osd-note__hd"><Icon name="compass" size={15} color="var(--action-primary)" />Try asking instead</span>
        <div className="osd-note__chips">
          {['Top holders of $VAULT by chain', 'Wallets that opened my last email but didn\u2019t buy', 'Average gas spent by my whales this month'].map((s) => (
            <button key={s} type="button" className="osd-note__chip" onClick={() => ask(s)}><Icon name="corner-down-right" size={13} />{s}</button>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
  const emptyAnswer = aiWrap(
    <React.Fragment>
      <div className="osd-msg__text">The query ran, but <b>no wallets matched</b>. That usually means the data isn't indexed yet or the filter is too narrow.</div>
      <div className="osd-note">
        <span className="osd-note__hd"><Icon name="search-x" size={15} color="var(--text-tertiary)" />No results</span>
        <div className="osd-note__chips">
          <button type="button" className="osd-note__chip" onClick={() => setEnrichOpen(true)}><Icon name="sparkles" size={13} />Enrich more wallets</button>
          <button type="button" className="osd-note__chip" onClick={() => ask('Top holders of $VAULT by chain')}><Icon name="sliders-horizontal" size={13} />Broaden the filter</button>
          <button type="button" className="osd-note__chip"><Icon name="code" size={13} />Edit the SQL</button>
        </div>
      </div>
    </React.Fragment>
  );
  const clarifyAnswer = aiWrap(
    <React.Fragment>
      <div className="osd-msg__text">Happy to — which did you mean?</div>
      <div className="osd-note">
        <span className="osd-note__hd"><Icon name="help-circle" size={15} color="var(--action-primary)" />Pick one to run</span>
        <div className="osd-note__chips">
          {['Top wallets by token balance', 'Most active wallets in the last 30 days', 'Wallets with the highest engagement'].map((s) => (
            <button key={s} type="button" className="osd-note__chip" onClick={() => ask(s)}><Icon name="corner-down-right" size={13} />{s}</button>
          ))}
        </div>
      </div>
    </React.Fragment>
  );

  return (
    <div className="osd-int" data-screen-label={`Intelligence · ${tab}`}>
      <div className="osd-int__head">
        <h1>Intelligence</h1>
        <span style={{ flex: 1 }}></span>
        {filled ? (
          <span className="osd-int__enrich"><Icon name="check" size={13} color="var(--action-primary)" />Data enriched 2h ago · 128,540 wallets<Button variant="tertiary" size="s" icon="refresh-cw" onClick={() => setEnrichOpen(true)}>Refresh</Button></span>
        ) : (
          <Button variant="secondary" icon="sparkles" onClick={() => setEnrichOpen(true)}>Enrich wallet data</Button>
        )}
      </div>
      <div className="osd-int__tabs">
        <button type="button" className={`osd-int__tab${tab === 'chat' ? ' on' : ''}`} onClick={() => setTab('chat')}><Icon name="message-square" size={16} />Chat</button>
        <button type="button" className={`osd-int__tab${tab === 'segments' ? ' on' : ''}`} onClick={() => setTab('segments')}><Icon name="users" size={16} />Segments<i>{filled ? SEGMENTS.length : 0}</i></button>
      </div>

      {tab === 'chat' ? (
        <div className="osd-chat">
          <div className="osd-chat__scroll">
            {conversation === 'empty' ? (
              <div className="osd-chat__empty">
                <span className="osd-chat__spark"><Icon name="sparkles" size={20} /></span>
                <h2>Ask anything about onchain activity</h2>
                <p>Trace token holders, compare wallets, analyze gas — or cross on-chain behaviour with email, push and campaign engagement, in plain English.</p>
                <div className="osd-chat__sugg">
                  {SUGGESTIONS.map((s) => (
                    <button key={s.text} type="button" className="osd-chat__suggbtn" onClick={() => ask(s.text)}>
                      <span className="osd-chat__sicn"><Icon name={s.icon} size={16} /></span>
                      <span style={{ flex: 1 }}>{s.text}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--text-tertiary)', background: 'var(--surface-subtle)', borderRadius: 99, padding: '2px 7px', flexShrink: 0 }}>{s.kind === 'onchain' ? 'On-chain' : 'Off-chain'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <React.Fragment>
                <div className="osd-msg osd-msg--user"><div className="osd-msg__bubble">{lastQ}</div></div>
                {resultKind === 'unknown' ? unknownAnswer : resultKind === 'empty' ? emptyAnswer : resultKind === 'clarify' ? clarifyAnswer : answer}
              </React.Fragment>
            )}
          </div>
          <div className="osd-chat__composer">
            <div className="osd-chat__input">
              <Icon name="sparkles" size={16} color="var(--text-tertiary)" />
              <input placeholder="Ask anything about onchain activity…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) ask(draft); }} />
            </div>
            <button type="button" className="osd-chat__send" disabled={!draft.trim()} onClick={() => draft.trim() && ask(draft)} aria-label="Send"><Icon name="arrow-up" size={18} /></button>
          </div>
        </div>
      ) : null}

      {tab === 'segments' ? (
        <div className="osd-seg__wrap">
          <div className="osd-card">
            <div className="osd-card__head"><h3>New segment</h3><span style={{ marginLeft: 'auto' }}><Badge status="neutral">Draft</Badge></span></div>
            <div className="osd-card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Describe your audience</label>
                <div className="osd-ai">
                  <Icon name="sparkles" size={16} color="var(--action-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <textarea className="osd-ai__in" rows={2} placeholder="e.g. Base wallets over 10 ETH who opened our last email but didn't buy" value={prompt} onChange={(e) => setPrompt(e.target.value)}></textarea>
                  <Button size="s" icon="wand-sparkles">Generate</Button>
                </div>
                <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>The prompt becomes editable rules below — tweak anything by hand.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Match</span>
                  <div style={{ display: 'inline-flex', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
                    {[['all', 'All (AND)'], ['any', 'Any (OR)']].map(([id, l]) => (
                      <button key={id} type="button" onClick={() => setMatch(id)} style={{ border: 'none', background: match === id ? 'var(--bg-surface)' : 'none', boxShadow: match === id ? 'var(--elevation-1)' : 'none', color: match === id ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'inherit', fontSize: 'var(--text-label-s-size)', fontWeight: 500, padding: '5px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>{l}</button>
                    ))}
                  </div>
                </div>
                {rules.map((r, i) => (
                  <div className="osd-rule" key={r.id}>
                    <span className="osd-rule__jn">{i === 0 ? 'Where' : match === 'all' ? 'And' : 'Or'}</span>
                    <Select options={RULE_FIELDS} defaultValue={r.field} style={{ width: 170 }} />
                    <Select options={['is greater than', 'is less than', 'equals', 'is within']} defaultValue={r.op} style={{ width: 160 }} />
                    <input className="osd-txtin" defaultValue={r.val} style={{ width: 120 }} />
                    <span style={{ marginLeft: 'auto', display: 'flex' }}><Button variant="tertiary" size="s" icon="x" onClick={() => setRules(rules.filter((x) => x.id !== r.id))}></Button></span>
                  </div>
                ))}
                <div><Button variant="tertiary" size="s" icon="plus" onClick={() => setRules([...rules, { id: ruleId++, field: 'Wallet balance', op: 'is greater than', val: '' }])}>Add rule</Button></div>
                <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}><Icon name="shield-check" size={13} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />Balance, token and gas rules are matched with zero-knowledge proofs — wallets qualify without their exact values ever being exposed.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                <Button variant="secondary">Cancel</Button>
                <Button icon="users">Save segment</Button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="osd-card">
              <div className="osd-card__head"><h3>Live preview</h3></div>
              <div className="osd-card__body">
                <div><span className="osd-preview__count">{count}</span><div style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>matching wallets · updates as you edit</div></div>
                {HOLDERS.slice(0, 3).map((h) => (
                  <div key={h.addr} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Identicon address={h.addr} size={22} /><AddressChip address={h.addr} label={h.ens || undefined} /></div>
                ))}
                <Button variant="tertiary" size="s" icon="megaphone" onClick={() => onCreateCampaign && onCreateCampaign({ segments: ['whales'], name: 'New segment campaign' })}>Create campaign from segment</Button>
              </div>
            </div>
            {filled ? (
              <div>
                <p className="osd-rep__lbl">Saved segments</p>
                <div className="osd-seglist" style={{ marginTop: 8 }}>
                  {SEGMENTS.map((s) => (
                    <div className="osd-seglist__row" key={s.id}>
                      <span className="osd-seglist__ic"><Icon name="users" size={16} /></span>
                      <span className="osd-seglist__meta"><b>{s.name}</b><span>{s.desc}</span></span>
                      <span className="osd-seglist__count"><b>{typeof s.count === 'number' ? s.count.toLocaleString('en-US') : s.count}</b><span>synced {s.synced}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {enrichOpen ? (
        <Modal title="Enrich wallet data" size="m" onClose={closeEnrich}
          primaryLabel={enrichState === 'form' ? 'Start enrichment' : enrichState === 'done' ? 'Done' : null}
          onPrimary={enrichState === 'form' ? startEnrich : closeEnrich}
          secondaryLabel={enrichState === 'form' ? 'Cancel' : null}>
          {enrichState === 'form' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)' }}>Refresh on-chain metrics — balances, activity, and history — for wallets already in your audience, so chat and SQL query fresh data. To <b>add</b> new wallets instead, use <b>Sync wallets</b> in Audience.</p>
              <Select label="Wallets to enrich" options={['All wallets in audience (128,540)', 'Only wallets missing metrics', 'A saved segment…']} />
              <Select label="Chains" options={['All indexed chains', 'Base only', 'Ethereum only']} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 12px' }}>
                <Icon name="clock" size={14} />Last enriched 2h ago · 128,540 wallets · ~4 min estimated
              </div>
            </div>
          ) : enrichState === 'running' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0 20px', textAlign: 'center' }}>
              <span style={{ width: 44, height: 44, borderRadius: 99, border: '3px solid var(--surface-subtle)', borderTopColor: 'var(--action-primary)', animation: 'osd-spin 0.9s linear infinite' }}></span>
              <style>{'@keyframes osd-spin{to{transform:rotate(360deg)}}'}</style>
              <b style={{ fontSize: 'var(--text-body-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>Refreshing on-chain metrics…</b>
              <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)' }}>Runs in the background — you can keep working. Chat updates when it finishes.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 0 16px', textAlign: 'center' }}>
              <span style={{ width: 44, height: 44, borderRadius: 99, background: 'var(--bg-selected)', color: 'var(--action-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={20} strokeWidth={2.5} /></span>
              <b style={{ fontSize: 'var(--text-body-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>128,540 wallets refreshed</b>
              <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)' }}>Every wallet now has up-to-date metrics. Segments and reports will reflect this on their next refresh.</p>
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
