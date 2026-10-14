"use client";

import { useEffect, useState } from "react";

const NAV_HEIGHT = 60;
const MOBILE_BAR_HEIGHT = 48;
const SLACK = 32;
const MOBILE_QUERY = "(max-width: 1000px)";

/**
 * The id of the section the reader is in: the last one whose top has passed
 * the sticky header (and the mobile bar on small screens). Null above the
 * first section. `ids` must be in page order and referentially stable.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const mobile = window.matchMedia(MOBILE_QUERY);

    const compute = () => {
      frame = 0;
      const line =
        NAV_HEIGHT + (mobile.matches ? MOBILE_BAR_HEIGHT : 0) + SLACK;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        // Skip anchors with no layout: the playbooks the reader did not pick.
        if (!el || el.getClientRects().length === 0) {
          continue;
        }
        if (el.getBoundingClientRect().top > line) {
          break;
        }
        current = id;
      }
      // The last section is short; at the bottom of the page it is the one.
      const { scrollHeight } = document.documentElement;
      const last = ids[ids.length - 1];
      if (last && window.innerHeight + window.scrollY >= scrollHeight - 2) {
        current = last;
      }
      setActive(current);
    };

    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(compute);
      }
    };

    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ids]);

  return active;
}
