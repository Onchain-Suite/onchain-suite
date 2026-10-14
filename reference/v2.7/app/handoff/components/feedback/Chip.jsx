import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:var(--radius-sm);
  background:var(--bg-surface);border:1px solid var(--border-default);color:var(--text-primary);
  font-family:var(--font-sans);font-size:var(--text-label-s-size);font-weight:500;cursor:pointer;
  transition:background var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard);}
.os-chip:hover{background:var(--surface-hover);}
.os-chip:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-chip--selected{background:var(--bg-selected);border-color:var(--action-primary);color:var(--action-primary);}
.os-chip__x{display:inline-flex;margin-right:-4px;border-radius:99px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-chip-css')) {
  const s = document.createElement('style'); s.id = 'os-chip-css'; s.textContent = css; document.head.appendChild(s);
}

/** Interactive filter/selection token. */
export function Chip({ selected = false, icon, children, onClick, onRemove, style, className }) {
  return (
    <button
      type="button"
      className={`os-chip${selected ? ' os-chip--selected' : ''}${className ? ' ' + className : ''}`}
      aria-pressed={selected}
      onClick={onRemove || onClick}
      style={style}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
      {onRemove ? <span className="os-chip__x"><Icon name="x" size={16} strokeWidth={2} style={{ width: 12, height: 12 }} /></span> : null}
    </button>
  );
}
