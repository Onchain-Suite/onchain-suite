import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { IconButton } from '../../components/actions/IconButton.jsx';
import { Badge } from '../../components/feedback/Badge.jsx';
import { Chip } from '../../components/feedback/Chip.jsx';
import { Select } from '../../components/forms/Select.jsx';
import { RadioGroup } from '../../components/forms/RadioGroup.jsx';
import { Switch } from '../../components/forms/Switch.jsx';
import { Table } from '../../components/data/Table.jsx';
import { Identicon } from '../../components/data/Identicon.jsx';
import { AddressChip } from '../../components/product/AddressChip.jsx';
import { EmptyState } from '../../components/feedback/EmptyState.jsx';

const css = `
.osd-fm{max-width:1560px;margin:0 auto;padding:8px 40px 48px;display:flex;flex-direction:column;gap:var(--space-5);font-family:var(--font-sans);}
.osd-fm__head{display:flex;align-items:center;gap:16px;}
.osd-fm__head h1{margin:0;font-size:var(--text-heading-xl-size);line-height:var(--text-heading-xl-line);font-weight:600;letter-spacing:-0.5px;color:var(--text-primary);}
.osd-fm__strip{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);display:grid;grid-template-columns:repeat(4,1fr);}
.osd-fm__kpi{padding:16px 22px;display:flex;flex-direction:column;gap:4px;border-right:1px solid var(--border-subtle);}
.osd-fm__kpi:last-child{border-right:none;}
.osd-fm__kpi span{font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-fm__kpi b{font-size:24px;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;line-height:1.15;}
.osd-fm__type{display:inline-flex;align-items:center;gap:6px;font-size:var(--text-caption-size);font-weight:500;color:var(--text-secondary);}
.osd-fm__type i{display:flex;color:var(--text-tertiary);}
.osd-fm__conv{display:flex;flex-direction:column;gap:5px;min-width:120px;}
.osd-fm__conv b{font-size:var(--text-body-s-size);font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;}
.osd-fm__track{height:5px;border-radius:99px;background:var(--surface-subtle);overflow:hidden;}
.osd-fm__fill{height:100%;border-radius:99px;background:var(--action-primary);}
/* builder */
.osd-fb{position:fixed;inset:0;z-index:200;background:var(--bg-page);display:flex;flex-direction:column;font-family:var(--font-sans);}
.osd-fb__top{height:56px;display:flex;align-items:center;gap:12px;padding:0 16px;background:var(--bg-surface);border-bottom:1px solid var(--border-default);flex-shrink:0;}
.osd-fb__back{display:inline-flex;align-items:center;gap:8px;border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;padding:8px 10px;border-radius:var(--radius-md);}
.osd-fb__back:hover{background:var(--surface-hover);color:var(--text-primary);}
.osd-fb__name{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);border:1px solid transparent;border-radius:var(--radius-sm);background:none;font-family:inherit;padding:5px 8px;outline:none;min-width:180px;}
.osd-fb__name:hover{border-color:var(--border-default);}
.osd-fb__name:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);background:var(--bg-surface);}
.osd-fb__seg{display:inline-flex;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:3px;gap:2px;margin:0 auto;}
.osd-fb__seg button{display:inline-flex;align-items:center;gap:7px;border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:6px 14px;border-radius:var(--radius-sm);cursor:pointer;}
.osd-fb__seg button.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:var(--elevation-1);}
.osd-fb__body{flex:1;display:flex;min-height:0;}
.osd-fb__panel{width:340px;background:var(--bg-surface);border-right:1px solid var(--border-default);overflow-y:auto;flex-shrink:0;}
.osd-fb__sec{border-bottom:1px solid var(--border-subtle);padding:18px 20px;display:flex;flex-direction:column;gap:14px;}
.osd-fb__sec h3{margin:0;font-size:var(--text-label-s-size);font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);}
.osd-fb__row{display:flex;align-items:center;justify-content:space-between;gap:12px;}
.osd-fb__row label{font-size:var(--text-body-s-size);color:var(--text-primary);}
.osd-fb__field{display:flex;flex-direction:column;gap:6px;}
.osd-fb__field>span{font-size:var(--text-label-s-size);font-weight:500;color:var(--text-primary);}
.osd-fb__ta{width:100%;box-sizing:border-box;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);padding:8px 10px;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);outline:none;resize:vertical;line-height:1.5;}
.osd-fb__ta:focus{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-fb__sw{display:flex;flex-direction:column;gap:12px;}
.osd-fb__canvas{flex:1;overflow-y:auto;padding:44px 32px;display:flex;justify-content:center;background:var(--bg-page);}
.osd-fb__browser{width:100%;max-width:520px;height:fit-content;}
.osd-fb__chrome{display:flex;align-items:center;gap:6px;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-bottom:none;border-radius:var(--radius-md) var(--radius-md) 0 0;padding:9px 12px;}
.osd-fb__chrome i{width:9px;height:9px;border-radius:99px;background:var(--border-strong);display:inline-block;}
.osd-fb__url{margin-left:8px;font-size:11px;color:var(--text-tertiary);font-family:var(--font-mono);}
/* end-user form */
.osd-eu{background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:0 0 var(--radius-md) var(--radius-md);box-shadow:var(--elevation-2);padding:32px;display:flex;flex-direction:column;gap:18px;}
.osd-eu--embed{border-radius:var(--radius-lg);}
.osd-eu__brand{display:flex;align-items:center;gap:10px;}
.osd-eu__logo{width:32px;height:32px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;}
.osd-eu__brand b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-eu h2{margin:0;font-size:21px;font-weight:600;letter-spacing:-0.3px;color:var(--text-primary);}
.osd-eu p.sub{margin:-8px 0 0;font-size:var(--text-body-s-size);line-height:1.5;color:var(--text-secondary);}
.osd-eu__field{display:flex;flex-direction:column;gap:6px;}
.osd-eu__field label{font-size:var(--text-label-s-size);font-weight:500;color:var(--text-primary);}
.osd-eu__input{height:42px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-page);padding:0 12px;display:flex;align-items:center;color:var(--text-tertiary);font-size:var(--text-body-s-size);}
.osd-eu__wallet{height:48px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;gap:9px;font-size:var(--text-body-m-size);font-weight:600;color:#fff;}
.osd-eu__connected{display:flex;align-items:center;gap:10px;border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:10px 12px;background:var(--surface-subtle);}
.osd-eu__socials{display:flex;gap:8px;}
.osd-eu__social{flex:1;height:40px;border:1px solid var(--border-default);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;gap:7px;font-size:var(--text-body-s-size);font-weight:500;color:var(--text-primary);}
.osd-eu__consent{display:flex;align-items:flex-start;gap:9px;font-size:12px;line-height:1.5;color:var(--text-secondary);}
.osd-eu__box{width:16px;height:16px;border:1.5px solid var(--border-strong);border-radius:4px;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;color:#fff;}
.osd-eu__submit{height:46px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:var(--text-body-m-size);font-weight:600;color:#fff;}
.osd-eu__zk{display:flex;align-items:center;gap:7px;justify-content:center;font-size:11px;color:var(--text-tertiary);}
.osd-eu__thanks{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:16px 0;}
.osd-eu__thanks .ic{width:48px;height:48px;border-radius:99px;background:var(--bg-selected);display:flex;align-items:center;justify-content:center;}
/* share */
.osd-share{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:20px;width:100%;}
.osd-share__opt{display:flex;gap:14px;border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:18px;background:var(--bg-surface);}
.osd-share__ic{width:40px;height:40px;border-radius:var(--radius-md);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-share__opt b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-share__opt p{margin:3px 0 12px;font-size:var(--text-caption-size);color:var(--text-secondary);}
.osd-share__code{background:var(--neutral-900,#111);color:#e6e6e6;border-radius:var(--radius-md);padding:12px 14px;font-family:var(--font-mono);font-size:12px;line-height:1.6;overflow-x:auto;white-space:pre;}
.osd-share__link{display:flex;align-items:center;gap:8px;height:40px;border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 6px 0 12px;background:var(--bg-page);}
.osd-share__link span{flex:1;font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.osd-sub__empty{padding:60px;text-align:center;color:var(--text-tertiary);}
.osd-fb__ptabs{display:flex;gap:2px;padding:10px 12px 0;border-bottom:1px solid var(--border-subtle);position:sticky;top:0;background:var(--bg-surface);z-index:2;}
.osd-fb__ptabs button{border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;}
.osd-fb__ptabs button.on{color:var(--text-primary);border-bottom-color:var(--action-primary);}
.osd-fb__pal{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.osd-fb__palbtn{display:flex;align-items:center;gap:8px;padding:11px 10px;border:1px solid var(--border-default);border-radius:var(--radius-md);background:var(--bg-surface);font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--text-secondary);cursor:pointer;text-align:left;transition:border-color var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard);}
.osd-fb__palbtn:hover:not(:disabled){border-color:var(--action-primary);background:var(--bg-selected);color:var(--action-primary);}
.osd-fb__palbtn:disabled{opacity:0.4;cursor:not-allowed;}
.osd-fb__palbtn i{display:flex;color:var(--text-tertiary);flex-shrink:0;}
.osd-fb__palbtn:hover:not(:disabled) i{color:var(--action-primary);}
.osd-eu__blk{position:relative;border:1.5px solid transparent;border-radius:var(--radius-sm);margin:-2px -6px;padding:2px 6px;cursor:pointer;}
.osd-eu__blk:hover{border-color:var(--border-strong);}
.osd-eu__blk.on{border-color:var(--action-primary);}
.osd-eu__blktools{position:absolute;top:-11px;right:4px;display:none;gap:2px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-sm);box-shadow:var(--elevation-1);padding:2px;z-index:3;}
.osd-eu__blk.on .osd-eu__blktools{display:flex;}
.osd-eu__blktools button{width:22px;height:22px;border:none;background:none;border-radius:3px;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;}
.osd-eu__blktools button:hover:not(:disabled){background:var(--surface-hover);color:var(--text-primary);}
.osd-eu__blktools button:disabled{opacity:0.35;cursor:not-allowed;}
.osd-fb__insp{display:flex;flex-direction:column;gap:12px;background:var(--bg-selected);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:14px;}
.osd-fb__insp h4{margin:0;font-size:var(--text-label-s-size);font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:var(--action-primary);display:flex;align-items:center;gap:6px;}
.osd-fb__req{display:inline-block;color:var(--orange-600,#e0561a);margin-left:2px;}
.osd-fw__step{display:flex;align-items:center;gap:8px;margin:0 auto;}
.osd-fw__s{display:inline-flex;align-items:center;gap:7px;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-tertiary);}
.osd-fw__s.on{color:var(--text-primary);}
.osd-fw__s.done{color:var(--action-primary);}
.osd-fw__dot{width:18px;height:18px;border-radius:99px;border:2px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:10px;}
.osd-fw__s.on .osd-fw__dot{border-color:var(--action-primary);}
.osd-fw__s.done .osd-fw__dot{border-color:var(--action-primary);background:var(--action-primary);color:#fff;}
.osd-fw__body{flex:1;overflow-y:auto;padding:32px 40px 56px;}
.osd-fw__body h2{margin:0 0 20px;font-size:var(--text-heading-m-size);font-weight:600;color:var(--text-primary);}
.osd-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;max-width:1000px;}
.osd-card2{border:1.5px solid var(--border-default);border-radius:var(--radius-lg);background:var(--bg-surface);cursor:pointer;overflow:hidden;transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.osd-card2:hover{border-color:var(--border-strong);box-shadow:var(--elevation-1);}
.osd-card2.on{border-color:var(--action-primary);box-shadow:0 0 0 3px var(--focus-ring);}
.osd-card2__thumb{height:132px;background:var(--surface-subtle);border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}
.osd-card2__cap{padding:11px 14px;display:flex;flex-direction:column;gap:2px;}
.osd-card2__cap b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-card2__cap span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-fb__mock{position:relative;width:100%;max-width:640px;height:520px;background:var(--bg-page);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden;}
.osd-fb__mock--mobile{max-width:340px;}
.osd-fb__mocklines{position:absolute;inset:0;padding:26px;display:flex;flex-direction:column;gap:11px;opacity:0.55;}
.osd-fb__ml{height:9px;border-radius:3px;background:var(--border-subtle);}
.osd-fb__backdrop{position:absolute;inset:0;background:rgba(15,23,42,0.42);}
.osd-fb__pos{position:absolute;box-sizing:border-box;}
.osd-fb__pos--inline{position:relative;margin:60px auto;max-width:440px;}
.osd-fb__pos--popup{top:50%;left:50%;transform:translate(-50%,-50%);width:400px;}
.osd-fb__pos--slidein{right:18px;bottom:18px;width:320px;}
.osd-fb__pos--hellobar{top:0;left:0;right:0;}
.osd-fb__toolbar{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.osd-fb__dev{display:inline-flex;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:3px;gap:2px;}
.osd-fb__dev button{border:none;background:none;font-family:inherit;color:var(--text-secondary);padding:5px 10px;border-radius:var(--radius-sm);cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:var(--text-label-s-size);}
.osd-fb__dev button.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:var(--elevation-1);}
.osd-eu--hellobar{flex-direction:row;align-items:center;gap:14px;padding:14px 20px;box-shadow:none;border-radius:0;border-left:none;border-right:none;border-top:none;flex-wrap:wrap;}
.osd-eu--hellobar h2{font-size:16px;}
.osd-eu--hellobar .osd-eu__brand,.osd-eu--hellobar p.sub,.osd-eu--hellobar .osd-eu__zk{display:none;}
.osd-eu__hero{height:120px;border-radius:var(--radius-md);background:linear-gradient(135deg,var(--action-primary),#111);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:var(--text-caption-size);margin:-8px 0 4px;}
.osd-reach2{display:flex;flex-direction:column;gap:8px;background:var(--bg-selected);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:12px 14px;}
.osd-reach2 b{font-size:var(--text-label-s-size);font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);}
.osd-reach2__row{display:flex;align-items:center;gap:8px;font-size:var(--text-body-s-size);color:var(--text-primary);}
.osd-funnel{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--border-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:8px;}
.osd-funnel__c{background:var(--bg-surface);padding:18px 20px;display:flex;flex-direction:column;gap:5px;}
.osd-funnel__c span{font-size:var(--text-caption-size);color:var(--text-secondary);display:flex;align-items:center;gap:6px;}
.osd-funnel__c b{font-size:26px;font-weight:600;color:var(--text-primary);font-variant-numeric:tabular-nums;}
.osd-funnel__c i{font-style:normal;font-size:var(--text-caption-size);font-weight:500;color:var(--text-tertiary);}
.osd-swatches{display:flex;gap:8px;}
.osd-swatch{width:26px;height:26px;border-radius:var(--radius-sm);cursor:pointer;border:2px solid transparent;}
.osd-swatch.on{border-color:var(--text-primary);box-shadow:0 0 0 2px var(--bg-surface) inset;}
.osd-seg2{display:inline-flex;background:var(--surface-subtle);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:3px;gap:2px;width:100%;}
.osd-seg2 button{flex:1;border:none;background:none;font-family:inherit;font-size:var(--text-label-s-size);font-weight:500;color:var(--text-secondary);padding:6px 8px;border-radius:var(--radius-sm);cursor:pointer;}
.osd-seg2 button.on{background:var(--bg-surface);color:var(--text-primary);box-shadow:var(--elevation-1);}
.osd-fw__grid{display:grid;grid-template-columns:212px minmax(0,1fr) 300px;gap:var(--space-6,32px);align-items:start;padding:32px 40px 56px;max-width:1400px;margin:0 auto;}
.osd-fw__rail{display:flex;flex-direction:column;gap:4px;position:sticky;top:8px;}
.osd-fwr{display:flex;gap:12px;padding:11px 12px;border-radius:var(--radius-md);border:none;background:none;font-family:inherit;text-align:left;cursor:pointer;align-items:flex-start;width:100%;box-sizing:border-box;}
.osd-fwr:hover:not(:disabled){background:var(--surface-hover);}
.osd-fwr:disabled{cursor:default;}
.osd-fwr__n{width:22px;height:22px;border-radius:99px;border:2px solid var(--border-strong);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--text-tertiary);flex-shrink:0;}
.osd-fwr--active .osd-fwr__n{border-color:var(--action-primary);color:var(--action-primary);}
.osd-fwr--done .osd-fwr__n{border-color:var(--action-primary);background:var(--action-primary);color:#fff;}
.osd-fwr__t{display:flex;flex-direction:column;gap:1px;}
.osd-fwr__t b{font-size:var(--text-label-m-size);font-weight:600;color:var(--text-secondary);}
.osd-fwr--active .osd-fwr__t b,.osd-fwr--done .osd-fwr__t b{color:var(--text-primary);}
.osd-fwr__t span{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-fw__gbody h2{margin:0 0 20px;}
.osd-fw__gbody .osd-cards{grid-template-columns:repeat(2,1fr);gap:16px;max-width:none;}
.osd-fsum{position:sticky;top:8px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);overflow:hidden;}
.osd-fsum__h{padding:14px 18px;border-bottom:1px solid var(--border-subtle);font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:8px;}
.osd-fsum__b{padding:6px 18px 16px;}
.osd-fsum__row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-subtle);}
.osd-fsum__row:last-child{border-bottom:none;}
.osd-fsum__row dt{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.osd-fsum__row dd{margin:0;font-size:var(--text-body-s-size);font-weight:500;color:var(--text-primary);text-align:right;}
.osd-fsum__row dd.muted{color:var(--text-tertiary);font-weight:400;}
.osd-fsum__reach{display:flex;flex-direction:column;gap:5px;align-items:flex-end;}
.osd-fsum__reach span{display:inline-flex;align-items:center;gap:5px;font-size:var(--text-caption-size);font-weight:500;}`;
if (typeof document !== 'undefined') {
  const prev = document.getElementById('osd-fm-css');
  if (prev) prev.remove();
  const s = document.createElement('style'); s.id = 'osd-fm-css'; s.textContent = css; document.head.appendChild(s);
}

