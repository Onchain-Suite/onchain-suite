import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-tag{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:var(--radius-sm);
  background:var(--neutral-100);color:var(--neutral-700);font-family:var(--font-sans);font-size:var(--text-label-s-size);font-weight:500;}
.os-tag__x{display:inline-flex;border:none;background:none;padding:0;margin-right:-2px;color:var(--neutral-500);cursor:pointer;border-radius:2px;}
.os-tag__x:hover{color:var(--neutral-800);}
.os-tag__x:focus-visible{outline:2px solid var(--border-focus);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-tag-css')) {
  const s = document.createElement('style'); s.id = 'os-tag-css'; s.textContent = css; document.head.appendChild(s);
}

/** User-assigned metadata label, optionally removable. */
export function Tag({ children, onRemove, style, className }) {
  return (
    <span className={`os-tag${className ? ' ' + className : ''}`} style={style}>
      {children}
      {onRemove ? (
        <button type="button" className="os-tag__x" aria-label={`Remove ${typeof children === 'string' ? children : 'tag'}`} onClick={onRemove}>
          <Icon name="x" size={16} strokeWidth={2} style={{ width: 12, height: 12 }} />
        </button>
      ) : null}
    </span>
  );
}
