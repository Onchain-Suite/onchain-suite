import React from 'react';

const css = `
.os-slider{display:flex;flex-direction:column;gap:var(--space-1);font-family:var(--font-sans);}
.os-slider__label{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;}
.os-slider__row{display:flex;align-items:center;gap:12px;}
.os-slider__value{width:64px;height:28px;border:1px solid var(--border-default);border-radius:var(--radius-md);
  font-family:var(--font-mono);font-size:12px;text-align:center;color:var(--text-primary);background:var(--bg-surface);}
.os-slider__value:focus-visible{outline:none;border-color:var(--border-focus);}
.os-slider input[type=range]{flex:1;appearance:none;height:4px;border-radius:99px;background:linear-gradient(to right,var(--action-primary) var(--os-fill,50%),var(--neutral-200) var(--os-fill,50%));outline-offset:4px;}
.os-slider input[type=range]::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:99px;background:#fff;border:2px solid var(--action-primary);cursor:grab;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-slider-css')) {
  const s = document.createElement('style'); s.id = 'os-slider-css'; s.textContent = css; document.head.appendChild(s);
}

/** Bounded numeric input with immediate feedback; always paired with an editable numeric input. */
export function Slider({ label, min = 0, max = 100, step = 1, value, defaultValue, onChange, unit, disabled = false, style, className }) {
  const [internal, setInternal] = React.useState(defaultValue != null ? defaultValue : min);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const set = (v) => {
    const n = Math.min(max, Math.max(min, Number(v) || 0));
    if (!isControlled) setInternal(n);
    if (onChange) onChange(n);
  };
  const pct = ((current - min) / (max - min)) * 100;
  return (
    <div className={`os-slider${className ? ' ' + className : ''}`} style={style}>
      {label ? <span className="os-slider__label">{label}{unit ? <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 12 }}>{unit}</span> : null}</span> : null}
      <div className="os-slider__row">
        <input
          type="range"
          min={min} max={max} step={step} value={current} disabled={disabled}
          style={{ '--os-fill': pct + '%' }}
          onChange={(e) => set(e.target.value)}
          aria-label={label}
        />
        <input className="os-slider__value" type="text" value={String(current)} disabled={disabled} onChange={(e) => set(e.target.value)} aria-label={(label || 'Value') + ' (numeric)'} />
      </div>
    </div>
  );
}
