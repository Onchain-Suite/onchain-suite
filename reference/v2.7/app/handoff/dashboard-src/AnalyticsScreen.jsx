import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Tooltip } from '../../components/feedback/Tooltip.jsx';

const css = `
.osd-an{max-width:1560px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-5);font-family:var(--font-sans);}
.osd-an__head{display:flex;align-items:center;gap:16px;}
.osd-an__head h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-an__range{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:var(--radius-md);border:1px solid var(--border-default);background:var(--bg-surface);font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);cursor:pointer;}
.osd-an__strip{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:grid;grid-template-columns:repeat(4,1fr);}
.osd-an__kpi{padding:18px 24px;display:flex;flex-direction:column;gap:5px;border-right:1px solid var(--border-subtle);}
.osd-an__kpi:last-child{border-right:none;}
.osd-an__kpi span{font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-an__kpi b{font-size:26px;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1.15;}
.osd-an__kpi__tag{font-size:9px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;border-radius:99px;padding:2px 7px;align-self:flex-start;margin-top:2px;}
.osd-an__kpi__tag--on{background:var(--orange-100);color:var(--orange-700);}
.osd-an__kpi__tag--off{background:var(--bg-selected);color:var(--action-primary);}
.osd-an__pill{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;border-radius:99px;padding:3px 10px;}
.osd-an__pill--on{background:var(--orange-100);color:var(--orange-700);}
.osd-an__pill--off{background:var(--bg-selected);color:var(--action-primary);}
.osd-an__delta{font-size:var(--text-caption-size);font-weight:500;display:inline-flex;align-items:center;gap:3px;}
.osd-an__delta--up{color:var(--positive-600,#15803d);}
.osd-an__delta--down{color:var(--orange-700);}
.osd-an__lbl{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);margin:4px 0 0;}
.osd-an__grid{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:var(--space-4);align-items:start;}
.osd-card{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);}
.osd-card__head{padding:16px 20px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px;}
.osd-card__head h3{margin:0;font-size:var(--text-heading-s-size,16px);font-weight:600;color:var(--text-primary);}
.osd-card__head .m{margin-left:auto;font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-card__body{padding:20px;}
.osd-area{height:200px;display:flex;align-items:flex-end;gap:0;position:relative;}
.osd-area svg{width:100%;height:100%;overflow:visible;}
.osd-legend{display:flex;gap:16px;padding:0 20px 16px;}
.osd-legend span{display:inline-flex;align-items:center;gap:6px;font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-legend i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.osd-hbars{display:flex;flex-direction:column;gap:14px;}
.osd-hbar__row{display:flex;flex-direction:column;gap:6px;}
.osd-hbar__top{display:flex;justify-content:space-between;font-size:var(--text-body-s-size);}
.osd-hbar__top b{color:var(--text-primary);font-weight:500;}
.osd-hbar__top span{color:var(--text-secondary);font-variant-numeric:tabular-nums;}
.osd-hbar__track{height:8px;border-radius:99px;background:var(--surface-subtle);overflow:hidden;}
.osd-hbar__fill{height:100%;border-radius:99px;background:var(--action-primary);}
.osd-rep__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4);}
.osd-rep__card{border:1px solid var(--border-default);border-radius:var(--radius-lg);background:var(--bg-surface);padding:18px;display:flex;flex-direction:column;gap:10px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-rep__card:hover{border-color:var(--border-strong);box-shadow:var(--elevation-1);}
.osd-rep__ic{width:38px;height:38px;border-radius:var(--radius-md);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;}
.osd-rep__card b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-rep__card p{margin:0;font-size:var(--text-caption-size);color:var(--text-secondary);line-height:1.45;}
.osd-rep__tag{font-size:10px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:var(--text-tertiary);background:var(--surface-subtle);border-radius:99px;padding:2px 8px;align-self:flex-start;}
.osd-seglist{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden;}
.osd-seglist__row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid var(--border-subtle);cursor:pointer;}
.osd-seglist__row:last-child{border-bottom:none;}
.osd-seglist__row:hover{background:var(--surface-hover);}
.osd-seglist__ic{width:34px;height:34px;border-radius:var(--radius-sm);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-seglist__meta{display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-seglist__meta b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-seglist__meta span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-an__empty{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:80px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.osd-an__empty__icn{width:48px;height:48px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-an__empty h2{margin:4px 0 0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-an__empty p{margin:0 0 16px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:460px;}
`;
if (typeof document !== 'undefined') {
  const prev = document.getElementById('osd-an-css');
  if (prev) prev.remove();
  const s = document.createElement('style'); s.id = 'osd-an-css'; s.textContent = css; document.head.appendChild(s);
}

