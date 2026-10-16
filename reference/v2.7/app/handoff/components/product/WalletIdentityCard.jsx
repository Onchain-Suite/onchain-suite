import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { Identicon } from '../data/Identicon.jsx';
import { AddressChip } from './AddressChip.jsx';
import { WalletHealthIndicator } from './WalletHealthIndicator.jsx';
import { Button } from '../actions/Button.jsx';

const css = `
.os-wallet{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  font-family:var(--font-sans);box-sizing:border-box;display:flex;flex-direction:column;}
.os-wallet__head{display:flex;align-items:center;gap:12px;padding:16px 20px;}
.os-wallet__id{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;}
.os-wallet__resolved{font-size:var(--text-caption-size);color:var(--text-tertiary);}
.os-wallet__stats{display:flex;border-top:1px solid var(--border-subtle);padding:12px 20px;gap:24px;}
.os-wallet__stat{display:flex;flex-direction:column;gap:1px;}
.os-wallet__stat b{font-size:var(--text-numeric-m-size);line-height:var(--text-numeric-m-line);font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-primary);}
.os-wallet__stat span{font-size:var(--text-caption-size);color:var(--text-secondary);}
.os-wallet__channels{display:flex;gap:8px;margin-left:auto;align-items:flex-end;color:var(--text-secondary);}
.os-wallet__channels .off{color:var(--neutral-300);}
.os-wallet__foot{display:flex;gap:8px;border-top:1px solid var(--border-subtle);padding:12px 20px;}
.os-wallet--row{flex-direction:row;align-items:center;}
.os-wallet--row .os-wallet__head{padding:10px 14px;flex:1;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-wallet-css')) {
  const s = document.createElement('style'); s.id = 'os-wallet-css'; s.textContent = css; document.head.appendChild(s);
}

const channelIcons = { email: 'mail', push: 'bell', xmtp: 'message-square', discord: 'message-circle' };

/** The atomic unit of the product: one resolved identity across chains and channels. */
export function WalletIdentityCard({ address = '', ens, health = 'healthy', resolved = '1 wallet · 1 channel', stats = [], channels = [], compact = false, onView, onAddToSegment, style, className }) {
  return (
    <div className={`os-wallet${compact ? ' os-wallet--row' : ''}${className ? ' ' + className : ''}`} style={style}>
      <div className="os-wallet__head">
        <Identicon address={address} size={compact ? 28 : 40} />
        <div className="os-wallet__id">
          <AddressChip address={address} label={ens} />
          <span className="os-wallet__resolved">{resolved}</span>
        </div>
        <WalletHealthIndicator state={health} size={compact ? 24 : 32} showLabel={!compact} />
      </div>
      {!compact && stats.length ? (
        <div className="os-wallet__stats">
          {stats.map((s, i) => (
            <span className="os-wallet__stat" key={i}><b>{s.value}</b><span>{s.label}</span></span>
          ))}
          {channels.length ? (
            <span className="os-wallet__channels">
              {channels.map((c, i) => (
                <Icon key={i} name={channelIcons[c.type] || 'message-square'} size={16} className={c.reachable === false ? 'off' : ''} label={c.type + (c.reachable === false ? ' (unreachable)' : '')} />
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
      {!compact && (onView || onAddToSegment) ? (
        <div className="os-wallet__foot">
          {onView ? <Button variant="secondary" size="s" onClick={onView}>View profile</Button> : null}
          {onAddToSegment ? <Button variant="tertiary" size="s" icon="users" onClick={onAddToSegment}>Add to segment</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
