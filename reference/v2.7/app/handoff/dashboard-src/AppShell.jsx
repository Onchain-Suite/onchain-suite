import React from 'react';
import { Icon } from '../../components/icons/Icon.jsx';
import { IconButton } from '../../components/actions/IconButton.jsx';

const css = `
.osd-shell{display:flex;height:100vh;overflow:hidden;background:var(--bg-page);font-family:var(--font-sans);}
.osd-side{width:260px;margin:16px 0 16px 16px;background:var(--bg-surface);border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg);box-shadow:var(--elevation-1);display:flex;flex-direction:column;box-sizing:border-box;flex-shrink:0;}
.osd-side__logo{padding:24px 24px 32px;display:flex;}
.osd-side__logo img{height:36px;}
.osd-side__nav{flex:1;padding:0 12px;display:flex;flex-direction:column;gap:2px;}
.osd-side__item{position:relative;display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:var(--radius-md);border:none;background:none;
  font-family:inherit;font-size:var(--text-label-m-size);font-weight:500;color:var(--text-secondary);cursor:pointer;text-align:left;width:100%;box-sizing:border-box;
  transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard);}
.osd-side__item:hover{background:var(--surface-hover);}
.osd-side__item:focus-visible{outline:2px solid var(--border-focus);outline-offset:-2px;}
.osd-side__item:hover{color:var(--text-primary);}
.osd-side__item--active{background:var(--bg-selected);color:var(--text-primary);}
.osd-side__item--active::before{content:'';position:absolute;left:-12px;top:8px;bottom:8px;width:2px;background:var(--orange-500);border-radius:0 2px 2px 0;}
.osd-side__item--active .osd-side__icn{color:var(--action-primary);}
.osd-side__icn{color:var(--text-secondary);display:flex;}
.osd-side__foot{padding:16px 24px 20px;display:flex;flex-direction:column;gap:18px;}
.osd-side__lock{color:var(--text-secondary);display:flex;padding-left:4px;}
.osd-side__user{display:flex;align-items:center;gap:12px;font-size:16px;font-weight:500;color:var(--text-primary);}
.osd-side__avatar{width:40px;height:40px;border-radius:var(--radius-round);background:var(--orange-600);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;flex-shrink:0;}
.osd-main{flex:1;display:flex;flex-direction:column;min-width:0;}
.osd-top{height:76px;display:flex;align-items:center;gap:14px;padding:0 28px;box-sizing:border-box;}
.osd-top__crumbs{display:flex;align-items:center;gap:8px;font-size:15px;color:var(--text-secondary);}
.osd-top__crumbs b{color:var(--text-primary);font-weight:500;}
.osd-top__ws{margin-left:auto;display:flex;align-items:center;gap:10px;background:var(--bg-surface);border:1px solid var(--border-default);
  border-radius:var(--radius-md);padding:7px 12px;cursor:pointer;box-shadow:var(--elevation-1);}
.osd-top__wsavatar{width:30px;height:30px;border-radius:var(--radius-round);background:var(--surface-subtle);color:var(--text-secondary);
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;}
.osd-top__wsname{display:flex;flex-direction:column;line-height:1.15;}
.osd-top__wsname b{font-size:14px;font-weight:600;color:var(--text-primary);}
.osd-top__wsname span{font-size:10px;letter-spacing:0.6px;text-transform:uppercase;color:var(--text-tertiary);}
.osd-top__wsname b + span{margin-top:1px;}
.osd-top__search{display:flex;align-items:center;gap:10px;width:300px;height:40px;background:var(--bg-surface);
  border:1px solid var(--border-default);border-radius:var(--radius-md);padding:0 14px;color:var(--text-tertiary);font-size:var(--text-body-s-size);cursor:text;box-sizing:border-box;}
.osd-top__kbd{margin-left:auto;font-family:var(--font-mono);font-size:12px;color:var(--text-tertiary);}
.osd-top__bell{position:relative;display:flex;}
.osd-top__badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:var(--radius-round);
  background:var(--action-primary);color:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;padding:0 4px;box-sizing:border-box;}
.osd-body{flex:1;overflow-y:auto;}
.osd-ov{position:fixed;inset:0;z-index:300;background:rgba(15,23,42,0.34);display:flex;justify-content:center;align-items:flex-start;padding-top:12vh;}
.osd-pal{width:min(560px,92vw);background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:var(--elevation-4,0 24px 60px rgba(15,23,42,0.28));overflow:hidden;}
.osd-pal__in{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--border-subtle);}
.osd-pal__in input{flex:1;border:none;outline:none;background:transparent;font-family:inherit;font-size:var(--text-body-m-size);color:var(--text-primary);}
.osd-pal__grp{padding:10px 12px;}
.osd-pal__lbl{font-size:var(--text-label-s-size);font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:var(--text-tertiary);padding:4px 8px;}
.osd-pal__row{display:flex;align-items:center;gap:12px;width:100%;border:none;background:none;font-family:inherit;font-size:var(--text-body-s-size);color:var(--text-primary);padding:9px 10px;border-radius:var(--radius-md);cursor:pointer;text-align:left;}
.osd-pal__row:hover,.osd-pal__row--on{background:var(--surface-hover);}
.osd-pal__ic{width:28px;height:28px;border-radius:var(--radius-sm);background:var(--surface-subtle);color:var(--text-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-pal__meta{flex:1;min-width:0;}
.osd-pal__meta span{font-size:var(--text-caption-size);color:var(--text-tertiary);display:block;}
.osd-pal__empty{padding:28px;text-align:center;color:var(--text-tertiary);font-size:var(--text-body-s-size);}
.osd-notif{position:absolute;top:52px;right:0;width:360px;background:var(--bg-surface);border:1px solid var(--border-default);border-radius:var(--radius-lg);box-shadow:var(--elevation-3,0 16px 40px rgba(15,23,42,0.2));z-index:60;overflow:hidden;}
.osd-notif__h{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border-subtle);font-size:var(--text-label-m-size);font-weight:600;color:var(--text-primary);}
.osd-notif__clear{margin-left:auto;border:none;background:none;font-family:inherit;font-size:var(--text-caption-size);font-weight:500;color:var(--action-primary);cursor:pointer;}
.osd-notif__row{display:flex;gap:11px;padding:12px 16px;border-bottom:1px solid var(--border-subtle);cursor:pointer;}
.osd-notif__row:last-child{border-bottom:none;}
.osd-notif__row:hover{background:var(--surface-hover);}
.osd-notif__ic{width:30px;height:30px;border-radius:var(--radius-round);background:var(--bg-selected);color:var(--action-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.osd-notif__tx{flex:1;min-width:0;font-size:var(--text-body-s-size);color:var(--text-primary);line-height:1.45;}
.osd-notif__tx time{display:block;font-size:var(--text-caption-size);color:var(--text-tertiary);margin-top:2px;}
.osd-notif__dot{width:7px;height:7px;border-radius:99px;background:var(--action-primary);flex-shrink:0;margin-top:6px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('osd-shell-css')) {
  const s = document.createElement('style'); s.id = 'osd-shell-css'; s.textContent = css; document.head.appendChild(s);
}

/** Product app shell recreated from screenshots: floating sidebar card + transparent top bar
    (workspace switcher · search ⌘K · notifications · theme toggle). */
export function AppShell({ nav = [], active, onNavigate, breadcrumbs = [], workspace = 'DatumLabs', user = 'Olusegun Aborode', notificationCount = 2, theme = 'light', onToggleTheme, logoSrc, children }) {
  const initials = user.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const wsInitials = workspace.slice(0, 2).toUpperCase();
  const [palette, setPalette] = React.useState(false);
  const [notif, setNotif] = React.useState(false);
  const [notifCount, setNotifCount] = React.useState(notificationCount);
  const [q, setQ] = React.useState('');
  React.useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === 'Escape') { setPalette(false); setNotif(false); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  const go = (id) => { setPalette(false); if (onNavigate) onNavigate(id); };
  const ql = q.toLowerCase();
  const navHits = nav.filter((n) => n.label.toLowerCase().includes(ql));
  const RESULTS = [
    { icon: 'megaphone', title: 'Pack drop — Season 2', sub: 'Campaign · Sending', go: 'campaigns' },
    { icon: 'users', title: 'Base whales', sub: 'Segment · 1,204 wallets', go: 'intelligence' },
    { icon: 'list', title: 'Season 2 waitlist', sub: 'List · 1,204 contacts', go: 'audience' },
    { icon: 'wallet', title: 'vitalik.eth', sub: 'Contact · 0x1A2b…9F3e', go: 'audience' },
    { icon: 'zap', title: 'Welcome new wallets', sub: 'Automation · Active', go: 'automations' },
  ];
  const resHits = RESULTS.filter((r) => r.title.toLowerCase().includes(ql) || r.sub.toLowerCase().includes(ql));
  const NOTIFS = [
    { icon: 'check', tx: 'Campaign “Pack drop — Season 2” finished sending to 1,546 wallets.', t: '12 min ago', unread: true },
    { icon: 'user-plus', tx: '38 new wallets joined via “Season 2 waitlist” form.', t: '1h ago', unread: true },
    { icon: 'sparkles', tx: 'Wallet enrichment complete — 128,540 wallets refreshed.', t: '2h ago', unread: false },
  ];
  return (
    <div className="osd-shell">
      <aside className="osd-side">
        <div className="osd-side__logo">{logoSrc ? <img src={logoSrc} alt="Onchain Suite" /> : null}</div>
        <nav className="osd-side__nav">
          {nav.map((item) => (
            <button key={item.id} className={`osd-side__item${active === item.id ? ' osd-side__item--active' : ''}`}
              aria-current={active === item.id ? 'page' : undefined}
              onClick={() => onNavigate && onNavigate(item.id)}>
              <span className="osd-side__icn"><Icon name={item.icon} size={20} /></span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="osd-side__foot">
          <span className="osd-side__lock"><Icon name="lock-open" size={20} /></span>
          <span className="osd-side__user"><span className="osd-side__avatar">{initials}</span>{user}</span>
        </div>
      </aside>
      <div className="osd-main">
        <header className="osd-top">
          {breadcrumbs.length ? (
            <nav className="osd-top__crumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 ? <span>/</span> : null}
                  {i === breadcrumbs.length - 1 ? <b>{c}</b> : <span style={{ cursor: 'pointer' }}>{c}</span>}
                </React.Fragment>
              ))}
            </nav>
          ) : null}
          <div className="osd-top__ws">
            <span className="osd-top__wsavatar">{wsInitials}</span>
            <span className="osd-top__wsname"><b>{workspace}</b><span>WORKSPACE</span></span>
            <Icon name="chevrons-up-down" size={16} color="var(--text-tertiary)" />
          </div>
          <div className="osd-top__search" role="button" tabIndex={0} onClick={() => setPalette(true)} onKeyDown={(e) => { if (e.key === 'Enter') setPalette(true); }}>
            <Icon name="search" size={20} />
            Search...
            <span className="osd-top__kbd">⌘ K</span>
          </div>
          <span className="osd-top__bell">
            <IconButton icon="bell" label="Notifications" onClick={() => { setNotif((v) => !v); setNotifCount(0); }} />
            {notifCount > 0 ? <span className="osd-top__badge">{notifCount}</span> : null}
            {notif ? (
              <div className="osd-notif" onMouseLeave={() => setNotif(false)}>
                <div className="osd-notif__h">Notifications<button type="button" className="osd-notif__clear" onClick={() => setNotif(false)}>Mark all read</button></div>
                {NOTIFS.map((n, i) => (
                  <div className="osd-notif__row" key={i}>
                    <span className="osd-notif__ic"><Icon name={n.icon} size={15} /></span>
                    <span className="osd-notif__tx">{n.tx}<time>{n.t}</time></span>
                    {n.unread ? <span className="osd-notif__dot"></span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </span>
          {onToggleTheme ? (
            <IconButton icon={theme === 'dark' ? 'moon' : 'sun'} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={onToggleTheme} />
          ) : null}
        </header>
        <main className="osd-body">{children}</main>
      </div>
      {palette ? (
        <div className="osd-ov" onClick={() => setPalette(false)}>
          <div className="osd-pal" onClick={(e) => e.stopPropagation()}>
            <div className="osd-pal__in">
              <Icon name="search" size={18} color="var(--text-tertiary)" />
              <input autoFocus placeholder="Search campaigns, wallets, segments, automations…" value={q} onChange={(e) => setQ(e.target.value)} />
              <span className="osd-top__kbd">ESC</span>
            </div>
            {navHits.length || resHits.length ? (
              <React.Fragment>
                {resHits.length ? (
                  <div className="osd-pal__grp">
                    <div className="osd-pal__lbl">Results</div>
                    {resHits.map((r) => (
                      <button key={r.title} type="button" className="osd-pal__row" onClick={() => go(r.go)}>
                        <span className="osd-pal__ic"><Icon name={r.icon} size={15} /></span>
                        <span className="osd-pal__meta">{r.title}<span>{r.sub}</span></span>
                        <Icon name="corner-down-left" size={14} color="var(--text-tertiary)" />
                      </button>
                    ))}
                  </div>
                ) : null}
                {navHits.length ? (
                  <div className="osd-pal__grp">
                    <div className="osd-pal__lbl">Go to</div>
                    {navHits.map((n) => (
                      <button key={n.id} type="button" className="osd-pal__row" onClick={() => go(n.id)}>
                        <span className="osd-pal__ic"><Icon name={n.icon} size={15} /></span>
                        <span className="osd-pal__meta">{n.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </React.Fragment>
            ) : (
              <div className="osd-pal__empty">No matches for “{q}”</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
