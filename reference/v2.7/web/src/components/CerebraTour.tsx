import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './icons';
import { Button } from './ui';
import { TOUR, anchorOf, endTour, tourBack, tourNext, useTour } from '../data/tour';
import './cerebra-tour.css';

/* Cerebra's tour: a callout attached to the sidebar row of the section it is describing,
 * walking the sidebar one section at a time.
 *
 * It used to sit in the corner by Cerebra's launcher, which put the explanation as far from
 * the thing it explained as the screen allows. Now each stop points at its own row, which is
 * ringed, and opens that section — so the words, the route there and the page itself are all
 * in view together. Where the row cannot be measured (an off-canvas sidebar, or no layout at
 * all) it falls back to the corner.
 *
 * Non-modal on purpose: the point is to look at the page, so nothing is dimmed or blocked.
 * Focus moves to Next on every stop so the keyboard follows the tour, and Escape ends it. */
export function CerebraTour() {
  const { active, index } = useTour();
  const nav = useNavigate();
  const loc = useLocation();
  // Button does not forward refs, so Next is found through its footer.
  const footRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stop = TOUR[index];
  const pos = useAnchor(active && stop ? anchorOf(stop) : undefined, boxRef);

  useEffect(() => {
    if (active && stop && !loc.pathname.startsWith(stop.to)) nav(stop.to);
    // Navigating is the stop changing, not the location changing — a reader who wanders off
    // mid-tour is not dragged back until they press Next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  useEffect(() => {
    if (active) footRef.current?.querySelector<HTMLButtonElement>('button:last-child')?.focus();
  }, [active, index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') endTour(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (!active || !stop) return null;
  const last = index === TOUR.length - 1;

  return (
    <div ref={boxRef} className={`ctour${pos ? ' ctour--anchored' : ''}`}
      style={pos ? { top: pos.top, left: pos.left, ['--ctour-arrow' as string]: `${pos.arrow}px` } : undefined}
      role="dialog" aria-modal="false" aria-labelledby="ctour-title" aria-describedby="ctour-body">
      <div className="ctour__head">
        <span className="ctour__av" aria-hidden><Icon name="brain" size={16} /></span>
        <b>Cerebra</b>
        <span className="ctour__count">{index + 1} of {TOUR.length}</span>
        <button type="button" className="ctour__skip" onClick={endTour}>Skip tour</button>
      </div>
      <h2 id="ctour-title">{stop.title}</h2>
      <p id="ctour-body">{stop.body}</p>
      <div className="ctour__dots" aria-hidden>
        {TOUR.map((t, i) => <i key={t.to} className={i === index ? 'is-on' : i < index ? 'is-done' : undefined} />)}
      </div>
      <div className="ctour__foot" ref={footRef}>
        {index > 0 ? <Button variant="secondary" size="s" onClick={tourBack}>Back</Button> : <span />}
        <Button size="s" trailingIcon={last ? undefined : 'arrow-right'} onClick={tourNext}>
          {last ? 'Done' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

/* Where the callout goes for a sidebar row: to its right, vertically centred on it, clamped
 * inside the viewport, with the arrow tracking the row's centre even when the box is clamped.
 * Measured after layout and again whenever the page or the sidebar changes size. */
const GAP = 14;
const EDGE = 12;

function useAnchor(to: string | undefined, boxRef: React.RefObject<HTMLDivElement | null>) {
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number } | null>(null);

  useLayoutEffect(() => {
    if (!to) { setPos(null); return; }
    const place = () => {
      const row = document.querySelector<HTMLElement>(`[data-tour="${to}"]`);
      const box = boxRef.current;
      const r = row?.getBoundingClientRect();
      // No layout (or a hidden sidebar) gives a zero box: fall back to the corner.
      if (!row || !box || !r || r.width === 0 || r.right <= 0) { setPos(null); return; }
      const h = box.offsetHeight;
      const mid = r.top + r.height / 2;
      const top = Math.min(Math.max(mid - h / 2, EDGE), window.innerHeight - h - EDGE);
      setPos({ top, left: r.right + GAP, arrow: Math.min(Math.max(mid - top, 18), h - 18) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const side = document.querySelector('aside');
    const ro = typeof ResizeObserver !== 'undefined' && side ? new ResizeObserver(place) : null;
    if (ro && side) ro.observe(side);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      ro?.disconnect();
    };
  }, [to, boxRef]);

  return pos;
}
