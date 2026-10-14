import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-select{display:flex;flex-direction:column;gap:var(--space-1);font-family:var(--font-sans);}
.os-select__label{font-size:var(--text-label-m-size);font-weight:500;color:var(--text-primary);}
.os-select__wrap{position:relative;display:flex;align-items:center;}
.os-select__control{appearance:none;width:100%;height:36px;padding:0 32px 0 12px;background:var(--bg-surface);
  border:1px solid var(--border-default);border-radius:var(--radius-md);font-family:inherit;font-size:var(--text-body-s-size);
  color:var(--text-primary);cursor:pointer;transition:border-color var(--duration-fast) var(--ease-standard);}
.os-select__control:focus-visible{outline:none;border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.os-select__control:disabled{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-select__chev{position:absolute;right:10px;pointer-events:none;color:var(--text-tertiary);display:flex;}
.os-select__help{font-size:var(--text-body-s-size);color:var(--text-secondary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-select-css')) {
  const s = document.createElement('style'); s.id = 'os-select-css'; s.textContent = css; document.head.appendChild(s);
}

/** Native-style single choice for ≤ ~7 options. */
export function Select({ label, options = [], value, defaultValue, onChange, helper, disabled = false, style, className }) {
  return (
    <label className={`os-select${className ? ' ' + className : ''}`} style={style}>
      {label ? <span className="os-select__label">{label}</span> : null}
      <span className="os-select__wrap">
        <select className="os-select__control" value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled}>
          {options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span className="os-select__chev"><Icon name="chevron-down" size={16} /></span>
      </span>
      {helper ? <span className="os-select__help">{helper}</span> : null}
    </label>
  );
}
