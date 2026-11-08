"use client";

import { useRef } from "react";

import { measureBody, useScrollFrame } from "../../hooks/use-scroll-frame";
import { readingProgress } from "../../utils/reading";

/**
 * The thin bar under the navbar that fills as you read. It writes `transform`
 * straight to the DOM instead of setting state, so scrolling never re-renders
 * React and never triggers layout.
 */
export function ReadingProgress({ bodyId }: { bodyId: string }) {
  const fill = useRef<HTMLSpanElement>(null);

  useScrollFrame(() => {
    const body = measureBody(bodyId);
    if (!body || !fill.current) return;
    const progress = readingProgress(body, window.innerHeight);
    fill.current.style.transform = `scaleX(${progress})`;
  }, bodyId);

  return (
    <div className="ba-progress" aria-hidden="true">
      <span ref={fill} />
    </div>
  );
}
