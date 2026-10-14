import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Icon, type IconName } from '../components/icons';
import { IconButton } from '../components/ui';
import { Toaster } from '../components/toast';
import { useTheme } from '../theme';
import { IntelligencePanel } from '../components/IntelligencePanel';
import { GettingStarted } from '../components/GettingStarted';
import { CerebraTour } from '../components/CerebraTour';
import { TOUR, anchorOf, startTour, useTour } from '../data/tour';
import { useWorkspaceMode } from '../data/workspace';
import logoUrl from '../assets-logo.svg';

interface NavItem { to: string; label: string; icon: IconName; soon?: boolean }

/* The sidebar: every destination is one click.
 *
 * Campaigns used to own Loops and Forms as sub-routes, on the theory that both are
 * ways of running a campaign. That theory cost three clicks to reach a thing people reach
 * constantly, and it only worked if you were already in Campaigns — from Intelligence or
 * Settings you had to go through a screen you did not want to arrive at a screen you did.
 * Grouping was solving a list-length problem that the collapsible sidebar already solves.
 *
 * The names are the plain ones where a plain one exists: Analytics is the numbers,
 * Integrations is what plugs in. Loops keeps its product name. */
const NAV: NavItem[] = [
  { to: '/home', label: 'Home', icon: 'layout-grid' },
  { to: '/campaigns', label: 'Campaigns', icon: 'megaphone' },
  { to: '/automations', label: 'Loops', icon: 'zap' },
  { to: '/forms', label: 'Forms', icon: 'clipboard-list' },
  { to: '/audience', label: 'Audience', icon: 'users' },
  { to: '/intelligence', label: 'Intelligence', icon: 'brain' },
  { to: '/analytics', label: 'Analytics', icon: 'line-chart' },
  { to: '/integrations', label: 'Integrations', icon: 'database' },
];

/** Every route's breadcrumb, including ones with no nav row of their own in 2.5. */
const CRUMB: Record<string, string> = {
  '/dashboard': 'Dashboard', '/home': 'Home', '/campaigns': 'Campaigns', '/audience': 'Audience',
  '/forms': 'Forms', '/automations': 'Loops', '/analytics': 'Analytics',
  '/settings': 'Settings', '/integrations': 'Integrations', '/data': 'Integrations',
};

/* Everywhere you can go, regardless of what the sidebar shows.
 *
 * The command palette used to search the nav array, which meant 2.5 folding Settings,
 * Forms and Automations out of the sidebar silently deleted them from ⌘K as well —
 * searching "settings" returned "No matches" for a screen that still exists. The palette
 * is the keyboard route to *any* destination, so it searches the full set and the sidebar
 * decides only what gets a permanent row. */
function destinations(): NavItem[] {
  return [
    { to: '/home', label: 'Home', icon: 'layout-grid' },
    { to: '/integrations', label: 'Integrations', icon: 'database' },
    { to: '/campaigns', label: 'Campaigns', icon: 'megaphone' },
    { to: '/automations', label: 'Loops', icon: 'zap' },
    { to: '/forms', label: 'Forms', icon: 'clipboard-list' },
    { to: '/audience', label: 'Audience', icon: 'users' },
    { to: '/intelligence', label: 'Intelligence', icon: 'brain' },
    { to: '/analytics', label: 'Analytics', icon: 'line-chart' },
    { to: '/settings', label: 'Settings', icon: 'settings-2' },
  ];
}

const NOTIFS = [
  { icon: 'check-circle-2', tx: 'Campaign “Pack drop: Season 2” finished sending to 1,546 wallets.', t: '12 min ago' },
  { icon: 'users', tx: '38 new wallets joined via the “Season 2 waitlist” form.', t: '1h ago' },
  { icon: 'sparkles', tx: 'Wallet enrichment complete: 128,540 wallets refreshed.', t: '2h ago' },
] as const;

const CMD_RESULTS = [
  { icon: 'megaphone', title: 'Pack drop: Season 2', sub: 'Campaign · Scheduled', to: '/campaigns' },
  { icon: 'users', title: 'Base whales', sub: 'Segment · 1,040 wallets', to: '/intelligence' },
  { icon: 'list', title: 'Season 2 waitlist', sub: 'List · contacts', to: '/audience' },
  { icon: 'zap', title: 'Welcome new wallets', sub: 'Loop · Active', to: '/automations' },
] as const;

