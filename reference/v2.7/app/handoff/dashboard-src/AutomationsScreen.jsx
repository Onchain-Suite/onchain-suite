import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';
import { Switch } from '../../components/forms/Switch.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { TemplateEditor } from './TemplateEditor.jsx';

const css = `
.osd-auto{max-width:1560px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-6);font-family:var(--font-sans);}
.osd-auto__head{display:flex;align-items:center;gap:16px;}
.osd-auto__head h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-auto__strip{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:grid;grid-template-columns:repeat(4,1fr);}
.osd-auto__stat{padding:18px 24px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--border-subtle);}
.osd-auto__stat:last-child{border-right:none;}
.osd-auto__stat b{font-size:24px;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1.2;}
.osd-auto__stat span{font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-auto__toolbar{display:flex;gap:12px;align-items:center;}
.osd-auto__search{display:flex;align-items:center;gap:10px;width:280px;height:34px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 12px;box-sizing:border-box;}
.osd-auto__search:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-auto__search input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);min-width:0;}
.osd-auto__search input::placeholder{color:var(--text-tertiary);}
.osd-auto__tablecard{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden;}
.osd-auto__table{width:100%;border-collapse:collapse;font-size:var(--text-body-s-size);}
.osd-auto__table th{text-align:left;padding:12px 20px;font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-secondary);border-bottom:1px solid var(--border-default);white-space:nowrap;}
.osd-auto__table td{padding:0 20px;height:60px;color:var(--text-primary);border-bottom:1px solid var(--border-subtle);}
.osd-auto__table tbody tr:last-child td{border-bottom:none;}
.osd-auto__table tbody tr{cursor:pointer;}
.osd-auto__table tbody tr:hover{background:var(--surface-hover);}
.osd-auto__table .num{text-align:right;font-variant-numeric:tabular-nums;}
.osd-auto__name{display:flex;flex-direction:column;gap:2px;}
.osd-auto__name b{font-weight:500;}
.osd-auto__name span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-auto__empty{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:88px 40px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.osd-auto__empty__icn{width:48px;height:48px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.osd-auto__empty h2{margin:4px 0 0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-auto__empty p{margin:0 0 16px;font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:480px;}
.osd-rcp{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-4);max-width:900px;}
.osd-rcp__card{display:flex;gap:14px;align-items:flex-start;padding:18px;border:1px solid var(--border-default);border-radius:var(--radius-lg);background:var(--bg-surface);cursor:pointer;text-align:left;font-family:inherit;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-rcp__card:hover{border-color:var(--border-strong);box-shadow:var(--elevation-1);}
.osd-rcp__icn{width:38px;height:38px;border-radius:var(--radius-md);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-rcp__icn--scratch{background:var(--surface-subtle);color:var(--text-secondary);}
.osd-rcp__txt{display:flex;flex-direction:column;gap:3px;}
.osd-rcp__txt b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-rcp__txt span{font-size:var(--text-caption-size);color:var(--text-secondary);line-height:1.45;}
.osd-flow__bar{display:flex;align-items:center;gap:12px;padding:6px 0 0;flex-wrap:wrap;}
.osd-flow__back{display:inline-flex;align-items:center;gap:8px;border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:8px 10px;margin-left:-10px;border-radius:var(--radius-md);}
.osd-flow__back:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-flow__name{border:1px solid transparent;background:transparent;font-family:inherit;font-size:17px;font-weight:600;color:var(--text-primary);padding:6px 10px;border-radius:var(--radius-md);width:240px;outline:none;}
.osd-flow__name:hover{background:var(--surface-hover);}
.osd-flow__name:focus{border-color:var(--border-focus);background:var(--bg-surface);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-flow__meta{font-size:var(--text-caption-size);color:var(--text-tertiary);font-variant-numeric:tabular-nums;}
.osd-flow__warn{display:inline-flex;align-items:center;gap:7px;font-size:var(--text-caption-size);color:var(--orange-700);background:var(--orange-100);border-radius:99px;padding:4px 12px;}
.osd-flow__seg{display:inline-flex;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:3px;gap:2px;}
.osd-flow__seg button{border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:6px 16px;border-radius:var(--radius-sm);cursor:pointer;}
.osd-flow__seg button.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:var(--elevation-1);}
.osd-flow__grid{display:grid;grid-template-columns:248px minmax(0,1fr) 292px;gap:var(--space-4);align-items:start;}
.osd-pal{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:flex;flex-direction:column;max-height:640px;position:sticky;top:8px;}
.osd-pal__search{display:flex;align-items:center;gap:8px;margin:12px;height:32px;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:0 10px;}
.osd-pal__search input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-caption-size);color:var(--text-primary);min-width:0;}
.osd-pal__body{flex:1;overflow-y:auto;padding:0 12px 12px;display:flex;flex-direction:column;gap:4px;}
.osd-pal__lbl{font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:var(--text-tertiary);padding:10px 4px 4px;}
.osd-pal__item{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);background:var(--bg-surface);cursor:pointer;text-align:left;font-family:inherit;transition:border-color var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard);}
.osd-pal__item:hover{border-color:var(--action-primary);background:var(--bg-selected);}
.osd-pal__item[disabled]{opacity:0.5;cursor:not-allowed;}
.osd-pal__icn{width:28px;height:28px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--surface-subtle);color:var(--text-secondary);}
.osd-pal__item--trigger .osd-pal__icn{background:var(--orange-100);color:var(--orange-700);}
.osd-pal__txt{display:flex;flex-direction:column;gap:0;min-width:0;}
.osd-pal__txt b{font-size:12.5px;font-weight:600;color:var(--text-primary);}
.osd-pal__txt span{font-size:11px;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.osd-flow__canvas{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:40px 24px 48px;display:flex;flex-direction:column;align-items:center;background-image:radial-gradient(var(--border-subtle) 1px,transparent 1px);background-size:18px 18px;min-height:520px;}
.osd-node{width:100%;max-width:340px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);box-shadow:var(--elevation-1);cursor:pointer;box-sizing:border-box;position:relative;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-node:hover{border-color:var(--border-strong);}
.osd-node.on{border-color:var(--action-primary);box-shadow:var(--elevation-2);}
.osd-node__head{display:flex;align-items:center;gap:10px;padding:12px 14px;}
.osd-node__icn{width:30px;height:30px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--bg-selected);color:var(--action-primary);}
.osd-node__icn--trigger{background:var(--orange-100);color:var(--orange-700);}
.osd-node__txt{display:flex;flex-direction:column;gap:1px;min-width:0;}
.osd-node__txt i{font-style:normal;font-size:10px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;color:var(--text-tertiary);}
.osd-node__txt b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-node__txt span{font-size:var(--text-caption-size);color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.osd-node__pip{position:absolute;top:-5px;right:-5px;width:12px;height:12px;border-radius:99px;background:var(--orange-500);border:2px solid var(--bg-surface);}
.osd-flow__wire{width:1.5px;height:24px;background:var(--border-strong);}
.osd-flow__plus{width:22px;height:22px;border-radius:99px;border:1.5px solid var(--border-strong);background:var(--bg-surface);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;margin:-3px 0;z-index:1;}
.osd-flow__plus:hover,.osd-flow__plus.on{border-color:var(--action-primary);color:var(--action-primary);background:var(--bg-selected);}
.osd-flow__picker{display:flex;gap:4px;background:var(--bg-raised,var(--bg-surface));border:1px solid var(--border-default);border-radius:var(--radius-md);box-shadow:var(--elevation-2);padding:6px;margin:8px 0;z-index:2;flex-wrap:wrap;justify-content:center;max-width:340px;}
.osd-flow__pick{display:flex;flex-direction:column;align-items:center;gap:4px;border:none;background:none;font-family:inherit;font-size:11px;font-weight:500;color:var(--text-secondary);padding:8px 10px;border-radius:var(--radius-sm);cursor:pointer;}
.osd-flow__pick:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-flow__end{font-size:var(--text-caption-size);color:var(--text-tertiary);border:1px dashed var(--border-strong);border-radius:99px;padding:5px 14px;background:var(--bg-surface);}
.osd-flow__panel{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:20px 22px;display:flex;flex-direction:column;gap:16px;position:sticky;top:8px;}
.osd-flow__panel h3{margin:0;font-size:var(--text-heading-s-size,16px);font-weight:600;color:var(--text-primary);}
.osd-flow__panel .hint{margin:0;font-size:var(--text-caption-size);color:var(--text-tertiary);line-height:1.5;}
.osd-flow__panelrow{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:var(--text-body-s-size);color:var(--text-primary);}
.osd-br{width:100%;max-width:560px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;position:relative;padding-top:24px;}
.osd-br::before{content:'';position:absolute;top:0;left:25%;right:25%;height:1.5px;background:var(--border-strong);}
.osd-br__col{display:flex;flex-direction:column;align-items:center;position:relative;}
.osd-br__col::before{content:'';position:absolute;top:-24px;height:24px;width:1.5px;background:var(--border-strong);}
.osd-br__lbl{font-size:11px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:var(--text-tertiary);background:var(--surface-subtle);border-radius:99px;padding:3px 12px;margin-bottom:12px;}
.osd-br__add{display:flex;align-items:center;gap:6px;border:1.5px dashed var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:10px 14px;font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--text-tertiary);cursor:pointer;width:100%;justify-content:center;}
.osd-br__add:hover{border-color:var(--action-primary);color:var(--action-primary);background:var(--bg-selected);}
.osd-txtin{height:36px;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:0 12px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;width:100%;}
.osd-txtin:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-stats__ph{border:1.5px dashed var(--border-default);border-radius:var(--radius-md);padding:44px 24px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;}
.osd-stats__ph b{font-size:var(--text-body-m-size);font-weight:600;color:var(--text-primary);}
.osd-stats__ph span{font-size:var(--text-caption-size);color:var(--text-tertiary);max-width:320px;line-height:1.5;}
.osd-stats__card{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:20px 22px;display:flex;flex-direction:column;gap:14px;}
.osd-stats__card h3{margin:0;font-size:var(--text-heading-s-size,16px);font-weight:600;color:var(--text-primary);}
.osd-bars{display:flex;align-items:flex-end;gap:6px;height:120px;}
.osd-bars i{flex:1;background:var(--bg-selected);border-radius:3px 3px 0 0;position:relative;}
.osd-bars i::after{content:'';position:absolute;inset:auto 0 0 0;height:38%;background:var(--action-primary);border-radius:3px 3px 0 0;opacity:0.85;}
.osd-trig-or{font-size:10px;font-weight:700;letter-spacing:0.6px;color:var(--text-tertiary);background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:99px;padding:2px 11px;}
.osd-node__rm{position:absolute;top:8px;right:8px;width:22px;height:22px;border:none;background:none;border-radius:var(--radius-sm);color:var(--text-tertiary);display:flex;align-items:center;justify-content:center;cursor:pointer;}
.osd-node__rm:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-trig-add{display:flex;align-items:center;gap:6px;border:1.5px dashed var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:8px 14px;font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--text-tertiary);cursor:pointer;}
.osd-trig-add:hover{border-color:var(--action-primary);color:var(--action-primary);background:var(--bg-selected);}
.osd-pb{position:fixed;inset:0;z-index:220;background:var(--bg-page);display:flex;flex-direction:column;font-family:var(--font-sans);}
.osd-pb__top{height:56px;display:flex;align-items:center;gap:12px;padding:0 16px;background:var(--bg-surface);border-bottom:1px solid var(--border-default);flex-shrink:0;}
.osd-pb__back{display:inline-flex;align-items:center;gap:8px;border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:8px 10px;border-radius:var(--radius-md);}
.osd-pb__back:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-pb__body{flex:1;overflow-y:auto;padding:40px;display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:44px;max-width:1000px;margin:0 auto;width:100%;box-sizing:border-box;}
.osd-pb__fields{display:flex;flex-direction:column;gap:18px;}
.osd-pb__f{display:flex;flex-direction:column;gap:6px;}
.osd-pb__f>span{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);}
.osd-pb__f .hint{font-size:var(--text-caption-size);color:var(--text-tertiary);margin:0;}
.osd-pb__in{height:38px;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:0 12px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;}
.osd-pb__in:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
textarea.osd-pb__in{height:auto;min-height:82px;padding:10px 12px;resize:vertical;line-height:1.5;}
.osd-pb__phone{border-radius:var(--radius-lg);background:var(--surface-subtle);padding:44px 22px;display:flex;justify-content:center;}
.osd-pb__note{width:100%;max-width:320px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:14px;box-shadow:var(--elevation-2);padding:12px 14px;display:flex;gap:10px;align-items:flex-start;}
.osd-pb__app{width:34px;height:34px;border-radius:8px;background:var(--action-primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-pb__nt{display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-pb__nt b{font-size:13px;font-weight:600;color:var(--text-primary);}
.osd-pb__nt span{font-size:12px;color:var(--text-secondary);line-height:1.4;}
.osd-pb__time{margin-left:auto;font-size:10px;color:var(--text-tertiary);flex-shrink:0;}
`;
if (typeof document !== 'undefined') {
  const prev = document.getElementById('osd-auto-css');
  if (prev) prev.remove();
  const s = document.createElement('style'); s.id = 'osd-auto-css'; s.textContent = css; document.head.appendChild(s);
}

