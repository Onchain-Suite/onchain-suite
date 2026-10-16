import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';
import { Switch } from '../../components/forms/Switch.jsx';
import { Checkbox } from '../../components/forms/Checkbox.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { Stepper } from '../../components/data/Stepper.jsx';
import { TemplateEditor } from './TemplateEditor.jsx';
import { SEGMENTS } from './segments.js';

const css = `
.osd-wiz{max-width:1560px;margin:0 auto;padding:0 40px 48px;font-family:var(--font-sans);display:flex;flex-direction:column;gap:var(--space-6);}
.osd-wiz__bar{display:flex;align-items:center;gap:14px;padding:6px 0 0;}
.osd-wiz__back{display:inline-flex;align-items:center;gap:8px;border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:8px 10px;margin-left:-10px;border-radius:var(--radius-md);}
.osd-wiz__back:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-wiz__sep{width:1px;height:20px;background:var(--border-default);}
.osd-wiz__name{display:flex;align-items:center;gap:8px;min-width:0;}
.osd-wiz__name input{border:1px solid transparent;background:transparent;font-family:inherit;font-size:17px;font-weight:600;color:var(--text-primary);padding:6px 10px;border-radius:var(--radius-md);min-width:120px;width:280px;outline:none;transition:border-color var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard);}
.osd-wiz__name input:hover{background:var(--surface-hover);}
.osd-wiz__name input:focus{border-color:var(--border-focus);background:var(--bg-surface);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-wiz__saved{display:inline-flex;align-items:center;gap:6px;font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-wiz__grid{display:grid;grid-template-columns:216px minmax(0,1fr) 288px;gap:var(--space-6);align-items:start;}
.osd-wiz__grid--centered{display:flex;flex-direction:column;gap:var(--space-6);max-width:760px;margin:0 auto;width:100%;}
.osd-wiz__rail{display:flex;flex-direction:column;gap:4px;position:sticky;top:8px;}
.osd-wstep{display:flex;gap:12px;padding:10px 12px;border-radius:var(--radius-md);border:none;background:none;font-family:inherit;text-align:left;cursor:pointer;align-items:flex-start;width:100%;box-sizing:border-box;}
.osd-wstep:hover{background:var(--surface-hover);}
.osd-wstep[disabled]{cursor:default;}
.osd-wstep[disabled]:hover{background:none;}
.osd-wstep__dot{width:24px;height:24px;border-radius:var(--radius-round);border:1.5px solid var(--border-strong);color:var(--text-secondary);font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-sizing:border-box;background:var(--bg-surface);}
.osd-wstep--active .osd-wstep__dot{background:var(--action-primary);border-color:var(--action-primary);color:#fff;}
.osd-wstep--done .osd-wstep__dot{background:var(--bg-selected);border-color:var(--action-primary);color:var(--action-primary);}
.osd-wstep__txt{display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-wstep__txt b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-secondary);}
.osd-wstep--active .osd-wstep__txt b{color:var(--text-primary);}
.osd-wstep__txt span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-wiz__panel{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:var(--elevation-1);}
.osd-wiz__panelhead{padding:24px 28px 0;display:flex;flex-direction:column;gap:4px;}
.osd-wiz__panelhead h2{margin:0;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);letter-spacing:-0.2px;}
.osd-wiz__panelhead p{margin:0;font-size:var(--text-body-s-size);color:var(--text-secondary);}
.osd-wiz__panelbody{padding:24px 28px 28px;display:flex;flex-direction:column;gap:var(--space-6);}
.osd-wiz__foot{display:flex;align-items:center;gap:10px;padding:16px 28px;border-top:1px solid var(--border-subtle);}
.osd-wiz__seg{display:inline-flex;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:3px;gap:2px;align-self:flex-start;}
.osd-wiz__seg button{border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:6px 14px;border-radius:var(--radius-sm);cursor:pointer;}
.osd-wiz__seg button.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:var(--elevation-1);}
.osd-field{display:flex;flex-direction:column;gap:8px;}
.osd-field > label{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);}
.osd-field__hint{font-size:var(--text-caption-size);color:var(--text-tertiary);margin:0;}
.osd-txt{position:relative;display:flex;align-items:center;}
.osd-txt input{width:100%;height:38px;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:0 12px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-txt input:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-txt input::placeholder{color:var(--text-tertiary);}
.osd-txt__count{position:absolute;right:10px;font-size:11px;font-variant-numeric:tabular-nums;color:var(--text-tertiary);}
.osd-segrow{display:flex;flex-wrap:wrap;gap:8px;}
.osd-segpick{border:1px solid var(--border-default);border-radius:var(--radius-md);overflow:hidden;}
.osd-segpick__search{display:flex;align-items:center;gap:8px;height:38px;padding:0 12px;border-bottom:1px solid var(--border-subtle);}
.osd-segpick__search input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);min-width:0;}
.osd-segpick__search input::placeholder{color:var(--text-tertiary);}
.osd-segpick__list{max-height:244px;overflow-y:auto;}
.osd-segpick__row{display:flex;align-items:center;gap:11px;padding:10px 12px;border-bottom:1px solid var(--border-subtle);cursor:pointer;}
.osd-segpick__row:last-child{border-bottom:none;}
.osd-segpick__row:hover{background:var(--surface-hover);}
.osd-segpick__row.on{background:var(--bg-selected);}
.osd-segpick__txt{display:flex;flex-direction:column;gap:1px;min-width:0;}
.osd-segpick__txt b{font-size:var(--text-body-s-size);font-weight:600;color:var(--text-primary);}
.osd-segpick__txt span{font-size:var(--text-caption-size);color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.osd-segpick__n{margin-left:auto;font-size:var(--text-caption-size);color:var(--text-secondary);font-variant-numeric:tabular-nums;flex-shrink:0;}
.osd-segpick__foot{display:flex;align-items:center;gap:8px;padding:9px 12px;border-top:1px solid var(--border-subtle);background:var(--surface-subtle);}
.osd-segpick__clear{border:none;background:none;font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--action-primary);cursor:pointer;margin-left:auto;padding:2px 6px;border-radius:var(--radius-sm);}
.osd-segpick__clear:hover{background:var(--bg-selected);}
.osd-segpick__empty{padding:26px 16px;text-align:center;font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-adv{border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;}
.osd-adv__head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:none;border:none;width:100%;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);cursor:pointer;text-align:left;}
.osd-adv__head:hover{background:var(--surface-hover);}
.osd-adv__body{padding:4px 16px 16px;display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--border-subtle);}
.osd-sum{position:sticky;top:8px;display:flex;flex-direction:column;gap:var(--space-4);}
.osd-sum__card{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:20px 22px;display:flex;flex-direction:column;gap:14px;}
.osd-sum__big{display:flex;flex-direction:column;gap:2px;}
.osd-sum__big b{font-size:var(--text-numeric-l-size);line-height:var(--text-numeric-l-line);font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;}
.osd-sum__big span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-sum__row{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:var(--text-body-s-size);}
.osd-sum__row dt{color:var(--text-secondary);margin:0;}
.osd-sum__row dd{color:var(--text-primary);font-weight:500;margin:0;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.osd-sum dl{display:flex;flex-direction:column;gap:10px;margin:0;border-top:1px solid var(--border-subtle);padding-top:14px;}
.osd-tpl{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.osd-tpl__card{border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:0;cursor:pointer;overflow:hidden;text-align:left;font-family:inherit;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-tpl__card:hover{border-color:var(--border-strong);}
.osd-tpl__card.on{border-color:var(--action-primary);background:var(--bg-selected);}
.osd-tpl__thumb{height:96px;background:var(--surface-subtle);display:flex;flex-direction:column;gap:5px;padding:14px 18px;box-sizing:border-box;border-bottom:1px solid var(--border-subtle);}
.osd-tpl__thumb i{display:block;border-radius:2px;background:var(--neutral-300);}
.osd-tpl__meta{padding:10px 12px;display:flex;flex-direction:column;gap:1px;}
.osd-tpl__meta b{font-size:var(--text-label-s-size);font-weight:600;color:var(--text-primary);}
.osd-tpl__meta span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-contact{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--border-subtle);font-size:var(--text-body-s-size);}
.osd-contact:last-child{border-bottom:none;}
.osd-contact span{color:var(--text-primary);font-weight:500;}
.osd-contact em{margin-left:auto;font-style:normal;color:var(--text-tertiary);font-size:var(--text-caption-size);}
.osd-rev__mail{border:1px solid var(--border-default);border-radius:var(--radius-md);overflow:hidden;}
.osd-rev__meta{margin:0;padding:12px 18px;border-bottom:1px solid var(--border-subtle);display:grid;grid-template-columns:56px minmax(0,1fr);gap:6px 12px;font-size:12px;}
.osd-rev__meta dt{color:var(--text-tertiary);}
.osd-rev__meta dd{margin:0;color:var(--text-primary);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.osd-rev__mailbody{padding:28px 22px 24px;background:var(--surface-subtle);display:flex;justify-content:center;}
.osd-rev__email{width:100%;max-width:440px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);padding:28px 28px 20px;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;box-shadow:var(--elevation-1);}
.osd-rev__banner{height:110px;border-radius:var(--radius-sm);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;}
.osd-rev__email h3{margin:0;font-size:20px;font-weight:600;letter-spacing:-0.2px;color:var(--text-primary);}
.osd-rev__email p{margin:0;font-size:13px;line-height:1.55;color:var(--text-secondary);}
.osd-rev__cta{align-self:flex-start;background:var(--action-primary);color:#fff;font-size:13px;font-weight:600;padding:9px 18px;border-radius:var(--radius-sm);}
.osd-rev__emailfoot{margin-top:4px;padding-top:12px;border-top:1px solid var(--border-subtle);font-size:11px;color:var(--text-tertiary);}
.osd-rev__rows{border:1px solid var(--border-subtle);border-radius:var(--radius-md);overflow:hidden;}
.osd-rev__row{display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border-subtle);}
.osd-rev__row:last-child{border-bottom:none;}
.osd-rev__rowtxt{display:flex;flex-direction:column;gap:1px;min-width:0;}
.osd-rev__rowtxt b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-rev__rowtxt span{font-size:var(--text-caption-size);color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.osd-check__edit{margin-left:auto;border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--action-primary);cursor:pointer;padding:4px 8px;border-radius:var(--radius-sm);flex-shrink:0;}
.osd-check__edit:hover{background:var(--bg-selected);}
.osd-check__ok{width:20px;height:20px;border-radius:var(--radius-round);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-sendopt{display:flex;flex-direction:column;gap:10px;}
.osd-sendopt button{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);font-family:inherit;cursor:pointer;text-align:left;width:100%;box-sizing:border-box;}
.osd-sendopt button.on{border-color:var(--action-primary);background:var(--bg-selected);}
.osd-sendopt__icn{width:34px;height:34px;border-radius:var(--radius-sm);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-sendopt button.on .osd-sendopt__icn{background:var(--bg-surface);color:var(--action-primary);}
.osd-sendopt__txt{display:flex;flex-direction:column;gap:1px;}
.osd-sendopt__txt b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-sendopt__txt span{font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-sendopt__dot{margin-left:auto;width:16px;height:16px;border-radius:var(--radius-round);border:1.5px solid var(--border-strong);box-sizing:border-box;flex-shrink:0;}
.osd-sendopt button.on .osd-sendopt__dot{border:5px solid var(--action-primary);}
.osd-sendopt--row{flex-direction:row;}
.osd-sendopt--row button{flex:1;}
.osd-txta textarea{width:100%;min-height:84px;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:10px 12px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;resize:vertical;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-txta textarea:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-push{border-radius:var(--radius-md);background:var(--surface-subtle);padding:28px 20px;display:flex;align-items:center;justify-content:center;}
.osd-push__note{width:100%;max-width:340px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:14px;box-shadow:var(--elevation-2);padding:12px 14px;display:flex;gap:10px;align-items:flex-start;}
.osd-push__app{width:34px;height:34px;border-radius:8px;background:var(--blue-600);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-push__txt{display:flex;flex-direction:column;gap:2px;min-width:0;}
.osd-push__txt b{font-size:13px;font-weight:600;color:var(--text-primary);}
.osd-push__txt span{font-size:12px;color:var(--text-secondary);line-height:1.4;}
.osd-push__time{margin-left:auto;font-size:10px;color:var(--text-tertiary);flex-shrink:0;}
.osd-done{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:72px 40px;}
.osd-done__icn{width:56px;height:56px;border-radius:var(--radius-round);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;margin-bottom:4px;position:relative;}
.osd-done__icn--live::before,.osd-done__icn--live::after{content:'';position:absolute;inset:0;border-radius:99px;border:2px solid var(--action-primary);opacity:0;animation:osd-ping 1.6s var(--ease-standard) infinite;}
.osd-done__icn--live::after{animation-delay:0.8s;}
@keyframes osd-ping{0%{transform:scale(1);opacity:0.45;}100%{transform:scale(1.9);opacity:0;}}
.osd-done__count{font-size:44px;line-height:1.1;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;letter-spacing:-1px;}
.osd-done__count small{font-size:20px;font-weight:500;color:var(--text-tertiary);letter-spacing:0;}
.osd-done__bar{width:320px;max-width:100%;height:6px;border-radius:99px;background:var(--surface-subtle);overflow:hidden;margin-top:6px;}
.osd-done__bar i{display:block;height:100%;background:var(--action-primary);border-radius:99px;transition:none;}
.osd-done h2{margin:0;font-size:var(--text-heading-l-size);font-weight:600;color:var(--text-primary);letter-spacing:-0.3px;}
.osd-done p{margin:0 0 14px;font-size:var(--text-body-s-size);color:var(--text-secondary);max-width:420px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-wiz-css')) {
  const s = document.createElement('style'); s.id = 'osd-wiz-css'; s.textContent = css; document.head.appendChild(s);
}

const EXCLUDABLE = [
  { id: 'suppressed', label: 'Suppressed & unsubscribed', always: true },
  { id: 'recent', label: 'Messaged in last 24h', n: 640 },
  { id: 'team', label: 'Internal / team wallets', n: 18 },
];
const CAMPAIGN_LISTS = [
  { id: 'news', name: 'Newsletter subscribers', desc: 'Form · Newsletter signup', count: 640, email: 640, wallet: 320 },
  { id: 's2wait', name: 'Season 2 waitlist', desc: 'Form · Season 2 waitlist', count: 1204, email: 1040, wallet: 1204 },
  { id: 'airdrop', name: 'Airdrop applicants', desc: 'Form · Airdrop eligibility', count: 512, email: 460, wallet: 512 },
  { id: 'vip', name: 'VIP holders', desc: 'Manual · CSV import', count: 86, email: 40, wallet: 86 },
];
const CONTACTS = [
  { name: 'Abdulrahmanzakari72', email: 'abdulrahmanzakari72@gmail.com', wallet: '0x3F4a…8a21' },
  { name: 'Mahmudsaeful869', email: 'mahmudsaeful869@gmail.com', wallet: '0x91Cb…4e07' },
  { name: 'Kobided223', email: 'kobided223@gmail.com', wallet: '0xA27d…c913' },
  { name: 'Sageernass', email: 'sageernass@gmail.com', wallet: '0x50E8…1bb4' },
  { name: 'Kareemabiola541', email: 'kareemabiola541@gmail.com', wallet: '0xDD02…7f6a' },
];
const TEMPLATES = [
  { id: 'blank', name: 'Start blank', sub: 'Empty canvas', bars: [0.5, 0, 0, 0] },
  { id: 'launch', name: 'Vault77 is Live', sub: 'Saved · 23 Jul', bars: [0.9, 0.7, 0.75, 0.4] },
  { id: 'digest', name: 'Weekly digest', sub: 'Library', bars: [0.6, 0.85, 0.8, 0.55] },
];
const STEPS = [
  { label: 'Audience', sub: 'Who receives it' },
  { label: 'Message', sub: 'Content & template' },
  { label: 'Review', sub: 'Check & send' },
];

/** Animated send progress: counter eases 0 → total, then onDone fires. */
function SendProgress({ total, label, onDone }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const dur = 3000; const t0 = performance.now(); let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * total));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(onDone, 350);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);
  const fmt = (x) => x.toLocaleString('en-US');
  return (
    <div className="osd-done" aria-live="polite">
      <span className="osd-done__icn osd-done__icn--live"><Icon name="send" size={24} strokeWidth={2} /></span>
      <span className="osd-done__count">{fmt(n)} <small>/ {fmt(total)}</small></span>
      <p style={{ margin: 0, fontSize: 'var(--text-body-s-size)', color: 'var(--text-secondary)' }}>{label} you can safely leave this page.</p>
      <span className="osd-done__bar"><i style={{ width: `${(n / total) * 100}%` }}></i></span>
    </div>
  );
}

/** Campaign creation wizard — replaces the create-drawer + Klaviyo-style 3-step flow.
    layout: 'rail' (step rail + live summary) or 'centered' (focused single column). */
export function CampaignWizard({ layout = 'rail', onExit, initialSegments, initialName }) {
  const [step, setStep] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [name, setName] = React.useState(initialName || 'Pack drop — Season 2');
  const [ctype, setCtype] = React.useState('direct');
  const [audMode, setAudMode] = React.useState('segments');
  const [segs, setSegs] = React.useState(initialSegments && initialSegments.length ? initialSegments : ['active', 'whales']);
  const [segQ, setSegQ] = React.useState('');
  const [lists, setLists] = React.useState(['s2wait']);
  const [listQ, setListQ] = React.useState('');
  const [exclude, setExclude] = React.useState(['suppressed']);
  const [picked, setPicked] = React.useState([0, 1, 2]);
  const [smart, setSmart] = React.useState(true);
  const [utmOpen, setUtmOpen] = React.useState(false);
  const [subject, setSubject] = React.useState('Season 2 packs are live — crack the vault');
  const [tplId, setTplId] = React.useState('launch');
  const [pushTitle, setPushTitle] = React.useState('Season 2 packs are live');
  const [pushBody, setPushBody] = React.useState('Collect Packs, earn Hammers, and take your shot at cracking the vault.');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [sendMode, setSendMode] = React.useState('now');
  const [schedDay, setSchedDay] = React.useState(28);
  const [schedTime, setSchedTime] = React.useState('09:00');
  const [testOpen, setTestOpen] = React.useState(false);
  const [testTo, setTestTo] = React.useState('optimus@vault777.com');
  const [testSent, setTestSent] = React.useState(false);
  const push = ctype === 'push';
  const gross = audMode === 'everyone' ? (push ? 5210 : 4182) : audMode === 'contacts' ? picked.length : audMode === 'lists' ? CAMPAIGN_LISTS.filter((l) => lists.includes(l.id)).reduce((a, l) => a + (push ? l.wallet : l.email), 0) : SEGMENTS.filter((s) => segs.includes(s.id)).reduce((a, s) => a + (push ? s.wallet : s.email), 0);
  const excluded = EXCLUDABLE.filter((e) => exclude.includes(e.id) && !e.always).reduce((a, e) => a + e.n, 0);
  const recipients = Math.max(0, gross - excluded);
  const noun = push ? 'wallets' : 'recipients';
  const fmt = (n) => n.toLocaleString('en-US');
  const toggleSeg = (id) => setSegs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleList = (id) => setLists((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const toggleExcl = (id) => setExclude((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const centered = layout === 'centered';

  const audienceStep = (
    <div className="osd-wiz__panelbody">
      <div className="osd-field">
        <label>Campaign type</label>
        <div className="osd-sendopt osd-sendopt--row">
          <button type="button" className={!push ? 'on' : ''} onClick={() => setCtype('direct')}>
            <span className="osd-sendopt__icn"><Icon name="mail" size={16} /></span>
            <span className="osd-sendopt__txt"><b>Direct campaign</b><span>Email · wallet optional</span></span>
            <span className="osd-sendopt__dot"></span>
          </button>
          <button type="button" className={push ? 'on' : ''} onClick={() => setCtype('push')}>
            <span className="osd-sendopt__icn"><Icon name="smartphone" size={16} /></span>
            <span className="osd-sendopt__txt"><b>In-app push</b><span>Wallet · email optional</span></span>
            <span className="osd-sendopt__dot"></span>
          </button>
        </div>
        <p className="osd-field__hint">{push ? 'Delivered inside your app — contacts need a connected wallet.' : 'Delivered by email — contacts need an email address.'}</p>
      </div>
      <div className="osd-field">
        <label>Send to</label>
        <div className="osd-wiz__seg" role="tablist">
          {[['segments', 'Segments'], ['lists', 'Lists'], ['contacts', 'Contacts'], ['everyone', 'Everyone']].map(([id, l]) => (
            <button key={id} type="button" className={audMode === id ? 'on' : ''} onClick={() => setAudMode(id)}>{l}</button>
          ))}
        </div>
        {audMode === 'segments' ? (() => {
          const filtered = SEGMENTS.filter((s) => (s.name + ' ' + s.desc).toLowerCase().includes(segQ.trim().toLowerCase()));
          return (
            <div className="osd-segpick">
              <div className="osd-segpick__search"><Icon name="search" size={15} color="var(--text-tertiary)" /><input placeholder="Search segments…" value={segQ} onChange={(e) => setSegQ(e.target.value)} aria-label="Search segments" /></div>
              <div className="osd-segpick__list">
                {filtered.map((s) => (
                  <div key={s.id} className={`osd-segpick__row${segs.includes(s.id) ? ' on' : ''}`} onClick={() => toggleSeg(s.id)}>
                    <Checkbox checked={segs.includes(s.id)} onChange={() => {}} />
                    <span className="osd-segpick__txt"><b>{s.name}</b><span>{s.desc}</span></span>
                    <span className="osd-segpick__n">{fmt(push ? s.wallet : s.email)}</span>
                  </div>
                ))}
                {filtered.length === 0 ? <div className="osd-segpick__empty">No segments match “{segQ}”.</div> : null}
              </div>
              <div className="osd-segpick__foot">
                <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)' }}>{segs.length} of {SEGMENTS.length} selected</span>
                {segs.length ? <button type="button" className="osd-segpick__clear" onClick={() => setSegs([])}>Clear</button> : null}
              </div>
            </div>
          );
        })() : audMode === 'lists' ? (() => {
          const filtered = CAMPAIGN_LISTS.filter((l) => (l.name + ' ' + l.desc).toLowerCase().includes(listQ.trim().toLowerCase()));
          return (
            <div className="osd-segpick">
              <div className="osd-segpick__search"><Icon name="search" size={15} color="var(--text-tertiary)" /><input placeholder="Search lists…" value={listQ} onChange={(e) => setListQ(e.target.value)} aria-label="Search lists" /></div>
              <div className="osd-segpick__list">
                {filtered.map((l) => (
                  <div key={l.id} className={`osd-segpick__row${lists.includes(l.id) ? ' on' : ''}`} onClick={() => toggleList(l.id)}>
                    <Checkbox checked={lists.includes(l.id)} onChange={() => {}} />
                    <span className="osd-segpick__txt"><b>{l.name}</b><span>{l.desc}</span></span>
                    <span className="osd-segpick__n">{fmt(push ? l.wallet : l.email)}</span>
                  </div>
                ))}
                {filtered.length === 0 ? <div className="osd-segpick__empty">No lists match “{listQ}”.</div> : null}
              </div>
              <div className="osd-segpick__foot">
                <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)' }}>{lists.length} of {CAMPAIGN_LISTS.length} selected</span>
                {lists.length ? <button type="button" className="osd-segpick__clear" onClick={() => setLists([])}>Clear</button> : null}
              </div>
            </div>
          );
        })() : audMode === 'contacts' ? (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {CONTACTS.map((c, i) => (
              <div className="osd-contact" key={c.email}>
                <Checkbox checked={picked.includes(i)} onChange={() => setPicked((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]))} />
                <span>{c.name}</span><em style={push ? { fontFamily: 'var(--font-mono)', fontSize: 12 } : undefined}>{push ? c.wallet : c.email}</em>
              </div>
            ))}
          </div>
        ) : (
          <p className="osd-field__hint" style={{ fontSize: 'var(--text-body-s-size)', color: 'var(--text-secondary)' }}>{push ? 'All 5,210 contacts with a connected wallet. Muted devices are always excluded.' : 'All 4,182 contacts with a verified email. Unsubscribed and bounced addresses are always excluded.'}</p>
        )}
        {audMode === 'segments' ? <p className="osd-field__hint">Overlapping wallets are only messaged once.</p> : null}
        {audMode === 'lists' ? <p className="osd-field__hint">Lists are built from form sign-ups and imports. A wallet on several lists is only messaged once.</p> : null}
        {audMode === 'segments' && segs.length ? (() => {
          const chosen = SEGMENTS.filter((s) => segs.includes(s.id));
          const tot = chosen.reduce((a, s) => a + s.count, 0);
          const reach = chosen.reduce((a, s) => a + (push ? s.wallet : s.email), 0);
          const skipped = Math.max(0, tot - reach);
          return skipped > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-selected)', border: '1px solid var(--border-default)' }}>
              <Icon name="triangle-alert" size={15} color="var(--orange-600, #e0561a)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{fmt(skipped)} of {fmt(tot)} wallets {push ? 'have no linked wallet for in-app push' : "don't have a verified email"} and will be skipped. {push ? 'Add email as a fallback channel' : 'Switch to In-app push'} to reach more.</span>
            </div>
          ) : null;
        })() : null}
      </div>
      <div className="osd-field">
        <label>Don't send to</label>
        <div className="osd-segrow">
          {EXCLUDABLE.map((e) => (
            <Chip key={e.id} icon={e.always ? 'shield' : 'user-minus'} selected={exclude.includes(e.id)} onClick={() => !e.always && toggleExcl(e.id)}>
              {e.label}{e.always ? ' · always' : e.n ? ` · ${fmt(e.n)}` : ''}
            </Chip>
          ))}
        </div>
        <p className="osd-field__hint">Suppressed and unsubscribed wallets are always excluded. Excluded wallets are already removed from the estimate.</p>
      </div>
      <p style={{ margin: 0, display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5, padding: '0 2px' }}><Icon name="shield-check" size={14} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />Recipients are matched through ZK-verified identity links. You send to them without their wallet identity ever being exposed to you.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <Switch checked={smart} onChange={setSmart} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 500, color: 'var(--text-primary)' }}>Smart sending</span>
          <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>Skip anyone who already heard from you in the last 10 hours</span>
        </div>
      </div>
      {!push ? (
      <div className="osd-adv">
        <button type="button" className="osd-adv__head" onClick={() => setUtmOpen((v) => !v)} aria-expanded={utmOpen}>
          <Icon name="chart-no-axes-column" size={16} />UTM tracking
          <Badge status="success" style={{ marginLeft: 4 }}>On · auto</Badge>
          <Icon name={utmOpen ? 'chevron-up' : 'chevron-down'} size={16} color="var(--text-tertiary)" style={{ marginLeft: 'auto' }} />
        </button>
        {utmOpen ? (
          <div className="osd-adv__body">
            <p className="osd-field__hint" style={{ margin: 0 }}>Links get <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>utm_source=onchainsuite</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>utm_medium=email</code> and the campaign id. Override only if you need to.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="osd-field"><label style={{ fontSize: 'var(--text-label-s-size)' }}>utm_campaign</label><div className="osd-txt"><input defaultValue="pack_drop_s2" /></div></div>
              <div className="osd-field"><label style={{ fontSize: 'var(--text-label-s-size)' }}>utm_content</label><div className="osd-txt"><input placeholder="optional" /></div></div>
            </div>
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );

  const pushPreview = (
    <div className="osd-push">
      <div className="osd-push__note">
        <span className="osd-push__app">V77</span>
        <span className="osd-push__txt"><b>{pushTitle || 'Notification title'}</b><span>{pushBody || 'Notification message'}</span></span>
        <span className="osd-push__time">now</span>
      </div>
    </div>
  );

  const [replyTo, setReplyTo] = React.useState(false);
  const messageStep = push ? (
    <div className="osd-wiz__panelbody">
      <div style={{ display: 'grid', gridTemplateColumns: centered ? '1fr' : '1fr 1fr', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="osd-field">
            <label>Title</label>
            <div className="osd-txt">
              <input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} style={{ paddingRight: 44 }} />
              <span className="osd-txt__count">{pushTitle.length}</span>
            </div>
            <p className="osd-field__hint">Keep it under 48 characters — longer titles clip on the lock screen.</p>
          </div>
          <div className="osd-field">
            <label>Message</label>
            <div className="osd-txta"><textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)}></textarea></div>
          </div>
          <div className="osd-field">
            <label>Deep link</label>
            <div className="osd-txt"><input defaultValue="vault77://season-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }} /></div>
            <p className="osd-field__hint">Where the app opens when the push is tapped.</p>
          </div>
        </div>
        <div className="osd-field">
          <label>Preview</label>
          {pushPreview}
        </div>
      </div>
    </div>
  ) : (
    <div className="osd-wiz__panelbody">
      <div style={{ display: 'grid', gridTemplateColumns: centered ? '1fr' : '1fr 1fr', gap: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="osd-field">
            <label>Subject line</label>
            <div className="osd-txt">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ paddingRight: 44 }} />
              <span className="osd-txt__count" style={{ color: subject.length > 60 ? 'var(--text-warning, #b45309)' : undefined }}>{subject.length}</span>
            </div>
            <p className="osd-field__hint">Keep it under 60 characters so it doesn't truncate on mobile.</p>
          </div>
          <div className="osd-field">
            <label>Preview text</label>
            <div className="osd-txt"><input defaultValue="Collect Packs. Earn Hammers. Crack the Vault." /></div>
          </div>
          <Select label="Send as" options={['Vault77 · no-reply@vault777.com', 'Vault77 · noreply@vault777.com']} helper="Verified senders only — manage them in Settings → Sending." />
          <Checkbox label="Send replies to a different address" checked={replyTo} onChange={setReplyTo} />
          {replyTo ? (
            <div className="osd-field">
              <label>Reply-to address</label>
              <div className="osd-txt"><input defaultValue="support@vault777.com" placeholder="replies@vault777.com" /></div>
              <p className="osd-field__hint">Replies land here instead of the sender address.</p>
            </div>
          ) : null}
        </div>
        <div className="osd-field">
          <label>Template</label>
          <div className="osd-tpl" style={centered ? undefined : { gridTemplateColumns: '1fr 1fr' }}>
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" className={`osd-tpl__card${tplId === t.id ? ' on' : ''}`} onClick={() => setTplId(t.id)}>
                <span className="osd-tpl__thumb" aria-hidden="true">
                  {t.bars.map((w, i) => <i key={i} style={{ height: i === 0 ? 12 : 7, width: `${w * 100}%`, opacity: w === 0 ? 0 : 1 }}></i>)}
                </span>
                <span className="osd-tpl__meta"><b>{t.name}</b><span>{t.sub}</span></span>
              </button>
            ))}
          </div>
          <div><Button variant="secondary" size="s" icon="pen-line" onClick={() => setEditorOpen(true)}>Open in editor</Button></div>
        </div>
      </div>
    </div>
  );

  const reviewStep = (
    <div className="osd-wiz__panelbody">
      <div style={{ display: 'grid', gridTemplateColumns: centered ? '1fr' : 'minmax(0,10fr) minmax(0,11fr)', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="osd-field">
            <label>Details</label>
            <div className="osd-rev__rows">
              {[
                [0, 'Audience', `${fmt(recipients)} ${noun}${smart ? ' · smart sending on' : ''}`],
                [1, 'Message', push ? `“${pushTitle}” · in-app push` : `${TEMPLATES.find((t) => t.id === tplId).name} · Vault77 · no-reply@vault777.com`],
                [0, 'Tracking', push ? 'Delivery & open tracking on' : 'Links auto-tagged with UTM parameters'],
              ].map(([target, label, detail]) => (
                <div className="osd-rev__row" key={label}>
                  <span className="osd-check__ok"><Icon name="check" size={12} strokeWidth={2.5} /></span>
                  <span className="osd-rev__rowtxt"><b>{label}</b><span>{detail}</span></span>
                  <button type="button" className="osd-check__edit" onClick={() => setStep(target)}>Edit</button>
                </div>
              ))}
            </div>
          </div>
          <div className="osd-field">
            <label>Delivery</label>
            <div className="osd-sendopt">
              <button type="button" className={sendMode === 'now' ? 'on' : ''} onClick={() => setSendMode('now')}>
                <span className="osd-sendopt__icn"><Icon name="send" size={16} /></span>
                <span className="osd-sendopt__txt"><b>Send now</b><span>Delivery starts immediately</span></span>
                <span className="osd-sendopt__dot"></span>
              </button>
              <button type="button" className={sendMode === 'later' ? 'on' : ''} onClick={() => setSendMode('later')}>
                <span className="osd-sendopt__icn"><Icon name="clock" size={16} /></span>
                <span className="osd-sendopt__txt"><b>Schedule</b><span>Pick a date and time</span></span>
                <span className="osd-sendopt__dot"></span>
              </button>
            </div>
            {sendMode === 'later' ? (
              <div style={{ marginTop: 8, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <b style={{ fontSize: 'var(--text-label-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>July 2026</b>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><Icon name="chevron-left" size={14} /></span>
                    <span style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}><Icon name="chevron-right" size={14} /></span>
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 0' }}>{d}</span>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const past = d < 24; const on = d === schedDay;
                    return (
                      <button key={d} type="button" disabled={past} onClick={() => setSchedDay(d)}
                        style={{ aspectRatio: '1', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 12, fontVariantNumeric: 'tabular-nums', cursor: past ? 'default' : 'pointer', background: on ? 'var(--action-primary)' : 'transparent', color: on ? '#fff' : past ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: past ? 0.4 : 1, fontWeight: on ? 600 : 400 }}>{d}</button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 'var(--text-label-s-size)', fontWeight: 500, color: 'var(--text-primary)' }}>At</span>
                  <div className="osd-txt" style={{ width: 130 }}><input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} /></div>
                  <span style={{ marginLeft: 'auto', fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>Sends Jul {schedDay}, {schedTime} · your timezone</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="osd-field">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ marginRight: 'auto' }}>{push ? 'Notification preview' : 'Inbox preview'}</label>
            <Button variant="secondary" size="s" icon="flask-conical" onClick={() => { setTestOpen((v) => !v); setTestSent(false); }}>Send a test</Button>
          </div>
          {testOpen ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--surface-subtle)' }}>
              {testSent ? (
                <>
                  <span className="osd-check__ok"><Icon name="check" size={12} strokeWidth={2.5} /></span>
                  <span style={{ fontSize: 'var(--text-body-s-size)', color: 'var(--text-primary)' }}>{push ? 'Test push sent to your device.' : <>Test sent to <b>{testTo}</b> — subject is prefixed with [TEST].</>}</span>
                  <button type="button" className="osd-check__edit" onClick={() => setTestSent(false)}>Send another</button>
                </>
              ) : push ? (
                <>
                  <span style={{ flex: 1, fontSize: 'var(--text-body-s-size)', color: 'var(--text-secondary)' }}>Sends to devices signed in with your admin wallet.</span>
                  <Button size="s" onClick={() => setTestSent(true)}>Send test</Button>
                </>
              ) : (
                <>
                  <div className="osd-txt" style={{ flex: 1 }}><input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@vault777.com" aria-label="Test recipient email" /></div>
                  <Button size="s" onClick={() => setTestSent(true)} disabled={!testTo.includes('@')}>Send test</Button>
                </>
              )}
            </div>
          ) : null}
          <div className="osd-rev__mail">
            {push ? (
              <dl className="osd-rev__meta">
                <dt>To</dt><dd>{fmt(recipients)} wallets</dd>
                <dt>Opens</dt><dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 12 }}>vault77://season-2</dd>
              </dl>
            ) : (
            <dl className="osd-rev__meta">
              <dt>From</dt><dd>Vault77 · no-reply@vault777.com</dd>
              <dt>To</dt><dd>{fmt(recipients)} recipients</dd>
              <dt>Subject</dt><dd>{subject || 'No subject yet'}</dd>
            </dl>
            )}
            {push ? pushPreview : (
            <div className="osd-rev__mailbody" aria-label="Email body preview">
              <div className="osd-rev__email">
                <span className="osd-rev__banner"><Icon name="image" size={22} strokeWidth={1.5} /></span>
                <h3>Season 2 packs are live</h3>
                <p>Collect Packs, earn Hammers, and take your shot at cracking the vault. Season 2 adds 12 new pack tiers and a bigger prize pool.</p>
                <span className="osd-rev__cta">Open Vault77</span>
                <span className="osd-rev__emailfoot">Sent by Vault77 · You're getting this because you opted in · Unsubscribe</span>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const summary = (
    <aside className="osd-sum">
      <div className="osd-sum__card">
        <div className="osd-sum__big"><b>{fmt(recipients)}</b><span>Estimated {noun}</span></div>
        <dl>
          <div className="osd-sum__row"><dt>Channel</dt><dd>{push ? 'In-app push' : 'Email'}</dd></div>
          {push ? <div className="osd-sum__row"><dt>Opens</dt><dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 12 }}>vault77://season-2</dd></div> : <div className="osd-sum__row"><dt>Sender</dt><dd>no-reply@vault777.com</dd></div>}
          {!push ? <div className="osd-sum__row"><dt>Template</dt><dd>{TEMPLATES.find((t) => t.id === tplId).name}</dd></div> : null}
          <div className="osd-sum__row"><dt>Delivery</dt><dd>{sendMode === 'now' ? 'Immediately' : `Jul ${schedDay}, ${schedTime}`}</dd></div>
          {excluded > 0 ? <div className="osd-sum__row"><dt>Excluded</dt><dd>{fmt(excluded)} wallets</dd></div> : null}
          <div className="osd-sum__row"><dt>Smart sending</dt><dd>{smart ? 'On' : 'Off'}</dd></div>
        </dl>
      </div>
      <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', padding: '0 4px' }}>Draft autosaves as you go. Nothing sends until you confirm on the review step.</p>
    </aside>
  );

  if (sent || sending) {
    return (
      <div className="osd-wiz" data-screen-label={`Campaign wizard · ${sending ? 'sending' : 'sent'}`}>
        <div className="osd-wiz__panel" style={{ maxWidth: 720, margin: '48px auto 0', width: '100%' }}>
          {sending ? (
            <SendProgress total={recipients} label={push ? 'Sending pushes…' : 'Sending emails…'} onDone={() => { setSending(false); setSent(true); }} />
          ) : (
          <div className="osd-done">
            <span className="osd-done__icn"><Icon name="check" size={26} strokeWidth={2.5} /></span>
            <h2>{sendMode === 'now' ? 'Campaign is on its way' : 'Campaign scheduled'}</h2>
            <p>{sendMode === 'now' ? `“${name}” is sending to ${fmt(recipients)} ${noun}. Opens and clicks will appear on the campaign page within a few minutes.` : `“${name}” will send on Jul ${schedDay} at ${schedTime} to ${fmt(recipients)} ${noun}. You can edit it any time before then.`}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={onExit}>Back to campaigns</Button>
              <Button variant="tertiary" onClick={() => { setSent(false); setStep(0); }}>Create another</Button>
            </div>
          </div>
          )}
        </div>
      </div>
    );
  }

  const stepBody = step === 0 ? audienceStep : step === 1 ? messageStep : reviewStep;
  return (
    <div className="osd-wiz" data-screen-label={`Campaign wizard · ${STEPS[step].label}`}>
      {editorOpen ? <TemplateEditor name={TEMPLATES.find((t) => t.id === tplId).name} onClose={() => setEditorOpen(false)} /> : null}
      <div className="osd-wiz__bar">
        <button type="button" className="osd-wiz__back" onClick={onExit}><Icon name="arrow-left" size={16} />Campaigns</button>
        <span className="osd-wiz__sep"></span>
        <div className="osd-wiz__name">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Campaign name" />
          <Icon name="pen-line" size={14} color="var(--text-tertiary)" />
        </div>
        <span className="osd-wiz__saved" style={{ marginLeft: 'auto' }}><Icon name="check" size={13} />Draft saved</span>
        <Button variant="tertiary" size="s" onClick={onExit}>Save &amp; exit</Button>
      </div>
      {centered ? <Stepper steps={STEPS.map((s) => s.label)} current={step} /> : null}
      <div className={centered ? 'osd-wiz__grid--centered' : 'osd-wiz__grid'}>
        {!centered ? (
          <nav className="osd-wiz__rail" aria-label="Campaign steps">
            {STEPS.map((s, i) => (
              <button key={s.label} type="button" disabled={i > step} onClick={() => i < step && setStep(i)}
                className={`osd-wstep${i === step ? ' osd-wstep--active' : ''}${i < step ? ' osd-wstep--done' : ''}`}>
                <span className="osd-wstep__dot">{i < step ? <Icon name="check" size={13} strokeWidth={2.5} /> : i + 1}</span>
                <span className="osd-wstep__txt"><b>{s.label}</b><span>{s.sub}</span></span>
              </button>
            ))}
          </nav>
        ) : null}
        <section className="osd-wiz__panel">
          <div className="osd-wiz__panelhead">
            <h2>{step === 0 ? 'Who gets this?' : step === 1 ? 'What are you sending?' : 'Ready to send?'}</h2>
            <p>{step === 0 ? 'Pick the campaign type, then choose segments, lists, contacts, or everyone.' : step === 1 ? (push ? 'Write the notification and set where it opens.' : 'Write the email and pick a template.') : 'Give it one last look — this is exactly what lands.'}</p>
          </div>
          {stepBody}
          <div className="osd-wiz__foot">
            {step > 0 ? <Button variant="secondary" icon="arrow-left" onClick={() => setStep(step - 1)}>Back</Button> : <span></span>}
            <span style={{ flex: 1 }}></span>
            {step < 2
              ? <Button trailingIcon="arrow-right" onClick={() => setStep(step + 1)} disabled={recipients === 0}>Continue</Button>
              : <Button icon={sendMode === 'now' ? 'send' : 'clock'} onClick={() => (sendMode === 'now' ? setSending(true) : setSent(true))}>{sendMode === 'now' ? `Send to ${fmt(recipients)} ${noun}` : 'Schedule campaign'}</Button>}
          </div>
        </section>
        {!centered ? summary : null}
      </div>
    </div>
  );
}
