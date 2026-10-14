import React from 'react';

const css = `
.os-check{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--font-sans);font-size:var(--text-body-s-size);color:var(--text-primary);}
.os-check--disabled{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-check__box{width:16px;height:16px;border-radius:var(--radius-sm);border:1px solid var(--border-strong);background:var(--bg-surface);
  display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:background var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard);}
.os-check input{position:absolute;opacity:0;width:0;height:0;}
.os-check input:focus-visible + .os-check__box{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-check--on .os-check__box{background:var(--action-primary);border-color:var(--action-primary);}
.os-check__mark{color:#fff;display:flex;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-check-css')) {
  const s = document.createElement('style'); s.id = 'os-check-css'; s.textContent = css; document.head.appendChild(s);
}

/** Checkbox — takes effect on save (use Switch for immediate effect). Supports indeterminate for tables. */
export function Checkbox({ label, checked, defaultChecked, indeterminate = false, onChange, disabled = false, style, className }) {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  const handle = (e) => {
    if (!isControlled) setInternal(e.target.checked);
    if (onChange) onChange(e.target.checked);
  };
  return (
    <label className={`os-check${on || indeterminate ? ' os-check--on' : ''}${disabled ? ' os-check--disabled' : ''}${className ? ' ' + className : ''}`} style={style}>
      <input type="checkbox" checked={on} onChange={handle} disabled={disabled} aria-checked={indeterminate ? 'mixed' : undefined} />
      <span className="os-check__box" aria-hidden="true">
        {indeterminate
          ? <svg className="os-check__mark" width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          : on
            ? <svg className="os-check__mark" width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5.2 4 7.7l4.5-5.4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : null}
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
