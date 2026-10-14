import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--radius-md);
  font-family:var(--font-sans);font-size:var(--text-label-m-size);line-height:var(--text-label-m-line);font-weight:500;
  border:1px solid transparent;cursor:pointer;position:relative;white-space:nowrap;
  transition:background var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard);}
.os-btn:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-btn[disabled]{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-btn--s{height:28px;padding:0 12px;font-size:12px;}
.os-btn--m{height:36px;padding:0 16px;}
.os-btn--l{height:44px;padding:0 20px;font-size:16px;}
.os-btn--primary{background:var(--action-primary);color:var(--text-on-brand);}
.os-btn--primary:hover:not([disabled]){background:var(--action-primary-hover);}
.os-btn--primary:active:not([disabled]){background:var(--action-primary-active);}
.os-btn--secondary{background:var(--bg-surface);border-color:var(--border-default);color:var(--text-primary);}
.os-btn--secondary:hover:not([disabled]){background:var(--surface-hover);}
.os-btn--secondary:active:not([disabled]){background:var(--surface-subtle);}
.os-btn--tertiary{background:transparent;color:var(--text-primary);}
.os-btn--tertiary:hover:not([disabled]){background:var(--tint-hover);}
.os-btn--tertiary:active:not([disabled]){background:var(--tint-pressed);}
.os-btn--destructive{background:var(--action-destructive);color:#fff;}
.os-btn--destructive:hover:not([disabled]){background:var(--action-destructive-hover);}
.os-btn--destructive-secondary{background:var(--bg-surface);border-color:var(--red-500);color:var(--red-600);}
.os-btn--destructive-secondary:hover:not([disabled]){background:var(--red-50);}
.os-btn--marketing{background:var(--gradient-core);color:#fff;border:none;}
.os-btn--marketing:hover:not([disabled]){filter:brightness(1.08);}
@keyframes os-btn-spin{to{transform:rotate(360deg)}}
.os-btn__spinner{width:14px;height:14px;border-radius:99px;border:2px solid currentColor;border-top-color:transparent;animation:os-btn-spin .7s linear infinite;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-btn-css')) {
  const s = document.createElement('style'); s.id = 'os-btn-css'; s.textContent = css; document.head.appendChild(s);
}

/** One button component, closed variant set. Buttons are verbs. One primary per view region. */
export function Button({ variant = 'primary', size = 'm', icon, trailingIcon, loading = false, disabled = false, children, onClick, type = 'button', style, className }) {
  const iconSize = size === 's' ? 16 : 20;
  return (
    <button
      type={type}
      className={`os-btn os-btn--${size} os-btn--${variant}${className ? ' ' + className : ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      style={style}
    >
      {loading ? <span className="os-btn__spinner" aria-hidden="true"></span> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {trailingIcon && !loading ? <Icon name={trailingIcon} size={iconSize} /> : null}
    </button>
  );
}
