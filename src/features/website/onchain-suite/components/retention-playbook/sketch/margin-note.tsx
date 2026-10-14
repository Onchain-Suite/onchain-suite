import type { CSSProperties, ReactNode } from "react";

import {
  roughLine,
  seededRandom,
  seedFrom,
} from "@/onchain-suite-website/utils/sketch";

/**
 * A handwritten note beside the block it annotates, with a pen bracket. On
 * wide screens it sits in the right margin; on narrow ones it follows the
 * block inline. The note is real text, read in order after its block.
 */
export function MarginNote({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const rand = seededRandom(seedFrom(text));
  // Bracket drawn in a 12 x 100 box and stretched to the note's height.
  const bracket =
    roughLine(10, 2, 3, 6, rand, 0.4) +
    roughLine(3, 6, 3, 94, rand, 0.6) +
    roughLine(3, 94, 10, 98, rand, 0.4);
  return (
    <div className="rp-noted">
      {children}
      <aside className="rp-note" data-draw>
        <svg
          viewBox="0 0 12 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={bracket}
            pathLength={1}
            className="rp-ink"
            style={{ "--i": 0 } as CSSProperties}
          />
        </svg>
        <p className="rp-note-text">{text}</p>
      </aside>
    </div>
  );
}
