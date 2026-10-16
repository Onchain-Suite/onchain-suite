import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-menu{min-width:200px;background:var(--bg-raised);border:1px solid var(--border-default);border-radius:var(--radius-md);
  box-shadow:var(--elevation-2);padding:4px;font-family:var(--font-sans);z-index:var(--z-popover);}
.os-menu__item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:none;background:none;border-radius:var(--radius-sm);
  font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);cursor:pointer;text-align:left;box-sizing:border-box;}
.os-menu__item:hover{background:var(--tint-hover);}
.os-menu__item:focus-visible{outline:2px solid var(--border-focus);outline-offset:-2px;}
.os-menu__item--destructive{color:var(--red-600);}
.os-menu__item[disabled]{opacity:var(--opacity-disabled);cursor:not-allowed;}
.os-menu__sep{height:1px;background:var(--border-subtle);margin:4px 6px;}
.os-menu__group{padding:6px 10px 2px;font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;text-transform:uppercase;color:var(--text-tertiary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-menu-css')) {
  const s = document.createElement('style'); s.id = 'os-menu-css'; s.textContent = css; document.head.appendChild(s);
}

/** Dropdown menu panel — actions on an object. Destructive items red and last.
    items: { label, icon?, destructive?, disabled?, onSelect? } | { separator: true } | { group: 'Label' } */
export function Menu({ items = [], style, className }) {
  return (
    <div role="menu" className={`os-menu${className ? ' ' + className : ''}`} style={style}>
      {items.map((item, i) => {
        if (item.separator) return <div key={i} className="os-menu__sep" role="separator"></div>;
        if (item.group) return <div key={i} className="os-menu__group">{item.group}</div>;
        return (
          <button
            key={i}
            role="menuitem"
            className={`os-menu__item${item.destructive ? ' os-menu__item--destructive' : ''}`}
            disabled={item.disabled}
            onClick={item.onSelect}
          >
            {item.icon ? <Icon name={item.icon} size={16} /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
