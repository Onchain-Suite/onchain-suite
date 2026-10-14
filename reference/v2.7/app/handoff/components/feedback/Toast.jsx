import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { IconButton } from '../actions/IconButton.jsx';

const iconByStatus = { success: 'check-circle-2', info: 'info', warning: 'alert-triangle', error: 'x-circle' };
const colorByStatus = { success: 'var(--green-500)', info: 'var(--sky-500)', warning: 'var(--orange-500)', error: 'var(--red-500)' };

const css = `
.os-toast{display:flex;align-items:flex-start;gap:10px;width:360px;padding:12px 14px;background:var(--bg-surface);
  border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:var(--elevation-3);
  font-family:var(--font-sans);font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-primary);}
.os-toast__body{flex:1;display:flex;flex-direction:column;gap:2px;}
.os-toast__title{font-weight:600;}
.os-toast__desc{color:var(--text-secondary);}
.os-toast__action{border:none;background:none;padding:0;color:var(--text-link);font:inherit;font-weight:500;cursor:pointer;align-self:flex-start;}
.os-toast__action:hover{color:var(--text-link-hover);text-decoration:underline;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-toast-css')) {
  const s = document.createElement('style'); s.id = 'os-toast-css'; s.textContent = css; document.head.appendChild(s);
}

/** Transient outcome feedback. Stack max 3, bottom-right; errors persist until dismissed. */
export function Toast({ status = 'success', title, description, action, onAction, onDismiss, style, className }) {
  return (
    <div role="status" className={`os-toast${className ? ' ' + className : ''}`} style={style}>
      <Icon name={iconByStatus[status]} size={20} color={colorByStatus[status]} style={{ marginTop: 1 }} />
      <div className="os-toast__body">
        <span className="os-toast__title">{title}</span>
        {description ? <span className="os-toast__desc">{description}</span> : null}
        {action ? <button type="button" className="os-toast__action" onClick={onAction}>{action}</button> : null}
      </div>
      {onDismiss ? <IconButton icon="x" label="Dismiss" size="s" onClick={onDismiss} /> : null}
    </div>
  );
}
