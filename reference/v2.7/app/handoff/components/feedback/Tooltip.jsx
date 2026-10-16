import React from 'react';

const css = `
.os-tooltip{position:relative;display:inline-flex;}
.os-tooltip__bubble{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
  background:var(--navy-900);color:#fff;font-family:var(--font-sans);font-size:var(--text-label-s-size);line-height:var(--text-label-s-line);
  padding:5px 8px;border-radius:var(--radius-sm);max-width:240px;width:max-content;text-align:center;
  opacity:0;pointer-events:none;transition:opacity var(--duration-fast) var(--ease-standard) .2s;z-index:var(--z-tooltip);}
.os-tooltip:hover .os-tooltip__bubble,.os-tooltip:focus-within .os-tooltip__bubble{opacity:1;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-tooltip-css')) {
  const s = document.createElement('style'); s.id = 'os-tooltip-css'; s.textContent = css; document.head.appendChild(s);
}

/** Label-s tooltip on navy.900, 200ms delay. Never the only source of critical info. */
export function Tooltip({ content, children, style, className }) {
  return (
    <span className={`os-tooltip${className ? ' ' + className : ''}`} style={style}>
      {children}
      <span className="os-tooltip__bubble" role="tooltip">{content}</span>
    </span>
  );
}