const TYPE_META = {
  identity: { icon: 'shield-check', label: 'Identity capture' },
  lead: { icon: 'mail', label: 'Lead capture' },
};
const FORMS = [
  { id: 'connect', name: 'Vault77 dapp connect', type: 'identity', surface: 'Widget', subs: '3,892', conv: 62, status: 'success', statusLabel: 'Live', automation: 'Welcome new wallets' },
  { id: 'waitlist', name: 'Season 2 waitlist', type: 'identity', surface: 'Hosted', subs: '1,204', conv: 38, status: 'success', statusLabel: 'Live', automation: 'Welcome new wallets' },
  { id: 'news', name: 'Newsletter signup', type: 'lead', surface: 'Widget', subs: '640', conv: 24, status: 'success', statusLabel: 'Live', automation: null },
  { id: 'airdrop', name: 'Airdrop eligibility', type: 'identity', surface: 'Hosted', subs: '512', conv: 44, status: 'neutral', statusLabel: 'Draft', automation: 'Post-purchase pack tips' },
];
const SUBS = [
  { addr: '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e', ens: 'vitalik.eth', email: 'v@ethereum.org', linked: 'Email · Farcaster', when: '14 min ago' },
  { addr: '0x8Cc47712bF3A0d2eE291B7A5C41f9E88Dd0121aB', ens: '', email: '—', linked: 'X (Twitter)', when: '1h ago' },
  { addr: '0xF31d99C02aE84b7cD1204E5F6a7B8C9D0E1F77c0', ens: 'nftmaxi.eth', email: 'max@proton.me', linked: 'Email', when: '3h ago' },
  { addr: '0x9E0fD34567812345aBcD6789Ef0123456789Cafe', ens: 'degen.eth', email: 'gm@degen.xyz', linked: 'Email · X', when: '6h ago' },
];

