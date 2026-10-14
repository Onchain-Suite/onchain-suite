import { useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './icons';
import { loadPersisted, savePersisted } from '../data/persist';
import { setupNudge, useSetupSteps } from '../data/setup';
import { TOUR, anchorOf, useTour } from '../data/tour';
import './getting-started.css';

/* The setup checklist, pinned to the sidebar.
 *
 * It used to be a block in the middle of Home, which meant it vanished the moment you
 * navigated — and every step it lists is something you do on another screen. A checklist you
 * cannot see while doing the work is a checklist you do once and never finish.
 *
 * It removes itself at 6/6 rather than sitting there congratulating anyone, and it can be
 * collapsed to a single line, because a permanent panel has to be dismissible or it becomes
 * furniture people resent.
 *
 * It stays in the sidebar on every screen, Home included — it is a fixture of the nav, not
 * something that moves into the page. A new workspace opens it, whatever state the last one
 * left it in, because on day one it is the most useful thing on the screen.
 */
const KEY = 'ons.setup-collapsed';

let collapsedNow = loadPersisted<boolean>(KEY, false);
const subs = new Set<() => void>();
const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };
function setCollapsed(next: boolean) {
  collapsedNow = next;
  savePersisted(KEY, next);
  subs.forEach((fn) => fn());
}

/** Open the checklist — called when a fresh workspace starts. */
export function openGettingStarted() {
  setCollapsed(false);
}

export function GettingStarted() {
  const nav = useNavigate();
  const steps = useSetupSteps();
  const collapsed = useSyncExternalStore(subscribe, () => collapsedNow, () => collapsedNow);
  const tour = useTour();
  const touring = tour.active && TOUR[tour.index] && anchorOf(TOUR[tour.index]) === 'getting-started';
  const [open, setOpen] = useState<string | null>(null);

  const done = steps.filter((s) => s.done).length;
  // Nothing left to do: the panel goes away rather than becoming a trophy.
  if (done >= steps.length) return null;

  const toggle = () => setCollapsed(!collapsed);

  return (
    <section className={`gs${collapsed ? ' gs--collapsed' : ''}${touring ? ' gs--tour' : ''}`}
      aria-label="Getting started" data-tour="getting-started">
      <div className="gs__head">
        <div className="gs__title">
          <b>Getting started</b>
          <span>{done}/{steps.length} steps completed <i>·</i> {setupNudge(done, steps.length)}</span>
        </div>
        <button type="button" className="gs__fold" onClick={toggle}
          aria-expanded={!collapsed} aria-label={collapsed ? 'Expand getting started' : 'Collapse getting started'}>
          <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} size={15} />
        </button>
      </div>

      {/* One segment per step rather than a single bar: at six steps the segments are the
          count, so the number above it is a confirmation rather than the only source. */}
      <div className="gs__bar" role="progressbar" aria-valuenow={done} aria-valuemin={0}
        aria-valuemax={steps.length} aria-label={`${done} of ${steps.length} steps completed`}>
        {steps.map((s) => <i key={s.id} className={s.done ? 'is-done' : undefined} />)}
      </div>

      {!collapsed && (
        <ul className="gs__list">
          {steps.map((s) => (
            <li key={s.id}>
              <button type="button" className={`gs__step${s.done ? ' is-done' : ''}`}
                onClick={() => (s.done ? nav(s.to) : setOpen(open === s.id ? null : s.id))}>
                <span className="gs__ic"><Icon name={s.icon} size={14} /></span>
                <span className="gs__label">{s.label}</span>
                {s.done
                  ? <span className="gs__tick" aria-label="Done"><Icon name="check" size={11} strokeWidth={3} /></span>
                  : <Icon name="chevron-right" size={14} className="gs__chev" />}
              </button>
              {open === s.id && !s.done && (
                <div className="gs__hint">
                  <p>{s.hint}</p>
                  <button type="button" onClick={() => nav(s.to)}>Take me there<Icon name="arrow-right" size={13} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
