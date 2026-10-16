import React from 'react';

const css = `
.os-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-default);font-family:var(--font-sans);}
.os-tabs__tab{position:relative;border:none;background:none;padding:10px 12px;font-family:inherit;font-size:var(--text-label-m-size);
  font-weight:500;color:var(--text-secondary);cursor:pointer;transition:color var(--duration-fast) var(--ease-standard);}
.os-tabs__tab:hover{color:var(--text-primary);}
.os-tabs__tab:focus-visible{outline:2px solid var(--border-focus);outline-offset:-2px;border-radius:var(--radius-sm);}
.os-tabs__tab--active{color:var(--text-primary);}
.os-tabs__tab--active::after{content:'';position:absolute;left:8px;right:8px;bottom:-1px;height:2px;background:var(--action-primary);}
.os-tabs__count{margin-left:6px;font-size:var(--text-label-s-size);color:var(--text-tertiary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-tabs-css')) {
  const s = document.createElement('style'); s.id = 'os-tabs-css'; s.textContent = css; document.head.appendChild(s);
}

/** Underline tabs for peer views of one object. Never nest tabs. */
export function Tabs({ tabs = [], active, defaultActive, onChange, style, className }) {
  const [internal, setInternal] = React.useState(defaultActive != null ? defaultActive : (typeof tabs[0] === 'string' ? tabs[0] : (tabs[0] && tabs[0].id)));
  const isControlled = active !== undefined;
  const current = isControlled ? active : internal;
  return (
    <div role="tablist" className={`os-tabs${className ? ' ' + className : ''}`} style={style}>
      {tabs.map((t) => {
        const tab = typeof t === 'string' ? { id: t, label: t } : t;
        const on = current === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={on}
            className={`os-tabs__tab${on ? ' os-tabs__tab--active' : ''}`}
            onClick={() => { if (!isControlled) setInternal(tab.id); if (onChange) onChange(tab.id); }}
          >
            {tab.label}
            {tab.count != null ? <span className="os-tabs__count">{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
