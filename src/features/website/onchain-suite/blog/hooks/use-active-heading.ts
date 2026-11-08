"use client";

import { useCallback, useState } from "react";

import { activeHeadingIndex } from "../utils/reading";
import { prefersReducedMotion, useScrollFrame } from "./use-scroll-frame";

/**
 * Which outline entry is being read, plus a click handler that scrolls to a
 * section. Headings carry `scroll-margin-top`, so `scrollIntoView` lands them
 * just under the navbar. State only changes when the section changes, so the
 * outline re-renders a handful of times per article, not per frame.
 */
export function useActiveHeading(ids: string[], bodyId: string) {
  const [active, setActive] = useState<number | null>(null);

  useScrollFrame(() => {
    const tops = ids.map(
      (id) => document.getElementById(id)?.getBoundingClientRect().top ?? null
    );
    setActive(activeHeadingIndex(tops));
  }, bodyId);

  const goTo = useCallback((event: React.MouseEvent, id: string) => {
    if (!document.getElementById(id)) return;
    event.preventDefault();
    scrollToHeading(id);
  }, []);

  return { active, goTo };
}

/** Smooth-scroll a heading under the navbar and put its id in the URL. */
export function scrollToHeading(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  window.history.replaceState(null, "", `#${id}`);
}
