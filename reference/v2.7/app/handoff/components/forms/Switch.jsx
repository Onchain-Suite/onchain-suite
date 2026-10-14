import React from 'react';

const css = `
.os-switch{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--font-sans);font-size:var(--text-body-s-size);color:var(--text-primary);}
.os-switch--disabled{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-switch input{position:absolute;opacity:0;width:0;height:0;}
.os-switch__track{width:32px;height:18px;border-radius:var(--radius-round);background:var(--neutral-300);position:relative;flex-shrink:0;
  transition:background var(--duration-fast) var(--ease-standard);}
.os-switch input:focus-visible + .os-switch__track{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-switch__track::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:99px;background:#fff;
  box-shadow:var(--elevation-1);transition:transform var(--duration-base) var(--ease-standard);}
.os-switch--on .os-switch__track{background:var(--action-primary);}
.os-switch--on .os-switch__track::after{transform:translateX(14px);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-switch-css')) {
  const s = document.createElement('style'); s.id = 'os-switch-css'; s.textContent = css; document.head.appendChild(s);
}

/** Switch — immediate effect (checkbox = takes effect on save). */
export function Switch({ label, checked, defaultChecked, onChange, disabled = false, style, className }) {
  const [internal, setInternal] = React.useState(!!defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  return (
    <label className={`os-switch${on ? ' os-switch--on' : ''}${disabled ? ' os-switch--disabled' : ''}${className ? ' ' + className : ''}`} style={style}>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        disabled={disabled}
        onChange={(e) => { if (!isControlled) setInternal(e.target.checked); if (onChange) onChange(e.target.checked); }}
      />
      <span className="os-switch__track" aria-hidden="true"></span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
