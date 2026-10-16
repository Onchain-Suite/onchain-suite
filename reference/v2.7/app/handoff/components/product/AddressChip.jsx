import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-addr{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-mono);font-size:var(--text-code-s-size);color:var(--text-primary);}
.os-addr__copy{display:inline-flex;border:none;background:none;padding:2px;border-radius:var(--radius-sm);color:var(--text-tertiary);cursor:pointer;}
.os-addr__copy:hover{color:var(--text-primary);background:var(--tint-hover);}
.os-addr__copy:focus-visible{outline:2px solid var(--border-focus);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-addr-css')) {
  const s = document.createElement('style'); s.id = 'os-addr-css'; s.textContent = css; document.head.appendChild(s);
}

export function truncateAddress(address = '') {
  return address.length > 12 ? address.slice(0, 6) + '…' + address.slice(-4) : address;
}

/** The canonical wallet-address display: mono, middle-truncated 6+4, always one click to copy. */
export function AddressChip({ address = '', label, copyable = true, style, className }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span className={`os-addr${className ? ' ' + className : ''}`} style={style} aria-label={address}>
      {label ? <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{label}</span> : null}
      {truncateAddress(address)}
      {copyable ? (
        <button type="button" className="os-addr__copy" aria-label="Copy address" title="Copy address" onClick={copy}>
          <Icon name={copied ? 'check' : 'copy'} size={16} strokeWidth={1.5} style={{ width: 13, height: 13 }} color={copied ? 'var(--green-500)' : undefined} />
        </button>
      ) : null}
    </span>
  );
}