/** Forms — capture points that turn a visitor into a reachable, ZK-verified contact and can
    enrol them into an automation. Two types (identity / lead), two surfaces (widget / hosted). */
export function FormsScreen({ filled = true }) {
  const [mode, setMode] = React.useState('list');
  const [list, setList] = React.useState(FORMS);
  const [editing, setEditing] = React.useState(null);
  const open = (f) => { setEditing(f); setMode('builder'); };
  const newForm = () => open({ id: 'f' + Date.now(), name: 'Untitled form', type: 'identity', surface: 'Widget', subs: '0', conv: 0, status: 'neutral', statusLabel: 'Draft', automation: 'Welcome new wallets', isNew: true });
  const save = (data) => {
    setList((v) => (v.some((f) => f.id === data.id) ? v.map((f) => (f.id === data.id ? { ...f, ...data } : f)) : [{ ...data }, ...v]));
    setMode('list');
  };

  if (mode === 'builder') return <FormBuilder form={editing} onClose={() => setMode('list')} onSave={save} />;

  if (!filled && list === FORMS) {
    return (
      <div className="osd-fm" data-screen-label="Forms · empty">
        <div className="osd-fm__head"><h1>Forms</h1></div>
        <div style={{ marginTop: 40 }}>
          <EmptyState
            icon="clipboard-list"
            title="Create your first form"
            description="Forms are how visitors become reachable contacts — connect a wallet, consent, and link an email or social. Each verified link is ZK-proven, and new contacts can flow straight into an automation."
            actionLabel="New form"
            onAction={newForm}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="osd-fm" data-screen-label="Forms · list">
      <div className="osd-fm__head">
        <h1>Forms</h1>
        <span style={{ flex: 1 }}></span>
        <Button icon="plus" onClick={newForm}>New form</Button>
      </div>
      <div className="osd-fm__strip">
        <div className="osd-fm__kpi"><span>Total submissions · 30d</span><b>6,248</b></div>
        <div className="osd-fm__kpi"><span>Avg conversion</span><b>42%</b></div>
        <div className="osd-fm__kpi"><span>ZK-verified links</span><b>5,102</b></div>
        <div className="osd-fm__kpi"><span>Live forms</span><b>3</b></div>
      </div>
      <Table
        onRowClick={(r) => open(r)}
        columns={[
          { key: 'name', label: 'Form', render: (r) => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span> },
          { key: 'type', label: 'Type', render: (r) => <span className="osd-fm__type"><i><Icon name={TYPE_META[r.type].icon} size={14} /></i>{TYPE_META[r.type].label}</span> },
          { key: 'surface', label: 'Surface', render: (r) => <Chip icon={r.surface === 'Widget' ? 'code-xml' : 'globe'}>{r.surface}</Chip> },
          { key: 'subs', label: 'Submissions', numeric: true, render: (r) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{r.subs}</span> },
          { key: 'conv', label: 'Conversion', render: (r) => (
            <span className="osd-fm__conv"><b>{r.conv}%</b><span className="osd-fm__track"><span className="osd-fm__fill" style={{ width: `${r.conv}%` }}></span></span></span>
          ) },
          { key: 'automation', label: 'Enrols into', render: (r) => r.automation ? <span className="osd-fm__type"><i><Icon name="zap" size={13} /></i>{r.automation}</span> : <span style={{ color: 'var(--text-tertiary)' }}>—</span> },
          { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.statusLabel}</Badge> },
          { key: 'actions', label: '', render: () => <IconButton icon="ellipsis" label="Form actions" size="s" /> },
        ]}
        rows={list}
      />
    </div>
  );
}

