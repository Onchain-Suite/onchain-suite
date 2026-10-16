import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { Button } from '../actions/Button.jsx';

const iconByStatus = { success: 'check-circle-2', info: 'info', warning: 'alert-triangle', error: 'x-circle' };

const css = `
.os-alert{display:flex;gap:10px;padding:12px 16px;border-radius:var(--radius-md);border:1px solid;border-left-width:3px;
  font-family:var(--font-sans);font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);align-items:flex-start;}
.os-alert__body{display:flex;flex-direction:column;gap:2px;flex:1;}
.os-alert__title{font-weight:600;}
.os-alert--success{background:var(--status-success-bg);border-color:var(--status-success-border);color:var(--status-success-text);}
.os-alert--info{background:var(--status-info-bg);border-color:var(--status-info-border);color:var(--status-info-text);}
.os-alert--warning{background:var(--status-warning-bg);border-color:var(--status-warning-border);color:var(--status-warning-text);}
.os-alert--error{background:var(--status-error-bg);border-color:var(--status-error-border);color:var(--status-error-text);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-alert-css')) {
  const s = document.createElement('style'); s.id = 'os-alert-css'; s.textContent = css; document.head.appendChild(s);
}

/** Persistent contextual status inside the page (banner). Use Toast for transient outcome feedback. */
export function Alert({ status = 'info', title, children, action, onAction, style, className }) {
  return (
    <div role="status" className={`os-alert os-alert--${status}${className ? ' ' + className : ''}`} style={style}>
      <Icon name={iconByStatus[status] || 'info'} size={16} style={{ marginTop: 2 }} />
      <div className="os-alert__body">
        {title ? <span className="os-alert__title">{title}</span> : null}
        {children ? <span>{children}</span> : null}
      </div>
      {action ? <Button variant="tertiary" size="s" onClick={onAction} style={{ color: 'inherit' }}>{action}</Button> : null}
    </div>
  );
}
