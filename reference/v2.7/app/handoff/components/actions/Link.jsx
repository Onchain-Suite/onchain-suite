import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-link{color:var(--text-link);text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;gap:2px;
  transition:color var(--duration-fast) var(--ease-standard);}
.os-link:hover{color:var(--text-link-hover);text-decoration:underline;}
.os-link:focus-visible{outline:2px solid var(--border-focus);outline-offset:2px;border-radius:2px;}
.os-link--prose{text-decoration:underline;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-link-css')) {
  const s = document.createElement('style'); s.id = 'os-link-css'; s.textContent = css; document.head.appendChild(s);
}

/** Navigational link. Links navigate, never mutate. External links append arrow-up-right. */
export function Link({ href = '#', external = false, prose = false, children, onClick, style, className }) {
  return (
    <a
      className={`os-link${prose ? ' os-link--prose' : ''}${className ? ' ' + className : ''}`}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      onClick={onClick}
      style={style}
    >
      {children}
      {external ? <Icon name="arrow-up-right" size={16} strokeWidth={1.5} /> : null}
    </a>
  );
}