const STEP_META = {
  wait: { icon: 'clock', kind: 'Wait', title: 'Wait', sub: 'Pause before the next step' },
  email: { icon: 'mail', kind: 'Send email', title: 'Send email', sub: 'Email or reusable template' },
  push: { icon: 'smartphone', kind: 'Send in-app', title: 'Send in-app push', sub: 'Notification in your app' },
  tag: { icon: 'tag', kind: 'Add tag', title: 'Add tag', sub: 'Attach a tag to the contact' },
  webhook: { icon: 'webhook', kind: 'Webhook', title: 'Webhook', sub: 'Call an external URL with context' },
  campaign: { icon: 'megaphone', kind: 'Dispatch campaign', title: 'Dispatch campaign', sub: 'Trigger an existing campaign' },
  list: { icon: 'list-plus', kind: 'Add to list', title: 'Add to list', sub: 'Add the contact to a list' },
  branch: { icon: 'split', kind: 'Branch', title: 'Branch', sub: 'Split the flow on a condition' },
};
const TRIGGERS_ON = [
  { icon: 'zap', name: 'On-chain event', desc: 'Wallet interacts with a contract' },
  { icon: 'gem', name: 'Holder acquired', desc: 'New wallet mints or buys in' },
  { icon: 'repeat', name: 'Swap completed', desc: 'DEX trade or token exchange' },
  { icon: 'droplets', name: 'Liquidity added', desc: 'Deposits into your pools' },
  { icon: 'trending-down', name: 'Capital withdrawn', desc: 'Burns, unstakes, or withdraws' },
  { icon: 'file-check', name: 'Approval intent', desc: 'Approves a contract to spend' },
];
const TRIGGERS_OFF = [
  { icon: 'clipboard-list', name: 'Form submitted', desc: 'Wallet completes a capture form' },
  { icon: 'list', name: 'Joined a list', desc: 'Wallet is added to a list' },
  { icon: 'users', name: 'Segment entered', desc: 'Wallet joins a saved segment' },
  { icon: 'mail-open', name: 'Email opened', desc: 'Contact opens a previous email' },
  { icon: 'mouse-pointer-click', name: 'Email clicked', desc: 'Clicks a link in an email' },
  { icon: 'bell', name: 'Push viewed', desc: 'Views an in-app notification' },
  { icon: 'tag', name: 'Tag added', desc: 'A tag lands on the contact' },
  { icon: 'heart-pulse', name: 'Health threshold', desc: 'Contact score crosses a level' },
  { icon: 'moon', name: 'Goes dormant', desc: 'No activity for 30 days' },
];
const ACTIONS = [
  { type: 'email', icon: 'mail', name: 'Send email', desc: 'Email or reusable template' },
  { type: 'push', icon: 'smartphone', name: 'Send in-app', desc: 'Push to the matched wallet' },
  { type: 'wait', icon: 'clock', name: 'Wait', desc: 'Pause the flow for a duration' },
  { type: 'branch', icon: 'split', name: 'Branch', desc: 'Split paths on a condition' },
  { type: 'tag', icon: 'tag', name: 'Add tag', desc: 'Attach a tag to the contact' },
  { type: 'list', icon: 'list-plus', name: 'Add to list', desc: 'Add the contact to a list' },
  { type: 'webhook', icon: 'webhook', name: 'Webhook', desc: 'Call an external URL' },
  { type: 'campaign', icon: 'megaphone', name: 'Dispatch campaign', desc: 'Fire an existing campaign' },
];
const RECIPES = [
  { id: 'scratch', icon: 'plus', scratch: true, name: 'Start from scratch', desc: 'Pick a trigger and build the flow step by step.' },
  { id: 'welcome', icon: 'hand', name: 'Welcome new wallets', desc: 'First connect → wait 1h → welcome email.', trigger: 'Holder acquired', steps: [{ type: 'wait', label: 'Wait 1 hour' }, { type: 'email', label: 'Email · “Welcome to Vault77”' }] },
  { id: 'winback', icon: 'rotate-ccw', name: 'Win back dormant wallets', desc: 'Inactive 30d → email → wait 3d → follow-up push.', trigger: 'Goes dormant', steps: [{ type: 'email', label: 'Email · “We miss you”' }, { type: 'wait', label: 'Wait 3 days' }, { type: 'push', label: 'Push · “Your Hammers are waiting”' }] },
  { id: 'whale', icon: 'trending-down', name: 'Whale unstake alert', desc: 'Whale unstakes → instant push → wait 1d → retention email.', trigger: 'On-chain event · unstake > 10 ETH', steps: [{ type: 'push', label: 'Push · “Before you go…”' }, { type: 'wait', label: 'Wait 1 day' }, { type: 'email', label: 'Email · “Better staking terms”' }] },
];
const ROWS = [
  { id: 'welcome', name: 'Welcome new wallets', trigger: 'Holder acquired', steps: ['zap', 'clock', 'mail'], status: 'success', statusLabel: 'Active', enrolled: '1,204', completed: '38.2%', conv: '460', last: '12 min ago' },
  { id: 'whale', name: 'Whale unstake alert', trigger: 'On-chain event · unstake > 10 ETH', steps: ['zap', 'smartphone', 'clock', 'mail'], status: 'success', statusLabel: 'Active', enrolled: '86', completed: '61.6%', conv: '53', last: '2h ago' },
  { id: 'winback', name: 'Dormant 30d win-back', trigger: 'Goes dormant', steps: ['zap', 'mail', 'clock', 'smartphone'], status: 'warning', statusLabel: 'Paused', enrolled: '978', completed: '12.4%', conv: '121', last: '6d ago' },
  { id: 'postbuy', name: 'Post-purchase pack tips', trigger: 'On-chain event · buys a pack', steps: ['zap', 'clock', 'smartphone'], status: 'neutral', statusLabel: 'Draft', enrolled: '—', completed: '—', conv: '—', last: '—' },
];
const ENTRIES = [
  { w: 'vitalik.eth', status: 'Completed', path: 'Email → bought a pack', t: '14 min ago' },
  { w: '0x3F4a…8a21', status: 'In flow', path: 'Waiting · 1 hour', t: '38 min ago' },
  { w: 'nftmaxi.eth', status: 'Completed', path: 'Email → bought a pack', t: '2h ago' },
  { w: '0x91Cb…4e07', status: 'Exited', path: 'Unsubscribed', t: '5h ago' },
];
let nextId = 1;

