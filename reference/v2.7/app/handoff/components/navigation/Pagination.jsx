import React from 'react';
import { IconButton } from '../actions/IconButton.jsx';

const css = `
.os-pager{display:flex;align-items:center;gap:4px;font-family:var(--font-sans);font-size:var(--text-body-s-size);}
.os-pager__page{min-width:28px;height:28px;border:none;background:none;border-radius:var(--radius-md);color:var(--text-secondary);
  font-family:inherit;font-size:inherit;cursor:pointer;font-variant-numeric:tabular-nums;}
.os-pager__page:hover{background:var(--tint-hover);color:var(--text-primary);}
.os-pager__page:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px;}
.os-pager__page--active{background:var(--bg-selected);color:var(--action-primary);font-weight:600;}
.os-pager__ellipsis{color:var(--text-tertiary);padding:0 4px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-pager-css')) {
  const s = document.createElement('style'); s.id = 'os-pager-css'; s.textContent = css; document.head.appendChild(s);
}

/** Prev/next + numbered window. Default page size 25 for reference tables. */
export function Pagination({ page = 1, pageCount = 1, onChange, style, className }) {
  const go = (p) => { if (onChange && p >= 1 && p <= pageCount) onChange(p); };
  const windowPages = [];
  const lo = Math.max(1, Math.min(page - 2, pageCount - 4));
  const hi = Math.min(pageCount, lo + 4);
  for (let p = lo; p <= hi; p++) windowPages.push(p);
  return (
    <nav aria-label="Pagination" className={`os-pager${className ? ' ' + className : ''}`} style={style}>
      <IconButton icon="chevron-left" label="Previous page" size="s" disabled={page <= 1} onClick={() => go(page - 1)} />
      {lo > 1 ? <span className="os-pager__ellipsis">…</span> : null}
      {windowPages.map((p) => (
        <button key={p} className={`os-pager__page${p === page ? ' os-pager__page--active' : ''}`} aria-current={p === page ? 'page' : undefined} onClick={() => go(p)}>{p}</button>
      ))}
      {hi < pageCount ? <span className="os-pager__ellipsis">…</span> : null}
      <IconButton icon="chevron-right" label="Next page" size="s" disabled={page >= pageCount} onClick={() => go(page + 1)} />
    </nav>
  );
}
