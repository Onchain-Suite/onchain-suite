"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `measure` once on mount, then at most once per animation frame while
 * the page scrolls or resizes, or when the article body changes height
 * (late-loading images). Listeners are passive, so scrolling never waits on
 * this. `measure` should only READ layout; anything it writes should be
 * `transform` or React state, never geometry, so there is no layout thrash.
 */
export function useScrollFrame(measure: () => void, bodyId: string): void {
  const latest = useRef(measure);

  useEffect(() => {
    latest.current = measure;
  });

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        latest.current();
      });
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    const body = document.getElementById(bodyId);
    const resize =
      body && "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
    if (body && resize) resize.observe(body);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize?.disconnect();
    };
  }, [bodyId]);
}

/** The article body's viewport-relative top and its height, if mounted. */
export function measureBody(bodyId: string): {
  top: number;
  height: number;
} | null {
  const body = document.getElementById(bodyId);
  if (!body) return null;
  const rect = body.getBoundingClientRect();
  return { top: rect.top, height: rect.height };
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}