/** In-app push composer — mirrors the campaign push builder so automation push steps
    get the same title / message / deep-link editor with a live device preview. */
function PushBuilder({ name, onClose }) {
  const [title, setTitle] = React.useState(name && name !== 'Send in-app push' ? name : 'Season 2 packs are live');
  const [body, setBody] = React.useState('Collect Packs, earn Hammers, and take your shot at cracking the vault.');
  const [link, setLink] = React.useState('vault77://season-2');
  return (
    <div className="osd-pb" data-screen-label="Push builder">
      <div className="osd-pb__top">
        <button type="button" className="osd-pb__back" onClick={onClose}><Icon name="arrow-left" size={16} />Back to flow</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }}></span>
        <span style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>In-app push builder</span>
        <span style={{ flex: 1 }}></span>
        <Button size="s" icon="check" onClick={onClose}>Save push</Button>
      </div>
      <div className="osd-pb__body">
        <div className="osd-pb__fields">
          <div className="osd-pb__f"><span>Title</span><input className="osd-pb__in" value={title} onChange={(e) => setTitle(e.target.value)} /><p className="hint">Keep it under 48 characters — longer titles clip on the lock screen.</p></div>
          <div className="osd-pb__f"><span>Message</span><textarea className="osd-pb__in" value={body} onChange={(e) => setBody(e.target.value)}></textarea></div>
          <div className="osd-pb__f"><span>Deep link</span><input className="osd-pb__in" value={link} onChange={(e) => setLink(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} /><p className="hint">Where the app opens when the push is tapped.</p></div>
        </div>
        <div>
          <span style={{ display: 'block', fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>Preview</span>
          <div className="osd-pb__phone">
            <div className="osd-pb__note">
              <span className="osd-pb__app">V77</span>
              <span className="osd-pb__nt"><b>{title || 'Notification title'}</b><span>{body || 'Notification message'}</span></span>
              <span className="osd-pb__time">now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Automations — palette · canvas · properties builder with Builder/Stats views,
    recipes, validation, live-lock, and on-chain conversion tracking. */
export function AutomationsScreen({ filled = true }) {
  const [mode, setMode] = React.useState('list');
  const [view, setView] = React.useState('builder');
  const [name, setName] = React.useState('Untitled automation');
  const [triggers, setTriggers] = React.useState([]);
  const [steps, setSteps] = React.useState([]);
  const [active, setActive] = React.useState(false);
  const [sel, setSel] = React.useState(null);
  const [pickerAt, setPickerAt] = React.useState(null);
  const [palQ, setPalQ] = React.useState('');
  const [row, setRow] = React.useState(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [pushEditor, setPushEditor] = React.useState(null);
  const locked = active;

  const openRecipe = (r, asRow) => {
    if (r.scratch) { setName('Untitled automation'); setTriggers([]); setSteps([]); setSel(null); }
    else {
      const tid = 't' + nextId++;
      setName(asRow ? asRow.name : r.name); setTriggers([{ id: tid, label: r.trigger, configured: true }]);
      setSteps(r.steps.map((s) => ({ id: 'n' + nextId++, type: s.type, label: s.label, configured: true })));
      setSel('trig:' + tid);
    }
    setRow(asRow || null); setActive(asRow ? asRow.statusLabel === 'Active' : false);
    setView(asRow && asRow.statusLabel === 'Active' ? 'stats' : 'builder');
    setPickerAt(null); setMode('builder');
  };
  const openRow = (r) => openRecipe(RECIPES.find((x) => x.id === r.id) || RECIPES[1], r);
  const insertStep = (idx, type) => {
    const node = type === 'branch'
      ? { id: 'n' + nextId++, type: 'branch', label: 'Branch', configured: false, cond: 'Has a linked email', paths: { yes: { act: null }, no: { act: null } } }
      : { id: 'n' + nextId++, type, label: STEP_META[type].title, configured: false };
    setSteps((v) => [...v.slice(0, idx), node, ...v.slice(idx)]);
    setSel(node.id); setPickerAt(null); setView('builder');
  };
  const setPathAct = (branchId, path, type) => {
    const act = { id: 'n' + nextId++, type, label: STEP_META[type].title, configured: false };
    setSteps((v) => v.map((s) => (s.id === branchId ? { ...s, paths: { ...s.paths, [path]: { act } } } : s)));
    setSel(`${branchId}::${path}`); setPickerAt(null);
  };
  const clearPathAct = (branchId, path) => { setSteps((v) => v.map((s) => (s.id === branchId ? { ...s, paths: { ...s.paths, [path]: { act: null } } } : s))); setSel(null); };
  const setTriggerFromPal = (t) => { if (locked || triggers.length >= 3 || triggers.some((x) => x.label === t.name)) return; const id = 't' + nextId++; setTriggers((v) => [...v, { id, label: t.name, configured: false }]); setSel('trig:' + id); setPickerAt(null); };
  const editTrigger = (id, patch) => setTriggers((v) => v.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTrigger = (id) => { setTriggers((v) => v.filter((t) => t.id !== id)); setSel(null); };
  const removeStep = (id) => { setSteps((v) => v.filter((s) => s.id !== id)); setSel(null); };
  const findNode = (id) => {
    if (!id || id === 'trigger' || id.startsWith('trig:')) return null;
    if (id.includes('::')) { const [bid2, p] = id.split('::'); const b = steps.find((s) => s.id === bid2); return b && b.paths[p].act ? { node: b.paths[p].act, branchId: bid2, path: p } : null; }
    const s = steps.find((x) => x.id === id); return s ? { node: s } : null;
  };
  const configure = (id) => {
    if (id === 'trigger') return;
    if (id.startsWith('trig:')) { const tid = id.slice(5); setTriggers((v) => v.map((t) => (t.id === tid ? { ...t, configured: true } : t))); return; }
    if (id.includes('::')) { const [bid2, p] = id.split('::'); setSteps((v) => v.map((s) => (s.id === bid2 ? { ...s, paths: { ...s.paths, [p]: { act: { ...s.paths[p].act, configured: true } } } } : s))); return; }
    setSteps((v) => v.map((s) => (s.id === id ? { ...s, configured: true } : s)));
  };
  const stepNodes = [];
  steps.forEach((s) => { stepNodes.push(s); if (s.type === 'branch') { if (s.paths.yes.act) stepNodes.push(s.paths.yes.act); if (s.paths.no.act) stepNodes.push(s.paths.no.act); } });
  const hasBranch = steps.some((s) => s.type === 'branch');
  const unconfigured = triggers.filter((t) => !t.configured).length + stepNodes.filter((s) => !s.configured).length;
  const valid = triggers.length > 0 && unconfigured === 0 && steps.length > 0;
  React.useEffect(() => { if (!valid && active) setActive(false); }, [valid, active]);
  const q = palQ.toLowerCase();
  const trigOn = TRIGGERS_ON.filter((t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  const trigOff = TRIGGERS_OFF.filter((t) => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  const actList = ACTIONS.filter((a) => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q));

  if (mode === 'recipes') {
    return (
      <div className="osd-auto" data-screen-label="Automations · new">
        <div className="osd-flow__bar">
          <button type="button" className="osd-flow__back" onClick={() => setMode('list')}><Icon name="arrow-left" size={16} />Automations</button>
        </div>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: 'var(--text-heading-l-size)', fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>New automation</h1>
          <p style={{ margin: 0, fontSize: 'var(--text-body-m-size)', color: 'var(--text-secondary)' }}>Start from a proven recipe, or build your own from a trigger.</p>
        </div>
        <div className="osd-rcp">
          {RECIPES.map((r) => (
            <button key={r.id} type="button" className="osd-rcp__card" onClick={() => openRecipe(r)}>
              <span className={`osd-rcp__icn${r.scratch ? ' osd-rcp__icn--scratch' : ''}`}><Icon name={r.icon} size={18} /></span>
              <span className="osd-rcp__txt"><b>{r.name}</b><span>{r.desc}</span></span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'builder') {
    const isLive = row && active;
    const plus = (idx) => locked ? <span key={'p' + idx} className="osd-flow__wire" style={{ height: 48 }}></span> : (
      <React.Fragment key={'p' + idx}>
        <span className="osd-flow__wire"></span>
        <button type="button" className={`osd-flow__plus${pickerAt === idx ? ' on' : ''}`} aria-label="Add step" onClick={() => setPickerAt(pickerAt === idx ? null : idx)}><Icon name="plus" size={13} /></button>
        {pickerAt === idx ? (
          <div className="osd-flow__picker">
            {ACTIONS.map((a) => (
              <button key={a.type} type="button" className="osd-flow__pick" onClick={() => insertStep(idx, a.type)}><Icon name={a.icon} size={16} />{a.name}</button>
            ))}
          </div>
        ) : null}
        <span className="osd-flow__wire"></span>
      </React.Fragment>
    );
    const found = findNode(sel);
    const selStep = found && found.node.type !== 'branch' ? found.node : null;
    const selBranch = found && found.node.type === 'branch' ? found.node : null;
    const selTrig = sel && sel.startsWith('trig:') ? triggers.find((t) => 'trig:' + t.id === sel) : null;
    const nested = sel && sel.includes('::');
    return (
      <div className="osd-auto" data-screen-label={`Automations · ${view}`}>
        <div className="osd-flow__bar">
          <button type="button" className="osd-flow__back" onClick={() => setMode('list')}><Icon name="arrow-left" size={16} />Automations</button>
          <span style={{ width: 1, height: 20, background: 'var(--border-default)' }}></span>
          <input className="osd-flow__name" value={name} readOnly={locked} onChange={(e) => setName(e.target.value)} aria-label="Automation name" />
          {locked ? <span className="osd-flow__warn" style={{ background: 'var(--bg-selected)', color: 'var(--action-primary)' }}><Icon name="lock" size={13} />Live — pause to edit</span> : unconfigured > 0 ? <span className="osd-flow__warn"><Icon name="triangle-alert" size={13} />{unconfigured === 1 ? '1 step needs setup' : `${unconfigured} steps need setup`}</span> : steps.length > 0 ? <Badge status="success">Ready</Badge> : null}
          <span className="osd-flow__meta">{triggers.length + steps.length} nodes · {unconfigured} issues</span>
          <span style={{ flex: 1 }}></span>
          {row ? (
          <div className="osd-flow__seg">
            <button type="button" className={view === 'builder' ? 'on' : ''} onClick={() => setView('builder')}>Builder</button>
            <button type="button" className={view === 'stats' ? 'on' : ''} onClick={() => setView('stats')}>Stats</button>
          </div>
          ) : null}
          <Switch label={active ? 'Active' : 'Off'} checked={active} disabled={!valid} onChange={setActive} />
          <Button variant="secondary" size="s">Save draft</Button>
        </div>
        {view === 'stats' ? (
          <React.Fragment>
            <div className="osd-auto__strip">
              <div className="osd-auto__stat"><span>Entries · 30d</span><b>{isLive ? row.enrolled : '0'}</b></div>
              <div className="osd-auto__stat"><span>Completed</span><b>{isLive ? row.completed : '0%'}</b></div>
              <div className="osd-auto__stat"><span>On-chain conversions</span><b>{isLive ? row.conv : '0'}</b></div>
              <div className="osd-auto__stat"><span>Last triggered</span><b>{isLive ? row.last : '—'}</b></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: 'var(--space-4)' }}>
              <div className="osd-stats__card">
                <h3>Performance over time</h3>
                {isLive ? (
                  <div className="osd-bars">{[34, 48, 41, 62, 55, 71, 66, 80, 74, 90, 84, 96].map((h, i) => <i key={i} style={{ height: `${h}%` }}></i>)}</div>
                ) : (
                  <div className="osd-stats__ph"><b>No performance data yet</b><span>Entries and conversion trends appear here once the automation starts processing wallets.</span></div>
                )}
              </div>
              <div className="osd-stats__card">
                <h3>Recent entries</h3>
                {isLive ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {ENTRIES.map((e) => (
                      <div key={e.w + e.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 'var(--text-body-s-size)' }}>
                        <b style={{ fontFamily: e.w.startsWith('0x') ? 'var(--font-mono)' : 'inherit', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, width: 110, flexShrink: 0 }}>{e.w}</b>
                        <Badge status={e.status === 'Completed' ? 'success' : e.status === 'In flow' ? 'info' : 'neutral'}>{e.status}</Badge>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption-size)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.path}</span>
                        <span style={{ marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', fontSize: 'var(--text-caption-size)', flexShrink: 0 }}>{e.t}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="osd-stats__ph"><b>No entries yet</b><span>This table populates after the automation begins processing wallets.</span></div>
                )}
              </div>
            </div>
          </React.Fragment>
        ) : (
        <div className="osd-flow__grid">
          <aside className="osd-pal">
            <div className="osd-pal__search"><Icon name="search" size={14} color="var(--text-tertiary)" /><input placeholder="Search triggers & actions…" value={palQ} onChange={(e) => setPalQ(e.target.value)} /></div>
            <div className="osd-pal__body">
              <span className="osd-pal__lbl">On-chain triggers · {trigOn.length}</span>
              {trigOn.map((t) => (
                <button key={t.name} type="button" className="osd-pal__item osd-pal__item--trigger" disabled={locked} onClick={() => setTriggerFromPal(t)}>
                  <span className="osd-pal__icn"><Icon name={t.icon} size={14} /></span>
                  <span className="osd-pal__txt"><b>{t.name}</b><span>{t.desc}</span></span>
                </button>
              ))}
              <span className="osd-pal__lbl">Off-chain triggers · {trigOff.length}</span>
              {trigOff.map((t) => (
                <button key={t.name} type="button" className="osd-pal__item osd-pal__item--trigger" disabled={locked} onClick={() => setTriggerFromPal(t)}>
                  <span className="osd-pal__icn"><Icon name={t.icon} size={14} /></span>
                  <span className="osd-pal__txt"><b>{t.name}</b><span>{t.desc}</span></span>
                </button>
              ))}
              <span className="osd-pal__lbl">Actions · {actList.length}</span>
              {actList.map((a) => (
                <button key={a.type} type="button" className="osd-pal__item" disabled={locked || !triggers.length || hasBranch} onClick={() => insertStep(steps.length, a.type)}>
                  <span className="osd-pal__icn"><Icon name={a.icon} size={14} /></span>
                  <span className="osd-pal__txt"><b>{a.name}</b><span>{a.desc}</span></span>
                </button>
              ))}
            </div>
          </aside>
          <div className="osd-flow__canvas">
            {triggers.length ? (
              <React.Fragment>
                {triggers.length > 1 ? <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', marginBottom: 2 }}>A wallet enters when <b style={{ color: 'var(--text-secondary)' }}>any</b> of these fire</span> : null}
                {triggers.map((tg, ti) => (
                  <React.Fragment key={tg.id}>
                    {ti > 0 ? <React.Fragment><span className="osd-flow__wire" style={{ height: 14 }}></span><span className="osd-trig-or">OR</span><span className="osd-flow__wire" style={{ height: 14 }}></span></React.Fragment> : null}
                    <div className={`osd-node${sel === 'trig:' + tg.id ? ' on' : ''}`} onClick={() => setSel('trig:' + tg.id)}>
                      {!tg.configured ? <span className="osd-node__pip"></span> : null}
                      <div className="osd-node__head">
                        <span className="osd-node__icn osd-node__icn--trigger"><Icon name="zap" size={15} /></span>
                        <span className="osd-node__txt"><i>Trigger{triggers.length > 1 ? ` ${ti + 1}` : ''}</i><b>{tg.label}</b></span>
                      </div>
                      {triggers.length > 1 && !locked ? <button type="button" className="osd-node__rm" aria-label="Remove trigger" onClick={(e) => { e.stopPropagation(); removeTrigger(tg.id); }}><Icon name="x" size={14} /></button> : null}
                    </div>
                  </React.Fragment>
                ))}
                {triggers.length < 3 && !locked ? (
                  <React.Fragment>
                    <span className="osd-flow__wire" style={{ height: 14 }}></span>
                    <button type="button" className="osd-trig-add" onClick={() => setPickerAt(pickerAt === 'trig' ? null : 'trig')}><Icon name="plus" size={13} />Add trigger</button>
                    {pickerAt === 'trig' ? (
                      <div className="osd-flow__picker" style={{ maxWidth: 320 }}>
                        {[...TRIGGERS_ON, ...TRIGGERS_OFF].filter((t) => !triggers.some((x) => x.label === t.name)).slice(0, 8).map((t) => (
                          <button key={t.name} type="button" className="osd-flow__pick" onClick={() => setTriggerFromPal(t)}><Icon name={t.icon} size={16} />{t.name}</button>
                        ))}
                      </div>
                    ) : null}
                  </React.Fragment>
                ) : null}
                {steps.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {plus(i)}
                    {s.type === 'branch' ? (
                      <React.Fragment>
                        <div className={`osd-node${sel === s.id ? ' on' : ''}`} onClick={() => setSel(s.id)}>
                          {!s.configured ? <span className="osd-node__pip"></span> : null}
                          <div className="osd-node__head">
                            <span className="osd-node__icn"><Icon name="split" size={15} /></span>
                            <span className="osd-node__txt"><i>Branch</i><b>{s.cond}</b><span>{s.configured ? 'Splits into two paths' : 'Needs setup'}</span></span>
                          </div>
                        </div>
                        <div className="osd-br">
                          {['yes', 'no'].map((p) => (
                            <div className="osd-br__col" key={p}>
                              <span className="osd-br__lbl">{p === 'yes' ? 'If yes' : 'If no'}</span>
                              {s.paths[p].act ? (
                                <div className={`osd-node${sel === `${s.id}::${p}` ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); setSel(`${s.id}::${p}`); }}>
                                  {!s.paths[p].act.configured ? <span className="osd-node__pip"></span> : null}
                                  <div className="osd-node__head">
                                    <span className="osd-node__icn"><Icon name={STEP_META[s.paths[p].act.type].icon} size={15} /></span>
                                    <span className="osd-node__txt"><i>{STEP_META[s.paths[p].act.type].kind}</i><b>{s.paths[p].act.label}</b></span>
                                  </div>
                                </div>
                              ) : locked ? (
                                <span className="osd-flow__end">No action</span>
                              ) : (
                                <button type="button" className="osd-br__add" onClick={(e) => { e.stopPropagation(); setPickerAt(pickerAt === `${s.id}:${p}` ? null : `${s.id}:${p}`); }}><Icon name="plus" size={13} />Add step</button>
                              )}
                              {pickerAt === `${s.id}:${p}` ? (
                                <div className="osd-flow__picker">
                                  {['email', 'push', 'wait', 'tag', 'list'].map((t) => (
                                    <button key={t} type="button" className="osd-flow__pick" onClick={() => setPathAct(s.id, p, t)}><Icon name={STEP_META[t].icon} size={16} />{STEP_META[t].title}</button>
                                  ))}
                                </div>
                              ) : null}
                              <span className="osd-flow__wire"></span>
                              <span className="osd-flow__end">Exit flow</span>
                            </div>
                          ))}
                        </div>
                      </React.Fragment>
                    ) : (
                      <div className={`osd-node${sel === s.id ? ' on' : ''}`} onClick={() => setSel(s.id)}>
                        {!s.configured ? <span className="osd-node__pip"></span> : null}
                        <div className="osd-node__head">
                          <span className="osd-node__icn"><Icon name={STEP_META[s.type].icon} size={15} /></span>
                          <span className="osd-node__txt"><i>{STEP_META[s.type].kind}</i><b>{s.label}</b><span>{s.configured ? STEP_META[s.type].sub : 'Needs setup'}</span></span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
                {hasBranch ? null : (
                  <React.Fragment>
                    {plus(steps.length)}
                    <span className="osd-flow__end">Exit flow</span>
                  </React.Fragment>
                )}
              </React.Fragment>
            ) : (
              <div className="osd-stats__ph" style={{ maxWidth: 340, background: 'var(--bg-surface)' }}>
                <b>Start from a clean canvas</b>
                <span>Pick a trigger from the left panel — a flow can start from up to three.</span>
              </div>
            )}
          </div>
          <aside className="osd-flow__panel">
            {locked ? (
              <React.Fragment>
                <h3>Flow is live</h3>
                <p className="hint">Wallets are moving through this automation right now. Pause it to change the trigger, steps, or content — wallets mid-flow finish their current step, then wait.</p>
                <Button variant="secondary" size="s" icon="pause" onClick={() => setActive(false)}>Pause automation</Button>
              </React.Fragment>
            ) : selTrig ? (
              <React.Fragment>
                <h3>{triggers.length > 1 ? `Trigger ${triggers.findIndex((t) => t.id === selTrig.id) + 1}` : 'Trigger'}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 'var(--text-label-s-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Label</label>
                  <input className="osd-txtin" value={selTrig.label} onChange={(e) => editTrigger(selTrig.id, { label: e.target.value })} />
                </div>
                <Select label="Contract" options={['Vault77 Packs · 0x3F4a…8a21', 'Vault77 Staking · 0x91Cb…4e07', 'Any contract']} />
                <Select label="Event" options={['Any event', 'Mint', 'Purchase', 'Unstake', 'Transfer out']} />
                <Select label="Chain" options={['Any chain', 'Base', 'Ethereum']} />
                <div style={{ display: 'flex', gap: 8 }}>
                  {!selTrig.configured ? <Button size="s" onClick={() => configure('trig:' + selTrig.id)}>Apply trigger</Button> : null}
                  {triggers.length > 1 ? <Button variant="tertiary" size="s" icon="trash-2" onClick={() => removeTrigger(selTrig.id)}>Remove</Button> : null}
                </div>
                <p className="hint">{triggers.length > 1 ? 'A wallet enters when any of the triggers fires. You can start a flow from up to three.' : 'A wallet enters once per matching event, subject to the re-entry rule below. Add more triggers on the canvas to start this flow from several events.'}</p>
              </React.Fragment>
            ) : selBranch ? (
              <React.Fragment>
                <h3>Branch</h3>
                <Select label="Condition" options={['Has a linked email', 'Is email-reachable', 'Is push-reachable', 'Is in segment…', 'Balance above…', 'Opened last email']} defaultValue={selBranch.cond} />
                <p className="hint">Wallets that match take the “yes” path; everyone else takes “no”. Add a step to each path below the branch.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!selBranch.configured ? <Button size="s" onClick={() => configure(selBranch.id)}>Apply</Button> : null}
                  <Button variant="tertiary" size="s" icon="trash-2" onClick={() => removeStep(selBranch.id)}>Remove</Button>
                </div>
              </React.Fragment>
            ) : selStep ? (
              <React.Fragment>
                <h3>{STEP_META[selStep.type].title}</h3>
                {selStep.type === 'wait' ? <Select label="Duration" options={['1 hour', '6 hours', '1 day', '3 days', '7 days']} /> : null}
                {selStep.type === 'email' ? (
                  <React.Fragment>
                    <Select label="Template" options={['Welcome series', 'Vault77 is Live', 'Weekly digest', '+ New email…']} />
                    <Select label="Send as" options={['Vault77 · no-reply@vault777.com']} />
                    <Button size="s" icon="pen-line" onClick={() => setEditorOpen(true)}>Open email builder</Button>
                    <p className="hint">Build the email in the full editor. Skipped for wallets without a linked email.</p>
                  </React.Fragment>
                ) : null}
                {selStep.type === 'push' ? (
                  <React.Fragment>
                    <Select label="Notification" options={['Claim your starter pack', 'Season 2 packs are live', 'Your Hammers are waiting', '+ New notification…']} />
                    <Button size="s" icon="pen-line" onClick={() => setPushEditor(selStep)}>Open push builder</Button>
                    <p className="hint">Build the in-app push here. Delivered next time the wallet opens your app, or instantly if a device is active.</p>
                  </React.Fragment>
                ) : null}
                {selStep.type === 'tag' ? <Select label="Tag" options={['season-2', 'whale', 'collector', 'new']} /> : null}
                {selStep.type === 'list' ? <Select label="List" options={['Newsletter subscribers', 'Season 2 waitlist', 'VIP holders', 'Airdrop applicants', '+ New list…']} /> : null}
                {selStep.type === 'webhook' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 'var(--text-label-s-size)', fontWeight: 500, color: 'var(--text-primary)' }}>URL</label>
                    <input className="osd-txtin" placeholder="https://api.vault777.com/hooks/…" style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }} />
                  </div>
                ) : null}
                {selStep.type === 'campaign' ? <Select label="Campaign" options={['Vault77 is LIVE', 'Pack drop — Season 2', 'Gas rebate week']} /> : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  {!selStep.configured ? <Button size="s" onClick={() => configure(sel)}>Apply</Button> : null}
                  <Button variant="tertiary" size="s" icon="trash-2" onClick={() => nested ? clearPathAct(found.branchId, found.path) : removeStep(selStep.id)}>Remove</Button>
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <h3>Flow settings</h3>
                <div className="osd-flow__panelrow"><span>Re-entry</span><Select options={['Never', 'After 30 days', 'Every time']} style={{ width: 140 }} /></div>
                <div className="osd-flow__panelrow"><span>Exit on goal</span><Switch defaultChecked /></div>
                <div className="osd-flow__panelrow"><span>Respect quiet hours</span><Switch defaultChecked /></div>
                <div className="osd-flow__panelrow"><span>Max 1 message / 10h</span><Switch defaultChecked /></div>
                <p className="hint">These caps apply across all automations, so a wallet in three flows still hears from you at most once per window. Select a node to configure it.</p>
              </React.Fragment>
            )}
          </aside>
        </div>
        )}
        {editorOpen ? <TemplateEditor name={selStep ? selStep.label : 'Automation email'} onClose={() => setEditorOpen(false)} /> : null}
        {pushEditor ? <PushBuilder name={pushEditor.label} onClose={() => setPushEditor(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="osd-auto" data-screen-label="Automations · list">
      <div className="osd-auto__head">
        <h1>Automations</h1>
        <span style={{ flex: 1 }}></span>
        <Button icon="plus" size="l" onClick={() => setMode('recipes')}>New automation</Button>
      </div>
      {filled ? (
        <React.Fragment>
          <div className="osd-auto__strip">
            <div className="osd-auto__stat"><span>Active flows</span><b>2</b></div>
            <div className="osd-auto__stat"><span>Entries · 30d</span><b>2,268</b></div>
            <div className="osd-auto__stat"><span>Avg completion</span><b>37.4%</b></div>
            <div className="osd-auto__stat"><span>On-chain conversions</span><b>634</b></div>
          </div>
          <div className="osd-auto__toolbar">
            <div className="osd-auto__search"><Icon name="search" size={16} color="var(--text-tertiary)" /><input placeholder="Search automations…" aria-label="Search automations" /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip selected>All · 4</Chip>
              <Chip>Active · 2</Chip>
              <Chip>Paused · 1</Chip>
              <Chip>Draft · 1</Chip>
            </div>
          </div>
          <div className="osd-auto__tablecard">
            <table className="osd-auto__table">
              <thead><tr><th>Automation</th><th>Status</th><th className="num">Entries · 30d</th><th className="num">Completed</th><th className="num">Conversions</th><th className="num">Last triggered</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.id} onClick={() => openRow(r)}>
                    <td><span className="osd-auto__name"><b>{r.name}</b><span>{r.trigger}</span></span></td>
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
        </React.Fragment>
      ) : (
        <div className="osd-auto__empty">
          <span className="osd-auto__empty__icn"><Icon name="zap" size={24} strokeWidth={1.5} /></span>
          <h2>Put your messaging on autopilot</h2>
          <p>Automations react to on-chain events — a wallet connects, buys, goes quiet — and send the right email or push without you lifting a finger.</p>
          <Button icon="plus" size="l" onClick={() => setMode('recipes')}>New automation</Button>
        </div>
      )}
    </div>
  );
}
