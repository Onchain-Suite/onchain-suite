import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-iconbtn{display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-md);
  background:transparent;border:1px solid transparent;color:var(--text-secondary);cursor:pointer;
  transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard);}
.os-iconbtn:hover:not([disabled]){background:var(--tint-hover);color:var(--text-primary);}
.os-iconbtn:active:not([disabled]){background:var(--tint-pressed);}
.os-iconbtn:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-iconbtn[disabled]{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-iconbtn--bordered{border-color:var(--border-default);background:var(--bg-surface);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-iconbtn-css')) {
  const s = document.createElement('style'); s.id = 'os-iconbtn-css'; s.textContent = css; document.head.appendChild(s);
}

/** Square icon-only button for dense repeated actions (copy, expand, row menus). Label is mandatory. */
export function IconButton({ icon, label, size = 'm', bordered = false, disabled = false, onClick, style, className }) {
  const px = size === 's' ? 28 : 36;
  return (
    <button
      type="button"
      className={`os-iconbtn${bordered ? ' os-iconbtn--bordered' : ''}${className ? ' ' + className : ''}`}
      style={Object.assign({ width: px, height: px }, style)}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={size === 's' ? 16 : 20} />
    </button>
  );
}