const wire = (rows) => (
  <svg viewBox="0 0 120 96" style={{ width: '100%', height: '100%' }}>{rows}</svg>
);
const bar = (x, y, w, h, fill) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="2" fill={fill} />;
const G = 'var(--border-strong)', A = 'var(--action-primary)', L = 'var(--border-default)';
const STYLES = [
  { id: 'inline', name: 'Inline', desc: 'Sits within your page', thumb: wire([bar(20,14,80,5,L),bar(20,24,80,5,L),bar(20,38,80,12,'var(--bg-selected)'),bar(24,41,40,6,A),bar(20,58,80,5,L),bar(20,68,80,5,L)]) },
  { id: 'popup', name: 'Pop-up', desc: 'Centered modal overlay', thumb: wire([bar(6,10,108,76,'#e9e9ee'),bar(34,32,52,32,'var(--bg-surface)'),bar(40,40,40,5,G),bar(40,50,40,8,A)]) },
  { id: 'hellobar', name: 'Hello bar', desc: 'Sticky top banner', thumb: wire([bar(10,12,100,14,'var(--bg-selected)'),bar(16,17,44,5,A),bar(84,16,20,7,A),bar(20,36,80,5,L),bar(20,46,80,5,L),bar(20,56,80,5,L)]) },
  { id: 'slidein', name: 'Slide-in', desc: 'Corner slide-in card', thumb: wire([bar(20,14,80,5,L),bar(20,24,80,5,L),bar(20,34,80,5,L),bar(62,54,46,30,'var(--bg-surface)'),bar(68,60,34,5,G),bar(68,70,34,8,A)]) },
  { id: 'hosted', name: 'Hosted page', desc: 'Standalone link we host', thumb: wire([bar(6,10,108,12,'var(--surface-subtle)'),bar(12,14,10,4,G),bar(34,40,52,10,'var(--bg-surface)'),bar(40,43,24,4,G),bar(40,56,40,8,A)]) },
];
const TEMPLATES = [
  { id: 'basic', name: 'Basic', desc: 'Email + subscribe', type: 'lead' },
  { id: 'waitlist', name: 'Waitlist', desc: 'Connect wallet + email', type: 'identity' },
  { id: 'connect', name: 'Wallet connect', desc: 'Wallet-only gate', type: 'identity', fields: ['connect', 'consent'] },
  { id: 'airdrop', name: 'Airdrop eligibility', desc: 'Connect + verify + email', type: 'identity' },
  { id: 'newsletter', name: 'Newsletter', desc: 'Lead capture, styled', type: 'lead' },
];
const templateThumb = (t) => wire(
  t.type === 'identity'
    ? [bar(30,16,60,5,G),bar(30,26,60,4,L),bar(30,38,60,10,A),bar(30,54,60,7,'var(--bg-selected)'),bar(30,66,60,7,'var(--bg-selected)'),bar(30,80,60,8,A)]
    : [bar(20,30,58,10,'var(--bg-surface)'),bar(82,30,18,10,A),bar(20,48,80,4,L),bar(20,56,80,4,L)]
);

const FIELD_META = {
  connect: { icon: 'wallet', name: 'Connect wallet', fixed: true, canRequire: false },
  email: { icon: 'mail', name: 'Email', canRequire: true },
  socialX: { icon: 'twitter', name: 'Link X', canRequire: true },
  socialFc: { icon: 'radio', name: 'Link Farcaster', canRequire: true },
  text: { icon: 'type', name: 'Short text', canRequire: true },
  consent: { icon: 'shield-check', name: 'Consent', canRequire: true, fixed: true },
};
let fbId = 1;
const PROPERTIES = ['Do not store', 'Email', 'Display name', 'Twitter / X handle', 'Farcaster handle', 'Referral code', 'Custom property…'];
const defaultMap = { email: 'Email', text: 'Display name', socialX: 'Twitter / X handle', socialFc: 'Farcaster handle', connect: 'Wallet address', consent: 'Consent' };
const identityFields = () => [
  { id: 'f_c', type: 'connect', label: 'Connect wallet', required: true },
  { id: 'f_e', type: 'email', label: 'Email address', required: true },
  { id: 'f_x', type: 'socialX', label: 'Link X (Twitter)', required: false },
  { id: 'f_f', type: 'socialFc', label: 'Link Farcaster', required: false },
  { id: 'f_cons', type: 'consent', label: 'I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.', required: true },
];
const leadFields = () => [
  { id: 'f_e', type: 'email', label: 'Email address', required: true },
  { id: 'f_cons', type: 'consent', label: 'I agree to receive updates. I can unsubscribe any time.', required: true },
];

