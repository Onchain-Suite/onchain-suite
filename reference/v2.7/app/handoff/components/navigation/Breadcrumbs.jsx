import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-crumbs{display:flex;align-items:center;gap:6px;font-family:var(--font-sans);font-size:var(--text-body-s-size);color:var(--text-secondary);}
.os-crumbs a{color:inherit;text-decoration:none;border-radius:2px;}
.os-crumbs a:hover{color:var(--text-primary);text-decoration:underline;}
.os-crumbs a:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-crumbs__current{color:var(--text-primary);font-weight:500;}
.os-crumbs__sep{color:var(--neutral-300);display:flex;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-crumbs-css')) {
  const s = document.createElement('style'); s.id = 'os-crumbs-css'; s.textContent = css; document.head.appendChild(s);
}

/** Breadcrumbs — on every detail page ≥2 levels deep. Last item is the current page. */
export function Breadcrumbs({ items = [], style, className }) {
  return (
    <nav aria-label="Breadcrumb" className={`os-crumbs${className ? ' ' + className : ''}`} style={style}>
      {items.map((item, i) => {
        const it = typeof item === 'string' ? { label: item } : item;
        const last = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 ? <span className="os-crumbs__sep" aria-hidden="true"><Icon name="chevron-right" size={16} strokeWidth={1.5} style={{ width: 14, height: 14 }} /></span> : null}
            {last
              ? <span className="os-crumbs__current" aria-current="page">{it.label}</span>
              : <a href={it.href || '#'}>{it.label}</a>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
