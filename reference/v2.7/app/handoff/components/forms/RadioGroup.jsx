import React from 'react';

const css = `
.os-radio{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--font-sans);font-size:var(--text-body-s-size);color:var(--text-primary);}
.os-radio--disabled{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-radio input{position:absolute;opacity:0;width:0;height:0;}
.os-radio__dot{width:16px;height:16px;border-radius:var(--radius-round);border:1px solid var(--border-strong);background:var(--bg-surface);
  display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:border-color var(--duration-fast) var(--ease-standard);}
.os-radio input:focus-visible + .os-radio__dot{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-radio--on .os-radio__dot{border-color:var(--action-primary);border-width:2px;}
.os-radio--on .os-radio__dot::after{content:'';width:8px;height:8px;border-radius:99px;background:var(--action-primary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-radio-css')) {
  const s = document.createElement('style'); s.id = 'os-radio-css'; s.textContent = css; document.head.appendChild(s);
}

/** Radio group for 2–5 mutually exclusive visible options. */
export function RadioGroup({ name, options = [], value, defaultValue, onChange, disabled = false, direction = 'column', style, className }) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  return (
    <div role="radiogroup" className={className} style={Object.assign({ display: 'flex', flexDirection: direction, gap: direction === 'column' ? 8 : 16 }, style)}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const on = current === opt.value;
        return (
          <label key={opt.value} className={`os-radio${on ? ' os-radio--on' : ''}${disabled ? ' os-radio--disabled' : ''}`}>
            <input
              type="radio"
              name={name}
              checked={on}
              disabled={disabled}
              onChange={() => { if (!isControlled) setInternal(opt.value); if (onChange) onChange(opt.value); }}
            />
            <span className="os-radio__dot" aria-hidden="true"></span>
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}
