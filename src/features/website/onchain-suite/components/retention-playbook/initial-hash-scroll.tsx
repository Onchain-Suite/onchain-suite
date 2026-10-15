"use client";

import { useLayoutEffect, useRef } from "react";

import { scrollToAnchor } from "@/onchain-suite-website/utils/playbook-scroll";

/**
 * Lands a deep link on its section.
 *
 * The site shell (SiteChrome) runs its own router, which takes the hash off the
 * URL shortly after hydration, so the browser's own anchor scroll never
 * survives here. Two things follow: the hash is read during the first client
 * render, before that router's effects can clear it, and the scroll runs in a
 * layout effect, which React flushes ahead of every passive effect in the same
 * commit.
 */
export function InitialHashScroll() {
  const anchor = useRef(
    typeof window === "undefined"
      ? ""
      : decodeURIComponent(window.location.hash.slice(1))
  );

  useLayoutEffect(() => {
    if (!anchor.current) {
      return;
    }
    // Instant, not smooth: the reader asked for this section, so start there
    // rather than racing them down the page.
    scrollToAnchor(anchor.current, false);
  }, []);

  return null;
}
