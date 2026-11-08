"use client";

import { useState } from "react";

import { measureBody, useScrollFrame } from "../../hooks/use-scroll-frame";
import { minutesLeft, readingProgress } from "../../utils/reading";

/**
 * "N min left", counting down as you read. Renders the full reading time on the
 * server and first paint, then only re-renders when the whole-minute figure
 * changes. `variant="stat"` is the big number in the side rail; `inline` is the
 * compact label in the mobile outline bar.
 */
export function MinutesLeft({
  bodyId,
  totalMinutes,
  variant,
}: {
  bodyId: string;
  totalMinutes: number;
  variant: "stat" | "inline";
}) {
  const [left, setLeft] = useState(totalMinutes);

  useScrollFrame(() => {
    const body = measureBody(bodyId);
    if (!body) return;
    setLeft(
      minutesLeft(totalMinutes, readingProgress(body, window.innerHeight))
    );
  }, bodyId);

  const label = left === 0 ? "Finished" : `${left} min left`;

  if (variant === "inline") {
    return <span className="ba-left-inline">{label}</span>;
  }

  return (
    <div className="ba-left" aria-live="off">
      {left === 0 ? (
        <span className="ba-left-done">Finished</span>
      ) : (
        <>
          <b>{left}</b>
          <span>min left</span>
        </>
      )}
    </div>
  );
}
