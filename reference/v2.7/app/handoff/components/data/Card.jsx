import React from 'react';

const css = `
.os-card{background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  font-family:var(--font-sans);box-sizing:border-box;}
.os-card--interactive{cursor:pointer;transition:box-shadow var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard);}
.os-card--interactive:hover{box-shadow:var(--elevation-1);border-color:var(--border-strong);}
.os-card__head{display:flex;align-items:center;gap:12px;padding:var(--space-card-padding);padding-bottom:0;}
.os-card__title{flex:1;font-size:var(--text-heading-m-size);line-height:var(--text-heading-m-line);font-weight:600;color:var(--text-primary);margin:0;}
.os-card__body{padding:var(--space-card-padding);}
.os-card__head + .os-card__body{padding-top:var(--space-4);}
.os-card__foot{padding:var(--space-4) var(--space-card-padding);border-top:1px solid var(--border-subtle);
  font-size:var(--text-body-s-size);color:var(--text-secondary);}
.os-card--compact .os-card__body{padding:var(--space-4);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-card-css')) {
  const s = document.createElement('style'); s.id = 'os-card-css'; s.textContent = css; document.head.appendChild(s);
}

/** Surface card — border, radius.lg, no resting shadow. */
export function Card({ title, actions, children, footer, interactive = false, compact = false, onClick, style, className }) {
  return (
    <div
      className={`os-card${interactive ? ' os-card--interactive' : ''}${compact ? ' os-card--compact' : ''}${className ? ' ' + className : ''}`}
      onClick={onClick}
      style={style}
    >
      {(title || actions) ? (
        <div className="os-card__head">
          {title ? <h3 className="os-card__title">{title}</h3> : null}
          {actions}
        </div>
      ) : null}
      <div className="os-card__body">{children}</div>
      {footer ? <div className="os-card__foot">{footer}</div> : null}
    </div>
  );
}
