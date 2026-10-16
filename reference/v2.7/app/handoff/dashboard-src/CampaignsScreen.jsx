import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';
import { CampaignWizard } from './CampaignWizard.jsx';

const css = `
.osd-camp{max-width:1560px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-6);font-family:var(--font-sans);}
.osd-camp__head{display:flex;align-items:center;gap:16px;}
.osd-camp__title h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-camp__strip{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:grid;grid-template-columns:repeat(4,1fr);}
.osd-camp__stat{padding:18px 24px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--border-subtle);}
.osd-camp__stat:last-child{border-right:none;}
.osd-camp__stat b{font-size:var(--text-numeric-m-size,24px);font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1.2;}
.osd-camp__stat b small{font-size:14px;font-weight:500;color:var(--text-tertiary);}
.osd-camp__stat span{font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-camp__stat em{font-style:normal;font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-camp__track{height:4px;border-radius:var(--radius-sm);background:var(--surface-subtle);margin-top:8px;overflow:hidden;max-width:180px;}
.osd-upc{display:flex;flex-direction:column;gap:10px;}
.osd-upc__label{font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);}
.osd-upc__row{display:flex;gap:12px;}
.osd-upc__card{display:flex;align-items:center;gap:14px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:12px 16px 12px 12px;min-width:300px;}
.osd-upc__date{width:46px;height:46px;border-radius:var(--radius-sm);background:var(--bg-selected);color:var(--action-primary);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1;flex-shrink:0;}
.osd-upc__date b{font-size:16px;font-weight:600;}
.osd-upc__date span{font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;}
.osd-upc__meta{display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-upc__meta b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.osd-upc__meta span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-camp__toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;}
.osd-camp__search{display:flex;align-items:center;gap:10px;width:300px;height:36px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 12px;box-sizing:border-box;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-camp__search:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-camp__search input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);min-width:0;}
.osd-camp__search input::placeholder{color:var(--text-tertiary);}
.osd-camp__dd{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 14px;border-radius:var(--radius-md);border:1px solid var(--border-default);background:var(--bg-surface);font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);cursor:pointer;}
.osd-camp__dd:hover{background:var(--surface-hover);}
.osd-camp__tablecard{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden;}
.osd-camp__table{width:100%;border-collapse:collapse;font-size:var(--text-body-s-size);}
.osd-camp__table th{text-align:left;padding:12px 20px;font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);border-bottom:1px solid var(--border-default);white-space:nowrap;}
.osd-camp__table td{padding:0 20px;height:56px;color:var(--text-primary);border-bottom:1px solid var(--border-subtle);}
.osd-camp__table tbody tr:last-child td{border-bottom:none;}
.osd-camp__table tbody tr{cursor:pointer;}
.osd-camp__table tbody tr:hover{background:var(--surface-hover);}
.osd-camp__table .num{text-align:right;font-variant-numeric:tabular-nums;}
.osd-camp__namecell{display:flex;flex-direction:column;gap:2px;}
.osd-camp__namecell b{font-weight:500;color:var(--text-primary);}
.osd-camp__namecell span{font-size:var(--text-caption-size);color:var(--text-tertiary);display:flex;align-items:center;gap:5px;}
.osd-camp__rate{display:inline-flex;flex-direction:column;align-items:flex-end;gap:4px;}
.osd-camp__ratebar{width:56px;height:3px;border-radius:2px;background:var(--surface-subtle);overflow:hidden;}
.osd-camp__ratebar i{display:block;height:100%;background:var(--action-primary);border-radius:2px;}
.osd-camp__more{opacity:0;transition:opacity var(--duration-fast) var(--ease-standard);}
.osd-camp__table tbody tr:hover .osd-camp__more{opacity:1;}
.osd-camp__empty{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:88px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.osd-camp__empty__icn{width:48px;height:48px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-camp__empty h2{margin:4px 0 0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-camp__empty p{margin:0 0 16px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:460px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-camp-css')) {
  const s = document.createElement('style'); s.id = 'osd-camp-css'; s.textContent = css; document.head.appendChild(s);
}

const ROWS = [
  { name: 'Vault77 is LIVE', chan: 'Email', status: 'success', statusLabel: 'Sent', rcpt: '4,102', open: 51.2, click: 14.6, when: 'Jul 22, 3:30 PM' },
  { name: 'Pack drop — Season 2', chan: 'Email + push', status: 'info', statusLabel: 'Scheduled', rcpt: '1,546', open: null, click: null, when: 'Jul 24, 9:00 AM' },
  { name: 'Hammer earners weekly digest', chan: 'Email', status: 'success', statusLabel: 'Sent', rcpt: '2,873', open: 44.8, click: 11.2, when: 'Jul 21, 8:00 AM' },
  { name: 'Dormant vault re-activation', chan: 'Email', status: 'info', statusLabel: 'Scheduled', rcpt: '978', open: null, click: null, when: 'Jul 27, 10:00 AM' },
  { name: 'Whale unstake follow-up', chan: 'Push', status: 'success', statusLabel: 'Sent', rcpt: '86', open: 62.8, click: 24.4, when: 'Jul 19, 2:12 PM' },
  { name: 'Gas rebate week', chan: 'Email + push', status: 'warning', statusLabel: 'Paused', rcpt: '3,204', open: 35.1, click: 8.2, when: 'Jul 15, 9:00 AM' },
  { name: 'Season 2 teaser', chan: 'Email', status: 'neutral', statusLabel: 'Draft', rcpt: '—', open: null, click: null, when: 'Edited 2d ago' },
];
const UPCOMING = [
  { d: '24', mo: 'Jul', name: 'Pack drop — Season 2', sub: '9:00 AM · Email + push · 1,546 recipients' },
  { d: '27', mo: 'Jul', name: 'Dormant vault re-activation', sub: '10:00 AM · Email · 978 recipients' },
];
const FILTERS = [
  { id: 'all', label: 'All', count: 7 }, { id: 'sent', label: 'Sent', count: 3 }, { id: 'sched', label: 'Scheduled', count: 2 },
  { id: 'draft', label: 'Draft', count: 1 }, { id: 'paused', label: 'Paused', count: 1 },
];
const MATCH = { sent: 'Sent', sched: 'Scheduled', draft: 'Draft', paused: 'Paused' };

/** Campaigns section v2 — calendar & library views retired: scheduled sends live in the
    Upcoming strip, templates are chosen inside the wizard. `filled` toggles empty/populated. */
export function CampaignsScreen({ filled = false, seed, onSeedConsumed }) {
  const [mode, setMode] = React.useState('list');
  const [wizLayout, setWizLayout] = React.useState('rail');
  const [filter, setFilter] = React.useState('all');
  const [seedState, setSeedState] = React.useState(null);
  React.useEffect(() => {
    if (seed) { setSeedState(seed); setMode('wizard'); if (onSeedConsumed) onSeedConsumed(); }
  }, [seed]);
  const rows = filter === 'all' ? ROWS : ROWS.filter((r) => r.statusLabel === MATCH[filter]);
  if (mode === 'wizard') {
    return (
      <>
        <CampaignWizard layout={wizLayout} initialSegments={seedState ? seedState.segments : undefined} initialName={seedState ? seedState.name : undefined} onExit={() => { setMode('list'); setSeedState(null); }} />
        <div style={{ position: 'fixed', bottom: 64, right: 18, zIndex: 100, display: 'flex', background: 'var(--bg-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--elevation-2)', overflow: 'hidden', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500 }}>
          {[['rail', 'Rail + summary'], ['centered', 'Focused']].map(([id, l]) => (
            <button key={id} type="button" onClick={() => setWizLayout(id)} style={{ border: 'none', cursor: 'pointer', padding: '8px 14px', background: wizLayout === id ? 'var(--bg-selected)' : 'transparent', color: wizLayout === id ? 'var(--action-primary)' : 'var(--text-secondary)', font: 'inherit' }}>{l}</button>
          ))}
        </div>
      </>
    );
  }
  return (
    <div className="osd-camp" data-screen-label="Campaigns · list">
      <div className="osd-camp__head">
        <div className="osd-camp__title"><h1>Campaigns</h1></div>
        <span style={{ flex: 1 }}></span>
        <Button icon="plus" size="l" onClick={() => setMode('wizard')}>Create campaign</Button>
      </div>
      {filled ? (
        <div className="osd-camp__strip">
          <div className="osd-camp__stat"><span>Messages sent · 30d</span><b>12,480</b><em>Email + in-app push</em></div>
          <div className="osd-camp__stat"><span>Open rate</span><b>42.3%</b><em>4,918 unique opens</em></div>
          <div className="osd-camp__stat"><span>Click rate</span><b>11.8%</b><em>1,371 unique clicks</em></div>
          <div className="osd-camp__stat">
            <span>Monthly allowance</span><b>312 <small>/ 500</small></b>
            <span className="osd-camp__track"><i style={{ display: 'block', width: '62%', height: '100%', background: 'var(--orange-500)', borderRadius: 2 }}></i></span>
          </div>
        </div>
      ) : null}
      {filled ? (
        <div className="osd-upc">
          <span className="osd-upc__label">Upcoming</span>
          <div className="osd-upc__row">
            {UPCOMING.map((u) => (
              <div className="osd-upc__card" key={u.name}>
                <span className="osd-upc__date"><b>{u.d}</b><span>{u.mo}</span></span>
                <span className="osd-upc__meta"><b>{u.name}</b><span>{u.sub}</span></span>
                <span style={{ marginLeft: 'auto', display: 'flex' }}><Icon name="chevron-right" size={16} color="var(--text-tertiary)" /></span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {filled ? (
        <div className="osd-camp__toolbar">
          <div className="osd-camp__search">
            <Icon name="search" size={18} color="var(--text-tertiary)" />
            <input placeholder="Search campaigns…" aria-label="Search campaigns" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {FILTERS.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label} · {f.count}</Chip>
            ))}
          </div>
          <span style={{ flex: 1 }}></span>
          <button type="button" className="osd-camp__dd">Last 30 days<Icon name="chevron-down" size={16} color="var(--text-tertiary)" /></button>
        </div>
      ) : null}
      {filled ? (
        <div className="osd-camp__tablecard">
          <table className="osd-camp__table">
            <thead><tr><th>Campaign</th><th>Status</th><th className="num">Recipients</th><th className="num">Open rate</th><th className="num">Click rate</th><th className="num">Sent / scheduled</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td><span className="osd-camp__namecell"><b>{r.name}</b><span><Icon name={r.chan.includes('push') || r.chan === 'Push' ? 'smartphone' : 'mail'} size={12} />{r.chan}</span></span></td>
                  <td><Badge status={r.status}>{r.statusLabel}</Badge></td>
                  <td className="num">{r.rcpt}</td>
                  <td className="num">{r.open == null ? '—' : (
                    <span className="osd-camp__rate">{r.open.toFixed(1)}%<span className="osd-camp__ratebar"><i style={{ width: `${Math.min(r.open, 100)}%` }}></i></span></span>
                  )}</td>
                  <td className="num">{r.click == null ? '—' : `${r.click.toFixed(1)}%`}</td>
                  <td className="num" style={{ color: 'var(--text-secondary)' }}>{r.when}</td>
                  <td className="num"><span className="osd-camp__more"><Icon name="ellipsis" size={16} color="var(--text-tertiary)" /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="osd-camp__empty">
          <span className="osd-camp__empty__icn"><Icon name="megaphone" size={24} strokeWidth={1.5} /></span>
          <h2>Send your first campaign</h2>
          <p>Reach your wallets by email or in-app push. Your first send takes about two minutes — pick an audience, write the message, review, go.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button icon="plus" size="l" onClick={() => setMode('wizard')}>Create campaign</Button>
            <Button variant="secondary" size="l" onClick={() => setMode('wizard')}>Start from template</Button>
          </div>
        </div>
      )}
    </div>
  );
}
