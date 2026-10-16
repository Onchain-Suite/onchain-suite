import React from 'react';
import { Icon } from '../icons/Icon.jsx';
import { IconButton } from '../actions/IconButton.jsx';
import { Breadcrumbs } from './Breadcrumbs.jsx';

const css = `
.os-topbar{height:56px;background:var(--bg-surface);border-bottom:1px solid var(--border-default);
  display:flex;align-items:center;gap:16px;padding:0 20px;font-family:var(--font-sans);box-sizing:border-box;}
.os-topbar__search{display:flex;align-items:center;gap:8px;height:32px;width:280px;margin-left:auto;
  border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 10px;background:var(--bg-page);
  color:var(--text-tertiary);font-size:var(--text-body-s-size);cursor:text;}
.os-topbar__kbd{margin-left:auto;font-family:var(--font-mono);font-size:11px;background:var(--bg-surface);
  border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:1px 5px;color:var(--text-tertiary);}
.os-topbar__env{height:22px;display:inline-flex;align-items:center;padding:0 10px;border-radius:var(--radius-sm);
  background:var(--status-warning-bg);color:var(--status-warning-text);border:1px solid var(--status-warning-border);
  font-size:var(--text-label-s-size);font-weight:500;letter-spacing:0.2px;}
.os-topbar__avatar{width:32px;height:32px;border-radius:var(--radius-round);background:var(--blue-100);color:var(--blue-700);
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;cursor:pointer;}
`;
if (typeof document !== 'undefined' && !document.getElementById('os-topbar-css')) {
  const s = document.createElement('style'); s.id = 'os-topbar-css'; s.textContent = css; document.head.appendChild(s);
}

/** App top bar: breadcrumb left · ⌘K search · env indicator · theme toggle · notifications · avatar. */
export function TopBar({ breadcrumbs = [], env, user = 'OS', notificationCount = 0, theme, onToggleTheme, style, className }) {
  return (
    <header className={`os-topbar${className ? ' ' + className : ''}`} style={style}>
      <Breadcrumbs items={breadcrumbs} />
      <div className="os-topbar__search" role="button" tabIndex={0}>
        <Icon name="search" size={16} />
        Search
        <span className="os-topbar__kbd">⌘K</span>
      </div>
      {env ? <span className="os-topbar__env">{env}</span> : null}
      {onToggleTheme ? (
        <IconButton
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        />
      ) : null}
      <div style={{ position: 'relative', display: 'flex' }}>
        <IconButton icon="bell" label="Notifications" />
        {notificationCount > 0 ? <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: 'var(--orange-500)', border: '2px solid var(--bg-surface)' }}></span> : null}
      </div>
      <span className="os-topbar__avatar">{user.slice(0, 2).toUpperCase()}</span>
    </header>
  );
}
