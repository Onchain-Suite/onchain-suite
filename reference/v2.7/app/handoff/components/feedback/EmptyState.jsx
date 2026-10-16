import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { Button } from '../actions/Button.jsx';
import { Link } from '../actions/Link.jsx';

const css = `
.os-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:var(--space-10) var(--space-6);
  text-align:center;font-family:var(--font-sans);}
.os-empty__icon{width:48px;height:48px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);
  display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.os-empty__title{font-size:var(--text-heading-m-size);line-height:var(--text-heading-m-line);font-weight:600;color:var(--text-primary);}
.os-empty__desc{font-size:var(--text-body-s-size);line-height:var(--text-body-s-line);color:var(--text-secondary);max-width:360px;}
.os-empty__actions{display:flex;align-items:center;gap:16px;margin-top:8px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-empty-css')) {
  const s = document.createElement('style'); s.id = 'os-empty-css'; s.textContent = css; document.head.appendChild(s);
}

/** Empty state: 48px icon circle → heading → value explanation → primary action → docs link. */
export function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction, docsLabel, docsHref, style, className }) {
  return (
    <div className={`os-empty${className ? ' ' + className : ''}`} style={style}>
      <div className="os-empty__icon"><Icon name={icon} size={24} /></div>
      <span className="os-empty__title">{title}</span>
      {description ? <span className="os-empty__desc">{description}</span> : null}
      {(actionLabel || docsLabel) ? (
        <div className="os-empty__actions">
          {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
          {docsLabel ? <Link href={docsHref || '#'}>{docsLabel}</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
