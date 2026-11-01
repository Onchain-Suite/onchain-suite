"use client";

import { useEffect, useState } from "react";

import type { BookMode } from "@/onchain-suite-website/utils/book-spread";

/** Wide enough for two readable pages side by side. */
const SPREAD_QUERY = "(min-width: 1200px) and (min-height: 640px)";

/** Two-page spreads on a wide screen, one page at a time below it. */
export function useBookMode(): BookMode {
  const [mode, setMode] = useState<BookMode>("single");
  useEffect(() => {
    const mq = window.matchMedia(SPREAD_QUERY);
    const update = () => setMode(mq.matches ? "spread" : "single");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mode;
}
