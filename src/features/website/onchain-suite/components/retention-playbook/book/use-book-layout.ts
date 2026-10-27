"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

import { packItems } from "@/onchain-suite-website/utils/book-pages";

/** Room left at the foot of a page, so a page never ends flush on its folio. */
const SAFETY = 0.96;

/**
 * Lays each flow out across pages from the real height of its items.
 *
 * `box` is the empty flow area of a hidden probe page, so its height is what
 * one page really holds at this size. `column` holds every flow's items,
 * hidden at the page's width, one `[data-flow]` per flow and one
 * `[data-item]` per item. The layout is redone when the page changes size
 * and once the fonts have loaded.
 *
 * Returns, per flow, the item indexes on each of its pages, or null until the
 * first measurement.
 */
export function useBookLayout(
  stage: RefObject<HTMLElement | null>,
  box: RefObject<HTMLElement | null>,
  column: RefObject<HTMLElement | null>
): number[][][] | null {
  const [layout, setLayout] = useState<number[][][] | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const capacity = (box.current?.clientHeight ?? 0) * SAFETY;
      if (!column.current || capacity <= 0) return;
      const flows = Array.from(
        column.current.querySelectorAll<HTMLElement>("[data-flow]")
      );
      setLayout(
        flows.map((flow) => {
          const items = Array.from(
            flow.querySelectorAll<HTMLElement>(":scope > [data-item]")
          );
          // Distance to the next item's top, so collapsed margins count once;
          // the last item runs to the bottom of its flow.
          const tops = items.map((el) => el.getBoundingClientRect().top);
          const { bottom } = flow.getBoundingClientRect();
          const heights = tops.map((top, i) => (tops[i + 1] ?? bottom) - top);
          return packItems(heights, capacity);
        })
      );
    };

    measure();
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    const observer = new ResizeObserver(() => measure());
    if (stage.current) observer.observe(stage.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [stage, box, column]);

  return layout;
}
