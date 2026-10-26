"use client";

import { useEffect } from "react";

const ROOT = ".rp-page";
const TARGET = "[data-draw]";

/**
 * Draws the hand-drawn layer (diagram strokes, underlines, margin notes) as
 * each piece scrolls into view. Server HTML is fully drawn, so nothing is
 * hidden without JavaScript or under reduced motion. On mount, anything
 * already on screen is marked drawn first, then the page switches to
 * animate-on-view, so nothing on screen flickers. Pieces inside a hidden
 * playbook have no layout yet; they are observed and draw when shown.
 */
export function Annotator() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const root = document.querySelector<HTMLElement>(ROOT);
    if (!root) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );
    const fold = window.innerHeight * 0.88;
    for (const el of root.querySelectorAll<HTMLElement>(TARGET)) {
      const laidOut = el.getClientRects().length > 0;
      if (laidOut && el.getBoundingClientRect().top < fold) {
        el.classList.add("is-drawn");
      } else {
        io.observe(el);
      }
    }
    root.classList.add("rp-anim");
    return () => io.disconnect();
  }, []);

  return null;
}