const KPIS = [
  { label: 'Wallets reached · 30d', value: '18,204', delta: '+12.4%', up: true, hint: 'Unique wallets sent at least one email or in-app push in the last 30 days.' },
  { label: 'Avg open rate', value: '42.3%', delta: '+3.1pt', up: true, hint: 'Share of delivered emails that were opened, averaged across campaigns.' },
  { label: 'Active wallets · 30d', value: '9,412', delta: '+8.6%', up: true, hint: 'Wallets in your audience with at least one on-chain action in the last 30 days.' },
  { label: 'On-chain conversions', value: '1,164', delta: '+22.8%', up: true, hint: 'Wallets that took a target on-chain action within the attribution window after a message.' },
];
const OFFCHAIN = [
  { name: 'Email opens', value: '42.3%', pct: 82 },
  { name: 'Push views', value: '38.6%', pct: 74 },
  { name: 'Email clicks', value: '11.8%', pct: 28 },
  { name: 'Unsubscribes', value: '0.4%', pct: 4 },
];
const ONCHAIN = [
  { name: 'New holders', value: '1,204', pct: 68 },
  { name: 'Swaps', value: '842', pct: 48 },
  { name: 'Post-message conversions', value: '1,164', pct: 66 },
  { name: '30d retention', value: '54.2%', pct: 54 },
];
const REPORTS = [
  { icon: 'users', name: 'Holder distribution', desc: 'Balances, concentration and top wallets by token.', tag: 'On-chain' },
  { icon: 'line-chart', name: 'Retention cohorts', desc: 'Weekly wallet retention since first interaction.', tag: 'On-chain' },
  { icon: 'mail-open', name: 'Engagement by segment', desc: 'Open, click and push-view rates per audience.', tag: 'Off-chain' },
  { icon: 'target', name: 'Conversion attribution', desc: 'On-chain actions mapped back to campaigns and flows.', tag: 'Blended' },
  { icon: 'megaphone', name: 'Campaign report', desc: 'Delivery, engagement and conversion per campaign.', tag: 'Off-chain' },
  { icon: 'zap', name: 'Automation performance', desc: 'Entries, completion and conversion by flow.', tag: 'Blended' },
];
const PINNED = [
  ['Top $VAULT holders by chain', 'Pinned Jul 22 · refreshes daily'],
  ['Whale unstake watch', 'Pinned Jul 20 · refreshes hourly'],
  ['Season 2 buyer engagement', 'Pinned Jul 19 · refreshes daily'],
];
const SERIES_A = [22, 30, 26, 38, 34, 46, 42, 55, 50, 63, 58, 72];
const SERIES_B = [12, 16, 15, 20, 19, 26, 24, 30, 28, 36, 33, 42];
const toPath = (pts, h = 200, w = 560) => pts.map((v, i) => `${(i / (pts.length - 1)) * w},${h - (v / 80) * h}`).join(' ');

/** Analytics — recurring dashboards: blended on/off-chain KPIs, trends, channel performance,
    report templates, and pinned answers. Split out of Intelligence. */
