import { useEffect, useRef, useState } from 'react';

/* Measured width, so a chart's coordinate system can equal real pixels (2.7).
 *
 * Every chart here drew into a fixed viewBox — 720 wide — and was then stretched to whatever
 * the column was. At a 1030px column that is a 1.43x scale applied to everything inside,
 * including the parts that should never scale: an 11px axis label rendered at 16px, a 1px
 * gridline at 1.4px, a 2.5px line at 3.6px. Hence charts that read as chunky, and inconsistently
 * so — the same chart looked heavier in a wide column than a narrow one.
 *
 * Measuring the container and drawing 1:1 fixes all of it at once. Type sizes then mean what
 * they say and match the rest of the interface, and hairlines stay hairlines at any width.
 */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width] as const;
}
