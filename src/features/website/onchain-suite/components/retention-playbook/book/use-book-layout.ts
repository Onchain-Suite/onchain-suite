"use client";

import { type RefObject, useLayoutEffect, useState } from "react";

import {
  type PackEntry,
  packFlow,
  type PackItem,
} from "@/onchain-suite-website/utils/book-pack";

/** Room left at the foot of a page, so a page never ends flush on its folio. */
const SAFETY = 0.97;

/** What the packer needs to know about one rendered item. */
function measureItem(el: HTMLElement, height: number): PackItem {
  if (el.hasAttribute("data-heading")) return { height, keepWithNext: true };
  // A table piece right after another is joined to it on the page, without
  // its header; if it opens a page instead, the header comes back.
  if (el.querySelector(".rp-table")) {
    let prev = el.previousElementSibling;
    let header = 0;
    while (prev?.querySelector(".rp-table") && header === 0) {
      header = prev.querySelector("thead")?.getBoundingClientRect().height ?? 0;
      prev = prev.previousElementSibling;
    }
    if (header > 0) return { height, startExtra: header };
  }
  // A lone paragraph may be cut between its lines. Blocks arrive wrapped,
  // so look down through single-child wrappers to find it.
  let only: Element | null = el;
  while (only?.children.length === 1 && !only.matches("p.rp-p")) {
    only = only.firstElementChild;
  }
  if (only instanceof HTMLElement && only.matches("p.rp-p")) {
    const lineHeight = parseFloat(getComputedStyle(only).lineHeight);
    if (lineHeight > 0) {
      return {
        height,
        lines: { lineHeight, content: only.getBoundingClientRect().height },
      };
    }
  }
  return { height };
}

/**
 * Lays each run of sections out across pages from the real height of its
 * items.
 *
 * `box` is the empty flow area of a hidden probe page, so its height is what
 * one page really holds at this size. `column` holds every run's items,
 * hidden at the page's width, one `[data-flow]` per run and one `[data-item]`
 * per item, with `[data-heading]` on section headings. The layout is redone
 * when the page changes size and once the fonts have loaded.
 *
 * Returns, per run, the pieces of items on each of its pages, or null until
 * the first measurement.
 */
export function useBookLayout(
  stage: RefObject<HTMLElement | null>,
  box: RefObject<HTMLElement | null>,
  column: RefObject<HTMLElement | null>
): PackEntry[][][] | null {
  const [layout, setLayout] = useState<PackEntry[][][] | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const capacity = (box.current?.clientHeight ?? 0) * SAFETY;
      if (!column.current || capacity <= 0) return;
      const runs = Array.from(
        column.current.querySelectorAll<HTMLElement>("[data-flow]")
      );
      setLayout(
        runs.map((run) => {
          const els = Array.from(
            run.querySelectorAll<HTMLElement>(":scope > [data-item]")
          );
          // Distance to the next item's top, so collapsed margins count once;
          // the last item runs to the bottom of its run.
          const tops = els.map((el) => el.getBoundingClientRect().top);
          const { bottom } = run.getBoundingClientRect();
          const items = els.map((el, i) =>
            measureItem(el, (tops[i + 1] ?? bottom) - tops[i])
          );
          return packFlow(items, capacity);
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