export function AnalyticsScreen({ filled = true }) {
  if (!filled) {
    return (
      <div className="osd-an" data-screen-label="Analytics · empty">
        <div className="osd-an__head"><h1>Analytics</h1></div>
        <div className="osd-an__empty">
          <span className="osd-an__empty__icn"><Icon name="line-chart" size={24} strokeWidth={1.5} /></span>
          <h2>No analytics yet</h2>
          <p>Once you enrich wallets and send your first campaign, blended on-chain and messaging metrics land here. Run a report template to get started.</p>
          <Button icon="line-chart" size="l">Run a report</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="osd-an" data-screen-label="Analytics · overview">
      <div className="osd-an__head">
        <h1>Analytics</h1>
        <span style={{ flex: 1 }}></span>
        <button type="button" className="osd-an__range"><Icon name="calendar" size={16} color="var(--text-tertiary)" />Last 30 days<Icon name="chevron-down" size={15} color="var(--text-tertiary)" /></button>
        <Button variant="secondary" icon="download">Export</Button>
      </div>
      <div className="osd-an__strip">
        {KPIS.map((k) => (
          <div className="osd-an__kpi" key={k.label}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{k.label}<Tooltip content={k.hint}><Icon name="info" size={13} color="var(--text-tertiary)" /></Tooltip></span>
            <b>{k.value}</b>
            <span className={`osd-an__delta osd-an__delta--${k.up ? 'up' : 'down'}`}><Icon name={k.up ? 'trending-up' : 'trending-down'} size={13} />{k.delta}</span>
          </div>
        ))}
      </div>
      <div className="osd-card">
        <div className="osd-card__head"><h3>Reach & conversions over time</h3><span className="m">Daily · last 30 days</span></div>
        <div className="osd-legend">
          <span><i style={{ background: 'var(--action-primary)' }}></i>Wallets reached · off-chain</span>
          <span><i style={{ background: 'var(--orange-400)' }}></i>On-chain conversions</span>
        </div>
        <div className="osd-card__body" style={{ paddingTop: 0 }}>
          <div className="osd-area">
            <svg viewBox="0 0 560 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--action-primary)" stopOpacity="0.18" /><stop offset="1" stopColor="var(--action-primary)" stopOpacity="0" /></linearGradient>
              </defs>
              <polygon fill="url(#agrad)" points={`0,200 ${toPath(SERIES_A)} 560,200`} />
              <polyline fill="none" stroke="var(--action-primary)" strokeWidth="2.5" points={toPath(SERIES_A)} />
              <polyline fill="none" stroke="var(--orange-400)" strokeWidth="2.5" strokeDasharray="4 4" points={toPath(SERIES_B)} />
            </svg>
          </div>
        </div>
      </div>
      <div className="osd-an__grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
        <div className="osd-card">
          <div className="osd-card__head"><h3>Off-chain engagement</h3><Tooltip content="Email and in-app push performance for messages you sent." style={{ marginLeft: 'auto' }}><Icon name="info" size={14} color="var(--text-tertiary)" /></Tooltip></div>
          <div className="osd-card__body">
            <div className="osd-hbars">
              {OFFCHAIN.map((c) => (
                <div className="osd-hbar__row" key={c.name}>
                  <div className="osd-hbar__top"><b>{c.name}</b><span>{c.value}</span></div>
                  <div className="osd-hbar__track"><div className="osd-hbar__fill" style={{ width: `${c.pct}%`, background: 'var(--action-primary)' }}></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="osd-card">
          <div className="osd-card__head"><h3>On-chain activity</h3><Tooltip content="What wallets in your audience did on-chain over the period." style={{ marginLeft: 'auto' }}><Icon name="info" size={14} color="var(--text-tertiary)" /></Tooltip></div>
          <div className="osd-card__body">
            <div className="osd-hbars">
              {ONCHAIN.map((c) => (
                <div className="osd-hbar__row" key={c.name}>
                  <div className="osd-hbar__top"><b>{c.name}</b><span>{c.value}</span></div>
                  <div className="osd-hbar__track"><div className="osd-hbar__fill" style={{ width: `${c.pct}%`, background: 'var(--orange-500)' }}></div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <p className="osd-an__lbl" style={{ marginTop: 0 }}>Report templates</p>
        <div className="osd-rep__grid" style={{ marginTop: 10 }}>
          {REPORTS.map((r) => (
            <button key={r.name} type="button" className="osd-rep__card">
              <span className="osd-rep__ic"><Icon name={r.icon} size={18} /></span>
              <span className="osd-rep__tag">{r.tag}</span>
              <b>{r.name}</b><p>{r.desc}</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-caption-size)', color: 'var(--action-primary)', fontWeight: 500, marginTop: 2 }}>Run report <Icon name="arrow-right" size={13} /></span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="osd-an__lbl">Pinned from Intelligence</p>
        <div className="osd-seglist" style={{ marginTop: 10 }}>
          {PINNED.map(([n, m]) => (
            <div className="osd-seglist__row" key={n}>
              <span className="osd-seglist__ic"><Icon name="pin" size={15} /></span>
              <span className="osd-seglist__meta"><b>{n}</b><span>{m}</span></span>
              <span style={{ marginLeft: 'auto', display: 'flex' }}><Icon name="chevron-right" size={16} color="var(--text-tertiary)" /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
