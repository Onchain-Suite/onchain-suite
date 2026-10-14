import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-field{display:flex;flex-direction:column;gap:var(--space-1);font-family:var(--font-sans);}
.os-field__label{font-size:var(--text-label-m-size);line-height:var(--text-label-m-line);font-weight:500;color:var(--text-primary);}
.os-field__label em{font-style:normal;color:var(--text-tertiary);font-weight:400;}
.os-field__wrap{display:flex;align-items:center;height:36px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-md);
  transition:border-color var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard);}
.os-field__wrap:focus-within{border-color:var(--border-focus);box-shadow:0 0 0 3px var(--focus-ring);}
.os-field__wrap--error{border-color:var(--red-500);}
.os-field__wrap--disabled{opacity:var(--opacity-disabled);background:var(--bg-sunken);}
.os-field__input{flex:1;min-width:0;border:none;outline:none;background:transparent;padding:0 12px;height:100%;
  font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);}
.os-field__input::placeholder{color:var(--text-tertiary);}
.os-field__input--mono{font-family:var(--font-mono);font-size:var(--text-code-m-size);}
.os-field__affix{display:flex;align-items:center;padding:0 10px;color:var(--text-tertiary);font-size:var(--text-body-s-size);}
.os-field__affix--prefix{border-right:1px solid var(--border-subtle);}
.os-field__affix--suffix{border-left:1px solid var(--border-subtle);}
.os-field__help{font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);}
.os-field__error{font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--red-600);display:flex;align-items:center;gap:4px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-field-css')) {
  const s = document.createElement('style'); s.id = 'os-field-css'; s.textContent = css; document.head.appendChild(s);
}

let inputSeq = 0;

/** Text field with the shared field anatomy: top label → 36px control → helper/error. */
export function Input({ label, optional = false, placeholder, value, defaultValue, onChange, helper, error, prefix, suffix, icon, mono = false, disabled = false, type = 'text', style, className }) {
  const id = React.useRef('os-input-' + (++inputSeq)).current;
  return (
    <div className={`os-field${className ? ' ' + className : ''}`} style={style}>
      {label ? <label className="os-field__label" htmlFor={id}>{label}{optional ? <em> · optional</em> : null}</label> : null}
      <div className={`os-field__wrap${error ? ' os-field__wrap--error' : ''}${disabled ? ' os-field__wrap--disabled' : ''}`}>
        {icon ? <span className="os-field__affix" style={{ paddingRight: 0 }}><Icon name={icon} size={16} /></span> : null}
        {prefix ? <span className="os-field__affix os-field__affix--prefix">{prefix}</span> : null}
        <input
          id={id}
          className={`os-field__input${mono ? ' os-field__input--mono' : ''}`}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id + '-err' : helper ? id + '-help' : undefined}
          onChange={onChange}
        />
        {suffix ? <span className="os-field__affix os-field__affix--suffix">{suffix}</span> : null}
      </div>
      {error
        ? <span className="os-field__error" id={id + '-err'}><Icon name="alert-triangle" size={16} color="var(--red-600)" />{error}</span>
        : helper ? <span className="os-field__help" id={id + '-help'}>{helper}</span> : null}
    </div>
  );
}