function FormBuilder({ form, onClose, onSave }) {
  const isNew = !!form.isNew;
  delete form.isNew;
  const [stage, setStage] = React.useState(isNew ? 'style' : 'content');
  const [style, setStyle] = React.useState('inline');
  const [template, setTemplate] = React.useState(null);
  const [tab, setTab] = React.useState('build');
  const [ptab, setPtab] = React.useState('fields');
  const [name, setName] = React.useState(form.name);
  const [type, setType] = React.useState(form.type);
  const [surface, setSurface] = React.useState(form.surface === 'Widget' ? 'widget' : 'hosted');
  const [title, setTitle] = React.useState(form.type === 'identity' ? 'Join Season 2' : 'Get the Vault77 newsletter');
  const [subtitle, setSubtitle] = React.useState(form.type === 'identity' ? 'Connect your wallet and link an email to claim your spot and get pack-drop alerts.' : 'Drops, tips, and pack news — straight to your inbox.');
  const [fields, setFields] = React.useState(form.type === 'identity' ? identityFields() : leadFields());
  const [sel, setSel] = React.useState(null);
  const [enrol, setEnrol] = React.useState(true);
  const [submitted, setSubmitted] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [device, setDevice] = React.useState('desktop');
  const [display, setDisplay] = React.useState({ trigger: 'load', delay: 3, scroll: 50, freq: 'once', pages: 'All pages' });
  const [styleCfg, setStyleCfg] = React.useState({ bg: 'surface', corners: 'md', btn: 'solid', hero: false, accent: '#FF6828' });
  const [doubleOptIn, setDoubleOptIn] = React.useState(false);
  const [postAction, setPostAction] = React.useState('message');
  const [toList, setToList] = React.useState('Season 2 waitlist');
  const [enrolAuto, setEnrolAuto] = React.useState('Welcome new wallets');
  const identity = type === 'identity';
  const accent = styleCfg.accent;
  const overlay = surface === 'widget' && (style === 'popup' || style === 'slidein' || style === 'hellobar');
  const radius = styleCfg.corners === 'sharp' ? '2px' : styleCfg.corners === 'pill' ? '18px' : 'var(--radius-md)';
  const euBg = styleCfg.bg === 'dark' ? '#16181d' : styleCfg.bg === 'tint' ? 'var(--bg-selected)' : 'var(--bg-surface)';
  const euText = styleCfg.bg === 'dark' ? '#fff' : 'var(--text-primary)';
  const reach = { email: fields.some((f) => f.type === 'email'), push: fields.some((f) => f.type === 'connect') };
  const selField = fields.find((f) => f.id === sel);
  const commit = (extra) => onSave({ ...form, name: name.trim() || 'Untitled form', type, surface: surface === 'widget' ? 'Widget' : 'Hosted', automation: enrol ? enrolAuto : null, ...extra });

  const switchType = (t) => {
    setType(t);
    setFields(t === 'identity' ? identityFields() : leadFields());
    setTitle(t === 'identity' ? 'Join Season 2' : 'Get the Vault77 newsletter');
    setSubtitle(t === 'identity' ? 'Connect your wallet and link an email to claim your spot and get pack-drop alerts.' : 'Drops, tips, and pack news — straight to your inbox.');
    setSel(null);
  };
  const addField = (fType) => {
    const node = { id: 'f' + fbId++, type: fType, label: FIELD_META[fType].name, required: false };
    const consentIdx = fields.findIndex((f) => f.type === 'consent');
    setFields((v) => { const at = consentIdx === -1 ? v.length : consentIdx; return [...v.slice(0, at), node, ...v.slice(at)]; });
    setSel(node.id); setPtab('fields');
  };
  const editField = (id, patch) => setFields((v) => v.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeField = (id) => { setFields((v) => v.filter((f) => f.id !== id)); setSel(null); };
  const moveField = (id, dir) => setFields((v) => {
    const i = v.findIndex((f) => f.id === id); const j = i + dir;
    if (j < 0 || j >= v.length) return v;
    const n = [...v]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const applyTemplate = (t) => {
    setTemplate(t.id);
    switchType(t.type);
    if (t.fields) setFields(t.fields.map((ft) => ({ id: 'f' + fbId++, type: ft, label: ft === 'consent' ? 'I agree to receive updates and consent to linking my wallet to my contact details. I can unsubscribe any time.' : FIELD_META[ft].name, required: ft !== 'socialX' && ft !== 'socialFc' })));
  };

  const pickStyle = (id) => { setStyle(id); setSurface(id === 'hosted' ? 'hosted' : 'widget'); };
  const styleStep = (
    <div className="osd-fw__gbody">
      <h2>Select a style</h2>
      <div className="osd-cards">
        {STYLES.map((s) => (
          <div key={s.id} className={`osd-card2${style === s.id ? ' on' : ''}`} onClick={() => pickStyle(s.id)}>
            <div className="osd-card2__thumb">{s.thumb}</div>
            <div className="osd-card2__cap"><b>{s.name}</b><span>{s.desc}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
  const templateStep = (
    <div className="osd-fw__gbody">
      <h2>Select a template</h2>
      <div className="osd-cards">
        {TEMPLATES.map((t) => (
          <div key={t.id} className={`osd-card2${template === t.id ? ' on' : ''}`} onClick={() => applyTemplate(t)}>
            <div className="osd-card2__thumb">{templateThumb(t)}</div>
            <div className="osd-card2__cap"><b>{t.name}</b><span>{t.desc}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
  const WSTEPS = [['style', 'Style', 'How it appears'], ['template', 'Template', 'Starting layout'], ['content', 'Content', 'Fields & settings']];
  const stageIdx = ['style', 'template', 'content'].indexOf(stage);
  const wizRail = (
    <nav className="osd-fw__rail" aria-label="Form steps">
      {WSTEPS.map(([id, l, sub], i) => (
        <button key={id} type="button" disabled={i >= stageIdx} onClick={() => i < stageIdx && setStage(id)}
          className={`osd-fwr${stage === id ? ' osd-fwr--active' : ''}${i < stageIdx ? ' osd-fwr--done' : ''}`}>
          <span className="osd-fwr__n">{i < stageIdx ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}</span>
          <span className="osd-fwr__t"><b>{l}</b><span>{sub}</span></span>
        </button>
      ))}
    </nav>
  );
  const tplName = template ? TEMPLATES.find((t) => t.id === template).name : null;
  const formSummary = (
    <aside className="osd-fsum">
      <div className="osd-fsum__h"><Icon name="clipboard-list" size={16} color="var(--action-primary)" />Form summary</div>
      <dl className="osd-fsum__b">
        <div className="osd-fsum__row"><dt>Name</dt><dd>{name.trim() || 'Untitled form'}</dd></div>
        <div className="osd-fsum__row"><dt>Style</dt><dd>{STYLES.find((s) => s.id === style).name}</dd></div>
        <div className="osd-fsum__row"><dt>Template</dt><dd className={tplName ? '' : 'muted'}>{tplName || 'Not selected'}</dd></div>
        <div className="osd-fsum__row"><dt>Type</dt><dd>{identity ? 'Identity capture' : 'Lead capture'}</dd></div>
        <div className="osd-fsum__row"><dt>Fields</dt><dd>{fields.length}</dd></div>
        <div className="osd-fsum__row"><dt>Makes reachable</dt><dd><span className="osd-fsum__reach">
          <span style={{ color: reach.email ? 'var(--action-primary)' : 'var(--text-tertiary)' }}><Icon name={reach.email ? 'check' : 'x'} size={12} />Email</span>
          <span style={{ color: reach.push ? 'var(--action-primary)' : 'var(--text-tertiary)' }}><Icon name={reach.push ? 'check' : 'x'} size={12} />Push</span>
        </span></dd></div>
        <div className="osd-fsum__row"><dt>Adds to list</dt><dd>{toList}</dd></div>
        <div className="osd-fsum__row"><dt>Enrols into</dt><dd className={enrol ? '' : 'muted'}>{enrol ? enrolAuto : 'None'}</dd></div>
      </dl>
    </aside>
  );
  const wizShell = (center) => (
    <div className="osd-fw__grid">{wizRail}{center}{formSummary}</div>
  );

  const renderField = (f) => {
    if (f.type === 'connect') return connected ? (
      <div className="osd-eu__connected">
        <Identicon address="0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e" size={26} />
        <AddressChip address="0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9F3e" label="vitalik.eth" />
        <span style={{ marginLeft: 'auto' }}><Icon name="check" size={16} color="var(--action-primary)" /></span>
      </div>
    ) : (
      <div className="osd-eu__wallet" style={{ background: accent, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setConnected(true); }}><Icon name="wallet" size={18} />{f.label}</div>
    );
    if (f.type === 'email' || f.type === 'text') return (
      <div className="osd-eu__field"><label>{f.label}{f.required ? <span className="osd-fb__req">*</span> : ''}</label><div className="osd-eu__input">{f.type === 'email' ? 'you@wallet.xyz' : 'Type here…'}</div></div>
    );
    if (f.type === 'socialX') return <div className="osd-eu__social" style={{ height: 40 }}><Icon name="twitter" size={15} />{f.label}</div>;
    if (f.type === 'socialFc') return <div className="osd-eu__social" style={{ height: 40 }}><Icon name="radio" size={15} />{f.label}</div>;
    if (f.type === 'consent') return (
      <div className="osd-eu__consent">
        <span className="osd-eu__box" style={{ background: accent, borderColor: accent }}><Icon name="check" size={11} strokeWidth={3} /></span>
        <span>{f.label}</span>
      </div>
    );
    return null;
  };

  const preview = submitted ? (
    <div className="osd-eu__thanks">
      <span className="ic"><Icon name="check" size={22} color="var(--action-primary)" strokeWidth={2.5} /></span>
      <h2>You're on the list</h2>
      <p className="sub">Thanks for joining — keep an eye on your inbox for what's next.</p>
      <Button variant="secondary" size="s" onClick={() => { setSubmitted(false); setConnected(false); }}>Reset preview</Button>
    </div>
  ) : (
    <React.Fragment>
      {styleCfg.hero ? <div className="osd-eu__hero">Hero image</div> : null}
      <div className="osd-eu__brand">
        <span className="osd-eu__logo" style={{ background: accent }}>V</span>
        <b style={{ color: euText }}>Vault77</b>
      </div>
      <h2 style={{ color: euText }}>{title}</h2>
      <p className="sub" style={styleCfg.bg === 'dark' ? { color: 'rgba(255,255,255,0.7)' } : undefined}>{subtitle}</p>
      {fields.map((f, i) => (
        <div key={f.id} className={`osd-eu__blk${sel === f.id ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); setSel(f.id); setPtab('fields'); }}>
          {renderField(f)}
          <div className="osd-eu__blktools">
            <button type="button" disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveField(f.id, -1); }} aria-label="Move up"><Icon name="chevron-up" size={14} /></button>
            <button type="button" disabled={i === fields.length - 1} onClick={(e) => { e.stopPropagation(); moveField(f.id, 1); }} aria-label="Move down"><Icon name="chevron-down" size={14} /></button>
            {FIELD_META[f.type].fixed ? null : <button type="button" onClick={(e) => { e.stopPropagation(); removeField(f.id); }} aria-label="Delete"><Icon name="trash-2" size={13} /></button>}
          </div>
        </div>
      ))}
      <div className="osd-eu__submit" style={{ background: styleCfg.btn === 'outline' ? 'transparent' : accent, color: styleCfg.btn === 'outline' ? accent : '#fff', border: styleCfg.btn === 'outline' ? `1.5px solid ${accent}` : 'none', borderRadius: radius, cursor: 'pointer' }} onClick={() => setSubmitted(true)}>{identity ? 'Verify & join' : 'Subscribe'}</div>
      {identity ? <div className="osd-eu__zk"><Icon name="shield-check" size={13} color="var(--action-primary)" />Verified with a zero-knowledge proof — your identity is never exposed</div> : null}
      {doubleOptIn && !identity ? <div className="osd-eu__zk"><Icon name="mail-check" size={13} color="var(--action-primary)" />We'll email a confirmation link before subscribing you</div> : null}
    </React.Fragment>
  );

  return (
    <div className="osd-fb" data-screen-label="Form builder">
      <div className="osd-fb__top">
        <button type="button" className="osd-fb__back" onClick={onClose}><Icon name="arrow-left" size={16} />Forms</button>
        <span style={{ width: 1, height: 20, background: 'var(--border-default)' }}></span>
        <input className="osd-fb__name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Form name" placeholder="Untitled form" />
        <Badge status={form.status}>{form.statusLabel}</Badge>
        {isNew && stage !== 'content' ? (
          <span style={{ flex: 1 }}></span>
        ) : (
          <div className="osd-fb__seg">
            {[['build', 'Build'], ['submissions', 'Submissions'], ['share', 'Share']].map(([id, l]) => (
              <button key={id} type="button" className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
            ))}
          </div>
        )}
        {stage === 'style' ? (
          <Button size="s" icon="arrow-right" onClick={() => setStage('template')}>Save &amp; next</Button>
        ) : stage === 'template' ? (
          <React.Fragment>
            <Button variant="secondary" size="s" onClick={() => setStage('style')}>Back</Button>
            <Button size="s" icon="arrow-right" disabled={!template} onClick={() => setStage('content')}>Save &amp; next</Button>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Button variant="secondary" size="s" icon={form.statusLabel === 'Live' ? 'pause' : 'play'} onClick={() => commit({ status: 'success', statusLabel: 'Live' })}>{form.statusLabel === 'Live' ? 'Pause' : 'Publish'}</Button>
            <Button size="s" icon="check" onClick={() => commit()}>Save</Button>
          </React.Fragment>
        )}
      </div>
      <div className="osd-fb__body">
        {stage === 'style' ? wizShell(styleStep) : stage === 'template' ? wizShell(templateStep) : tab === 'build' ? (
          <React.Fragment>
            <aside className="osd-fb__panel">
              <div className="osd-fb__ptabs">
                {[['fields', 'Fields'], ['display', 'Display'], ['settings', 'Settings']].map(([id, l]) => (
                  <button key={id} type="button" className={ptab === id ? 'on' : ''} onClick={() => setPtab(id)}>{l}</button>
                ))}
              </div>
              {ptab === 'fields' ? (
                <React.Fragment>
                  <div className="osd-fb__sec">
                    <h3>Add a field</h3>
                    <div className="osd-fb__pal">
                      {['email', 'text', 'socialX', 'socialFc', 'connect'].map((t) => {
                        const exists = FIELD_META[t].fixed && fields.some((f) => f.type === t);
                        const gated = (t === 'connect' || t === 'socialX' || t === 'socialFc') && !identity;
                        return (
                          <button key={t} type="button" className="osd-fb__palbtn" disabled={exists || gated} onClick={() => addField(t)}>
                            <i><Icon name={FIELD_META[t].icon} size={15} /></i>{FIELD_META[t].name}
                          </button>
                        );
                      })}
                    </div>
                    {!identity ? <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Wallet & social fields are available on Identity capture forms. Switch type under Settings.</p> : null}
                  </div>
                  {selField ? (
                    <div className="osd-fb__sec">
                      <h3>{FIELD_META[selField.type].name} field</h3>
                      <div className="osd-fb__insp">
                        <div className="osd-fb__field"><span>{selField.type === 'consent' ? 'Consent copy' : 'Label'}</span>
                          {selField.type === 'consent'
                            ? <textarea className="osd-fb__ta" rows={3} value={selField.label} onChange={(e) => editField(selField.id, { label: e.target.value })} />
                            : <input className="osd-fb__ta" value={selField.label} onChange={(e) => editField(selField.id, { label: e.target.value })} />}
                        </div>
                        {FIELD_META[selField.type].canRequire ? (
                          <div className="osd-fb__row"><label>Required</label><Switch checked={selField.required} onChange={(v) => editField(selField.id, { required: v })} /></div>
                        ) : null}
                        {selField.type !== 'consent' && selField.type !== 'connect' ? (
                          <div className="osd-fb__field"><span>Map to contact property</span>
                            <Select options={PROPERTIES} defaultValue={selField.map || defaultMap[selField.type]} onChange={(v) => editField(selField.id, { map: v })} />
                          </div>
                        ) : null}
                        {selField.type === 'consent' ? (
                          <p style={{ margin: 0, display: 'flex', gap: 6, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}><Icon name="shield-check" size={13} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />The wallet↔identity link is minted as a ZK proof, stored off-chain, deletable on unsubscribe.</p>
                        ) : null}
                        {FIELD_META[selField.type].fixed ? null : <Button variant="tertiary" size="s" icon="trash-2" onClick={() => removeField(selField.id)}>Remove field</Button>}
                      </div>
                    </div>
                  ) : (
                    <div className="osd-fb__sec"><p style={{ margin: 0, fontSize: 'var(--text-body-s-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Select a field in the preview to edit its label, mark it required, or remove it. Drag order with the ↑↓ controls.</p></div>
                  )}
                </React.Fragment>
              ) : ptab === 'display' ? (
                <React.Fragment>
                  <div className="osd-fb__sec">
                    <h3>Where it shows</h3>
                    <Select label="Pages" options={['All pages', 'Homepage only', 'Specific paths…', 'Everywhere except checkout']} defaultValue={display.pages} onChange={(v) => setDisplay((d) => ({ ...d, pages: v }))} />
                    {!overlay ? <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}><Icon name="info" size={12} /> {surface === 'hosted' ? 'Hosted pages open from their own link — timing rules below don\u2019t apply.' : 'Inline forms show in place — timing rules apply to overlays (Pop-up, Slide-in, Hello bar).'}</p> : null}
                  </div>
                  {overlay ? (
                    <React.Fragment>
                      <div className="osd-fb__sec">
                        <h3>When it appears</h3>
                        <RadioGroup name="trg" value={display.trigger} onChange={(v) => setDisplay((d) => ({ ...d, trigger: v }))}
                          options={[{ value: 'load', label: 'On page load' }, { value: 'delay', label: 'After a delay' }, { value: 'scroll', label: 'On scroll depth' }, { value: 'exit', label: 'On exit intent' }]} />
                        {display.trigger === 'delay' ? <div className="osd-fb__field"><span>Delay (seconds)</span><input className="osd-fb__ta" type="number" value={display.delay} onChange={(e) => setDisplay((d) => ({ ...d, delay: e.target.value }))} /></div> : null}
                        {display.trigger === 'scroll' ? <div className="osd-fb__field"><span>Scroll depth (%)</span><input className="osd-fb__ta" type="number" value={display.scroll} onChange={(e) => setDisplay((d) => ({ ...d, scroll: e.target.value }))} /></div> : null}
                      </div>
                      <div className="osd-fb__sec">
                        <h3>Frequency</h3>
                        <Select options={['Once per visitor', 'Once per session', 'Every visit', 'Until submitted']} defaultValue={display.freq === 'once' ? 'Once per visitor' : display.freq} onChange={(v) => setDisplay((d) => ({ ...d, freq: v }))} />
                        <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Visitors who already submitted are never shown the form again.</p>
                      </div>
                    </React.Fragment>
                  ) : null}
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <div className="osd-fb__sec">
                    <h3>Form type</h3>
                    <Select options={['Identity capture — wallet + verified link', 'Lead capture — email, wallet optional']} defaultValue={identity ? 'Identity capture — wallet + verified link' : 'Lead capture — email, wallet optional'} onChange={(v) => switchType(v.startsWith('Identity') ? 'identity' : 'lead')} />
                    <div className="osd-fb__field"><span>Surface</span>
                      <div style={{ display: 'inline-flex', background: 'var(--surface-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
                        {[['widget', 'Embed widget'], ['hosted', 'Hosted page']].map(([id, l]) => (
                          <button key={id} type="button" onClick={() => setSurface(id)} style={{ flex: 1, border: 'none', background: surface === id ? 'var(--bg-surface)' : 'none', boxShadow: surface === id ? 'var(--elevation-1)' : 'none', color: surface === id ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'inherit', fontSize: 'var(--text-label-s-size)', fontWeight: 500, padding: '7px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div className="osd-reach2">
                      <b>This form makes contacts</b>
                      <div className="osd-reach2__row"><Icon name={reach.email ? 'check' : 'x'} size={14} color={reach.email ? 'var(--action-primary)' : 'var(--text-tertiary)'} />Email-reachable {reach.email ? '' : '— add an Email field'}</div>
                      <div className="osd-reach2__row"><Icon name={reach.push ? 'check' : 'x'} size={14} color={reach.push ? 'var(--action-primary)' : 'var(--text-tertiary)'} />Push-reachable {reach.push ? '' : '— add Connect wallet'}</div>
                    </div>
                  </div>
                  <div className="osd-fb__sec">
                    <h3>Header</h3>
                    <div className="osd-fb__field"><span>Title</span><input className="osd-fb__ta" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                    <div className="osd-fb__field"><span>Subtitle</span><textarea className="osd-fb__ta" rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
                  </div>
                  <div className="osd-fb__sec">
                    <h3>Style</h3>
                    <div className="osd-fb__field"><span>Accent</span>
                      <div className="osd-swatches">{['#FF6828', '#111827', '#2563EB', '#16A34A'].map((c) => <span key={c} className={`osd-swatch${styleCfg.accent === c ? ' on' : ''}`} style={{ background: c }} onClick={() => setStyleCfg((s) => ({ ...s, accent: c }))}></span>)}</div>
                    </div>
                    <div className="osd-fb__field"><span>Background</span>
                      <div className="osd-seg2">{[['surface', 'Light'], ['tint', 'Tint'], ['dark', 'Dark']].map(([id, l]) => <button key={id} type="button" className={styleCfg.bg === id ? 'on' : ''} onClick={() => setStyleCfg((s) => ({ ...s, bg: id }))}>{l}</button>)}</div>
                    </div>
                    <div className="osd-fb__field"><span>Corners</span>
                      <div className="osd-seg2">{[['sharp', 'Sharp'], ['md', 'Rounded'], ['pill', 'Pill']].map(([id, l]) => <button key={id} type="button" className={styleCfg.corners === id ? 'on' : ''} onClick={() => setStyleCfg((s) => ({ ...s, corners: id }))}>{l}</button>)}</div>
                    </div>
                    <div className="osd-fb__field"><span>Button</span>
                      <div className="osd-seg2">{[['solid', 'Solid'], ['outline', 'Outline']].map(([id, l]) => <button key={id} type="button" className={styleCfg.btn === id ? 'on' : ''} onClick={() => setStyleCfg((s) => ({ ...s, btn: id }))}>{l}</button>)}</div>
                    </div>
                    <div className="osd-fb__row"><label>Hero image</label><Switch checked={styleCfg.hero} onChange={(v) => setStyleCfg((s) => ({ ...s, hero: v }))} /></div>
                  </div>
                  <div className="osd-fb__sec">
                    <h3>Consent & verification</h3>
                    {identity ? (
                      <p style={{ margin: 0, display: 'flex', gap: 6, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}><Icon name="shield-check" size={13} color="var(--action-primary)" style={{ flexShrink: 0, marginTop: 1 }} />Identity forms verify the wallet↔email link with a ZK proof at submit — no extra confirmation email needed.</p>
                    ) : (
                      <div className="osd-fb__row"><label>Double opt-in (email confirm)</label><Switch checked={doubleOptIn} onChange={setDoubleOptIn} /></div>
                    )}
                  </div>
                  <div className="osd-fb__sec">
                    <h3>Where contacts land</h3>
                    <div className="osd-fb__field"><span>Add subscribers to list</span>
                      <Select options={['Newsletter subscribers', 'Season 2 waitlist', 'Airdrop applicants', '+ Create new list…']} defaultValue={toList} onChange={setToList} />
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>Everyone who submits joins this list. Use lists to target campaigns and trigger automations.</p>
                    <Select label="Auto-tag new contacts" options={['season-2', 'waitlist', 'newsletter', 'No tag']} defaultValue="season-2" />
                  </div>
                  <div className="osd-fb__sec">
                    <h3>After submit</h3>
                    <div className="osd-fb__field"><span>On completion</span>
                      <Select options={['Show a message', 'Redirect to a URL', 'Reveal eligibility result']} defaultValue={postAction === 'message' ? 'Show a message' : postAction === 'redirect' ? 'Redirect to a URL' : 'Reveal eligibility result'} onChange={(v) => setPostAction(v.startsWith('Redirect') ? 'redirect' : v.startsWith('Reveal') ? 'reveal' : 'message')} />
                    </div>
                    {postAction === 'message' ? <div className="osd-fb__field"><span>Thank-you message</span><textarea className="osd-fb__ta" rows={2} defaultValue="You're on the list — keep an eye on your inbox for what's next." /></div> : null}
                    {postAction === 'redirect' ? <div className="osd-fb__field"><span>Redirect URL</span><input className="osd-fb__ta" defaultValue="https://vault77.com/welcome" /></div> : null}
                    {postAction === 'reveal' ? <p style={{ margin: 0, fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>After verifying, the visitor sees whether their wallet is eligible and, if so, their allowlist status — computed via ZK against your contracts.</p> : null}
                    <div className="osd-fb__row"><label>Enrol into automation</label><Switch checked={enrol} onChange={setEnrol} /></div>
                    {enrol ? <Select options={['Welcome new wallets', 'Post-purchase pack tips', 'Dormant 30d win-back']} defaultValue={enrolAuto} onChange={setEnrolAuto} /> : null}
                  </div>
                </React.Fragment>
              )}
            </aside>
            <div className="osd-fb__canvas" onClick={() => setSel(null)}>
              <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="osd-fb__toolbar" onClick={(e) => e.stopPropagation()}>
                  <div className="osd-fb__dev">
                    {[['desktop', 'monitor', 'Desktop'], ['mobile', 'smartphone', 'Mobile']].map(([id, ic, l]) => (
                      <button key={id} type="button" className={device === id ? 'on' : ''} onClick={() => setDevice(id)}><Icon name={ic} size={14} />{l}</button>
                    ))}
                  </div>
                  <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)' }}>{surface === 'hosted' ? 'Hosted page' : STYLES.find((s) => s.id === style).name + ' widget'}</span>
                </div>
                {surface === 'hosted' ? (
                  <div className="osd-fb__browser" onClick={(e) => e.stopPropagation()} style={device === 'mobile' ? { maxWidth: 340 } : undefined}>
                    <div className="osd-fb__chrome"><i></i><i></i><i></i><span className="osd-fb__url">forms.onchainsuite.xyz/vault77/season-2</span></div>
                    <div className="osd-eu osd-eu--embed" style={{ borderRadius: 0, background: euBg, color: euText }} onClick={(e) => e.stopPropagation()}>{preview}</div>
                  </div>
                ) : style === 'inline' ? (
                  <div className={`osd-fb__mock${device === 'mobile' ? ' osd-fb__mock--mobile' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className="osd-fb__mocklines">{[0.7, 0.5].map((w, i) => <div key={i} className="osd-fb__ml" style={{ width: `${w * 100}%` }}></div>)}</div>
                    <div className="osd-fb__pos--inline"><div className="osd-eu osd-eu--embed" style={{ borderRadius: radius, background: euBg, color: euText }}>{preview}</div></div>
                    <div className="osd-fb__mocklines" style={{ top: 'auto', bottom: 0 }}>{[0.6, 0.8, 0.4].map((w, i) => <div key={i} className="osd-fb__ml" style={{ width: `${w * 100}%` }}></div>)}</div>
                  </div>
                ) : (
                  <div className={`osd-fb__mock${device === 'mobile' ? ' osd-fb__mock--mobile' : ''}`} onClick={(e) => e.stopPropagation()}>
                    <div className="osd-fb__mocklines">{[0.7, 0.5, 0.8, 0.6, 0.75, 0.5].map((w, i) => <div key={i} className="osd-fb__ml" style={{ width: `${w * 100}%` }}></div>)}</div>
                    {style === 'popup' ? <div className="osd-fb__backdrop"></div> : null}
                    <div className={`osd-fb__pos osd-fb__pos--${style}`} style={device === 'mobile' && style !== 'hellobar' ? { width: 'auto', left: 16, right: 16, transform: style === 'popup' ? 'translateY(-50%)' : 'none', top: style === 'popup' ? '50%' : undefined } : undefined}>
                      <div className={`osd-eu${style === 'hellobar' ? ' osd-eu--hellobar' : ''}`} style={{ borderRadius: style === 'hellobar' ? 0 : radius, background: euBg, color: euText, boxShadow: 'var(--elevation-3)' }}>{preview}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </React.Fragment>
        ) : tab === 'submissions' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 'var(--text-heading-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>Performance</h2>
                <span style={{ flex: 1 }}></span>
                <button type="button" className="osd-fb__back" style={{ border: '1px solid var(--border-default)' }}><Icon name="calendar" size={15} color="var(--text-tertiary)" />Last 30 days<Icon name="chevron-down" size={14} color="var(--text-tertiary)" /></button>
                <Button variant="secondary" size="s" icon="download">Export CSV</Button>
              </div>
              <div className="osd-funnel">
                <div className="osd-funnel__c"><span><Icon name="eye" size={13} />Views</span><b>9,940</b><i>&nbsp;</i></div>
                <div className="osd-funnel__c"><span><Icon name="mouse-pointer-click" size={13} />Starts</span><b>5,120</b><i>51.5% of views</i></div>
                <div className="osd-funnel__c"><span><Icon name="check" size={13} />Completions</span><b>3,892</b><i>76.0% of starts · 39.2% overall</i></div>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 'var(--text-caption-size)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="trending-down" size={13} />Biggest drop-off: 4,820 visitors saw the form but didn't start (wallet connect step).</p>
              <h3 style={{ margin: '0 0 12px', fontSize: 'var(--text-label-m-size)', fontWeight: 600, color: 'var(--text-primary)' }}>Recent submissions</h3>
              <Table
                columns={[
                  { key: 'wallet', label: 'Wallet', render: (r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Identicon address={r.addr} size={22} /><AddressChip address={r.addr} label={r.ens || undefined} /></span> },
                  { key: 'email', label: 'Email', render: (r) => <span style={{ fontFamily: r.email === '—' ? 'inherit' : 'var(--font-mono)', fontSize: 13, color: r.email === '—' ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{r.email}</span> },
                  { key: 'linked', label: 'Linked via', render: (r) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="shield-check" size={13} color="var(--action-primary)" />{r.linked}</span> },
                  { key: 'when', label: 'Submitted', numeric: true, render: (r) => <span style={{ color: 'var(--text-secondary)' }}>{r.when}</span> },
                ]}
                rows={SUBS}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '36px 40px' }}>
            <div className="osd-share">
              {surface === 'widget' ? (
                <div className="osd-share__opt">
                  <span className="osd-share__ic"><Icon name="code-xml" size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>Embed widget</b>
                    <p>Paste this snippet into your site or dapp where the form should appear.</p>
                    <div className="osd-share__code">{'<script src="https://cdn.onchainsuite.xyz/forms.js"\n  data-form="vault77-connect"></script>'}</div>
                    <div style={{ marginTop: 10 }}><Button variant="secondary" size="s" icon="copy">Copy snippet</Button></div>
                  </div>
                </div>
              ) : (
                <div className="osd-share__opt">
                  <span className="osd-share__ic"><Icon name="globe" size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b>Hosted page</b>
                    <p>Share this link anywhere — no site needed. We host and secure the page.</p>
                    <div className="osd-share__link"><span>forms.onchainsuite.xyz/vault77/season-2</span><Button variant="secondary" size="s" icon="copy">Copy</Button></div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}><Button variant="secondary" size="s" icon="external-link">Open</Button><Button variant="tertiary" size="s" icon="qr-code">QR code</Button></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
