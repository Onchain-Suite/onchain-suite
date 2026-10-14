import React from 'react';

const css = `
.os-badge{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:var(--radius-sm);
  font-family:var(--font-sans);font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;white-space:nowrap;}
.os-badge__dot{width:6px;height:6px;border-radius:99px;background:currentColor;flex-shrink:0;}
.os-badge--success{background:var(--status-success-bg);color:var(--status-success-text);}
.os-badge--info{background:var(--status-info-bg);color:var(--status-info-text);}
.os-badge--warning{background:var(--status-warning-bg);color:var(--status-warning-text);}
.os-badge--error{background:var(--status-error-bg);color:var(--status-error-text);}
.os-badge--neutral{background:var(--surface-subtle);color:var(--text-secondary);}
@keyframes os-badge-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.os-badge--live .os-badge__dot{animation:os-badge-pulse 1.5s var(--ease-standard) infinite;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-badge-css')) {
  const s = document.createElement('style'); s.id = 'os-badge-css'; s.textContent = css; document.head.appendChild(s);
}

/** System-assigned status. Status vocabulary is fixed: success=active/delivered, info=scheduled/pending, warning=at-risk, error=failed, neutral=draft/paused. */
export function Badge({ status = 'neutral', dot = true, live = false, children, style, className }) {
  return (
    <span className={`os-badge os-badge--${status}${live ? ' os-badge--live' : ''}${className ? ' ' + className : ''}`} style={style}>
      {dot ? <span className="os-badge__dot" aria-hidden="true"></span> : null}
      {children}
    </span>
  );
}