export function Shell() {
  const { theme, toggle } = useTheme();
  const loc = useLocation();
  const nav = useNavigate();
  const onHome = loc.pathname === '/home' || loc.pathname === '/dashboard';
  /* First login into an empty workspace starts Cerebra's tour on its own — on Home, where
     onboarding lands, and only there: a deep link into Campaigns should open Campaigns, not
     be pulled back to the tour's first stop. Once skipped or finished it stays away; Home and
     Settings can start it again. */
  const workspace = useWorkspaceMode();
  const tour = useTour();
  useEffect(() => {
    if (workspace === 'empty' && onHome && !tour.done && !tour.active) startTour();
  }, [workspace, onHome, tour.done, tour.active]);
  const touring = tour.active && TOUR[tour.index] ? anchorOf(TOUR[tour.index]) : undefined;
  const notifs = workspace === 'empty' ? [] : NOTIFS;
  const items = NAV;
  const [palette, setPalette] = useState(false);
  const [notif, setNotif] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('os-nav-collapsed') === '1'; } catch { return false; }
  });
  const toggleNav = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem('os-nav-collapsed', next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });

  const crumb = useMemo(() => {
    if (loc.pathname.startsWith('/intelligence')) return 'Intelligence';
    if (loc.pathname.startsWith('/analytics')) return 'Analytics';
    if (loc.pathname.startsWith('/dashboard')) return 'Home';
    const hit = Object.keys(CRUMB).find((p) => loc.pathname.startsWith(p));
    return hit ? CRUMB[hit] : loc.pathname.startsWith('/intelligence') ? 'Intelligence' : 'Dashboard';
  }, [loc.pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className={`shell${collapsed ? ' shell--rail' : ''}`}>
      <a href="#main" className="skip-link">Skip to content</a>
      <aside className="side" aria-label="Sidebar">
        <div className="side__logo">
          <img src={logoUrl} alt="OnchainSuite" />
          {/* A bare left arrow reads as "back". The panel glyph says what it does. */}
          <IconButton
            icon={collapsed ? 'panel-left-open' : 'panel-left-close'}
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            size={16}
            className="side__collapse"
            onClick={toggleNav}
          />
        </div>
        <nav className="side__nav" aria-label="Primary">
          {items.map((n) => {
            if (n.soon) return (
              <span key={n.to} className="side__item side__item--soon" aria-disabled title={collapsed ? `${n.label} (soon)` : undefined}>
                <Icon name={n.icon} size={18} color="var(--text-disabled)" /><span className="side__label">{n.label}</span><span className="side__soon">soon</span>
              </span>
            );
            const on = loc.pathname.startsWith(n.to);
            return (
              <NavLink key={n.to} to={n.to} title={collapsed ? n.label : undefined}
                data-tour={n.to}
                className={`side__item${on ? ' side__item--on' : ''}${touring === n.to ? ' side__item--tour' : ''}`}>
                <Icon name={n.icon} size={18} color={on ? 'var(--action-primary)' : 'var(--text-tertiary)'} />
                <span className="side__label">{n.label}</span>
              </NavLink>
            );
          })}
        </nav>
        {/* Pinned above the account menu, so it is visible while you are doing the work it
            describes — every one of its steps happens on another screen. Hidden when the
            sidebar is collapsed to icons, where there is no room for it to say anything. */}
        {!collapsed && <GettingStarted />}
        <AccountMenu collapsed={collapsed} />
      </aside>

      <div className="main">
        <header className="top">
          {/* "Home" is the reflex for going back — the sidebar arrow collapses the nav,
              it does not navigate. So the crumb has to be a real link. */}
          <nav className="crumbs" aria-label="Breadcrumb">
            <NavLink to="/" className="crumbs__home">Home</NavLink>
            <span aria-hidden>/</span>
            <b aria-current="page">{crumb}</b>
          </nav>
          <div className="top__right">
            <button className="searchbtn" type="button" onClick={() => setPalette(true)}>
              <Icon name="search" size={16} />Search...<kbd>⌘K</kbd>
            </button>
            <span className="bell">
              <IconButton icon="bell" label="Notifications" onClick={() => setNotif((v) => !v)} />
              {/* The badge counts what the list holds. It was a fixed "2" over three items, and an
                  empty workspace showed the demo's notifications about campaigns it never sent. */}
              {notifs.length > 0 && <span className="bell__badge">{notifs.length}</span>}
              {notif && (
                <>
                  <button type="button" className="acct__scrim" aria-label="Close notifications" onClick={() => setNotif(false)} />
                  <div className="menu" role="region" aria-label="Notifications">
                    <div className="menu__head">Notifications</div>
                    {notifs.length === 0 && (
                      <div className="menu__row"><span className="menu__tx">Nothing yet. Sends, sign-ups and syncs show up here once your contract is indexed.</span></div>
                    )}
                    {notifs.map((n, i) => (
                      <div className="menu__row" key={i}>
                        <span className="menu__ic"><Icon name={n.icon} size={15} /></span>
                        <span className="menu__tx">{n.tx}<time>{n.t}</time></span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </span>
            <IconButton icon={theme === 'dark' ? 'moon' : 'sun'} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle} />
          </div>
        </header>
        <main className="body" id="main">
          <Outlet />
        </main>
      </div>

      {palette && (
        <CommandPalette
          items={destinations()}
          onClose={() => setPalette(false)}
          onGo={(to) => { setPalette(false); nav(to); }}
        />
      )}
      {/* Intelligence follows you everywhere in 1.8 — except its own page, where the floating
          launcher would just cover the thing it opens. */}
      {!loc.pathname.startsWith('/intelligence') && <IntelligencePanel />}
      <CerebraTour />
      <Toaster />
    </div>
  );
}

function CommandPalette({ items, onClose, onGo }: { items: NavItem[]; onClose: () => void; onGo: (to: string) => void }) {
  const [q, setQ] = useState('');
  const empty = useWorkspaceMode() === 'empty';
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const ql = q.toLowerCase();
  // The demo's campaigns and wallets are not records an empty workspace has.
  const results = empty ? [] : CMD_RESULTS.filter((r) => (r.title + r.sub).toLowerCase().includes(ql));
  const goto = items.filter((n) => !n.soon && n.label.toLowerCase().includes(ql));
  return (
     
    <div className="overlay overlay--center" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmd" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cmd__in">
          <Icon name="search" size={18} color="var(--text-tertiary)" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input autoFocus placeholder="Search campaigns, wallets, segments, Loops…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>ESC</kbd>
        </div>
        {results.length || goto.length ? (
          <>
            {results.length > 0 && (
              <div className="cmd__grp">
                <div className="cmd__lbl">Results</div>
                {results.map((r) => (
                  <button key={r.title} className="cmd__row" onClick={() => onGo(r.to)}>
                    <Icon name={r.icon} size={16} color="var(--text-secondary)" />
                    <span style={{ flex: 1 }}>{r.title}<span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)' }}>{r.sub}</span></span>
                  </button>
                ))}
              </div>
            )}
            {goto.length > 0 && (
              <div className="cmd__grp">
                <div className="cmd__lbl">Go to</div>
                {goto.map((n) => (
                  <button key={n.to} className="cmd__row" onClick={() => onGo(n.to)}>
                    <Icon name={n.icon} size={16} color="var(--text-secondary)" />{n.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="cmd__empty">No destination or record matches “{q}”. Try a campaign, segment or page name.</div>
        )}
      </div>
    </div>
  );
}

function AccountMenu({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
  // Settings has no nav row — it lives here, with the other workspace-level controls.
  const items: { icon: IconName; label: string; danger?: boolean; to?: string }[] = [
    { icon: 'settings-2', label: 'Settings', to: '/settings' },
    { icon: 'send', label: 'Invite people' },
    { icon: 'settings-2', label: 'Workspace settings' },
    { icon: 'chevrons-up-down', label: 'Switch workspace' },
    { icon: 'lock-open', label: 'Sign out', danger: true },
  ];
  return (
    <div className="side__foot">
      <button className="acct" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} title={collapsed ? 'Ada Okafor · Acme' : undefined}>
        <span className="side__avatar">AO</span>
        <span className="acct__id">
          <b>Ada Okafor</b>
          <span>Acme</span>
        </span>
        <Icon name="chevrons-up-down" size={15} color="var(--text-tertiary)" className="acct__chev" />
      </button>
      {open && (
        <>
          <button type="button" className="acct__scrim" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="acct__menu" role="menu">
            <div className="acct__head"><span className="ws__avatar">DA</span><span className="ws__name"><b>Acme</b><span>Workspace</span></span></div>
            {items.map((it) => (
              <button key={it.label} className={`acct__item${it.danger ? ' acct__item--danger' : ''}`} role="menuitem"
                onClick={() => { setOpen(false); if (it.to) nav(it.to); }}>
                <Icon name={it.icon} size={16} />{it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page__head">
      <div className="page__head-main">
        <h1 className="page__title">{title}</h1>
        {sub && <p className="page__sub">{sub}</p>}
      </div>
      {actions && <div className="page__actions">{actions}</div>}
    </div>
  );
}
