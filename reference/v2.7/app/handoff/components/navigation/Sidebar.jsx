import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const css = `
.os-sidebar{width:240px;height:100%;background:var(--bg-surface);border-right:1px solid var(--border-default);
  display:flex;flex-direction:column;font-family:var(--font-sans);box-sizing:border-box;}
.os-sidebar__logo{padding:16px 16px 12px;display:flex;align-items:center;}
.os-sidebar__logo img{height:28px;}
.os-sidebar__nav{flex:1;padding:8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;}
.os-sidebar__item{position:relative;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--radius-md);
  border:none;background:none;font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);
  cursor:pointer;text-align:left;width:100%;box-sizing:border-box;transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard);}
.os-sidebar__item:hover{background:var(--tint-hover);color:var(--text-primary);}
.os-sidebar__item:focus-visible{outline:2px solid var(--border-focus);outline-offset:-2px;}
.os-sidebar__item--active{background:var(--bg-selected);color:var(--text-primary);}
.os-sidebar__item--active::before{content:'';position:absolute;left:-8px;top:6px;bottom:6px;width:2px;background:var(--orange-500);border-radius:0 2px 2px 0;}
.os-sidebar__count{margin-left:auto;font-size:var(--text-label-s-size);color:var(--text-tertiary);font-variant-numeric:tabular-nums;
  background:var(--surface-subtle);border-radius:var(--radius-sm);padding:1px 7px;}
.os-sidebar__item--active .os-sidebar__count{background:var(--blue-100);color:var(--blue-700);}
.os-sidebar__footer{border-top:1px solid var(--border-subtle);padding:10px 12px;display:flex;align-items:center;gap:10px;font-size:var(--text-body-s-size);color:var(--text-primary);cursor:pointer;}
.os-sidebar__footer:hover{background:var(--surface-hover);}
.os-sidebar__ws{width:24px;height:24px;border-radius:var(--radius-md);background:var(--gradient-core);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-sidebar-css')) {
  const s = document.createElement('style'); s.id = 'os-sidebar-css'; s.textContent = css; document.head.appendChild(s);
}

/** App sidebar: 240px, logo top, nav items with active left indicator, workspace switcher bottom. */
export function Sidebar({ items = [], active, onNavigate, logoSrc, workspace = 'Workspace', style, className }) {
  return (
    <aside className={`os-sidebar${className ? ' ' + className : ''}`} style={style}>
      <div className="os-sidebar__logo">{logoSrc ? <img src={logoSrc} alt="Onchain Suite" /> : <strong style={{ fontSize: 16, letterSpacing: '-0.25px' }}>Onchain Suite</strong>}</div>
      <nav className="os-sidebar__nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`os-sidebar__item${active === item.id ? ' os-sidebar__item--active' : ''}`}
            aria-current={active === item.id ? 'page' : undefined}
            onClick={() => onNavigate && onNavigate(item.id)}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
            {item.count != null ? <span className="os-sidebar__count">{item.count}</span> : null}
          </button>
        ))}
      </nav>
      <div className="os-sidebar__footer">
        <span className="os-sidebar__ws">{workspace.slice(0, 1).toUpperCase()}</span>
        <span style={{ flex: 1 }}>{workspace}</span>
        <Icon name="chevrons-up-down" size={16} color="var(--text-tertiary)" />
      </div>
    </aside>
  );
}
