"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";

import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";
import { categoryOfAnchor } from "@/onchain-suite-website/utils/retention-playbook-params";

interface PlaybookState {
  /** The playbook on the page. The other two are hidden. */
  category: CategoryId | null;
  /**
   * True when the link carried ?category=. Only then does the hero's second
   * button point at the playbook; it is server rendered, so it never shifts
   * the page under a reader who is already scrolling.
   */
  fromLink: boolean;
  /** Shows a playbook, then scrolls to it (or to one of its sections). */
  openPlaybook: (category: CategoryId, target?: string) => void;
  /** Scrolls to a visible anchor, focuses its heading and updates the hash. */
  jumpTo: (id: string) => void;
}

const PlaybookContext = createContext<PlaybookState | null>(null);

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToAnchor(id: string, smooth = true): void {
  const target = document.getElementById(id);
  if (!target) {
    return;
  }
  // "instant", not "auto": <html> carries a global scroll-smooth class, and
  // "auto" would inherit it.
  target.scrollIntoView({
    behavior: smooth && !prefersReducedMotion() ? "smooth" : "instant",
    block: "start",
  });
  const heading = target.matches("[data-jump-focus]")
    ? target
    : target.querySelector<HTMLElement>("[data-jump-focus]");
  heading?.focus({ preventScroll: true });
  // replaceState keeps ?client= and ?category=, and does not add a history
  // entry or a page view.
  if (window.location.hash !== `#${id}`) {
    window.history.replaceState(window.history.state, "", `#${id}`);
  }
}

function syncCategoryParam(next: CategoryId): void {
  // Keep a ?category= link in step with the choice, so a copied URL is right.
  const url = new URL(window.location.href);
  if (url.searchParams.has("category")) {
    url.searchParams.set("category", next);
    window.history.replaceState(window.history.state, "", url);
  }
}

export function PlaybookProvider({
  initialCategory,
  children,
}: {
  initialCategory: CategoryId | null;
  children: ReactNode;
}) {
  const [category, setCategory] = useState<CategoryId | null>(initialCategory);
  // The anchor to scroll to once its playbook is on the page.
  const pending = useRef<{ anchor: string; category: CategoryId } | null>(null);

  // A shared link like #defi or #defi-retention-triggers opens that playbook.
  // If it was hidden, the browser's own hash scroll found nothing, so scroll
  // after the reveal commits. If ?category= already showed it, the browser
  // scrolled on its own and there is nothing to do.
  useEffect(() => {
    const anchor = decodeURIComponent(window.location.hash.slice(1));
    const fromHash = categoryOfAnchor(anchor);
    if (fromHash && fromHash !== initialCategory) {
      pending.current = { anchor, category: fromHash };
      setCategory(fromHash);
    }
  }, [initialCategory]);

  useEffect(() => {
    // Runs on mount too, before the reveal: wait for the matching category.
    const target = pending.current;
    if (target?.category === category) {
      const { anchor } = target;
      pending.current = null;
      scrollToAnchor(anchor, false);
    }
  }, [category]);

  const openPlaybook = useCallback((next: CategoryId, target?: string) => {
    // Commit the reveal before measuring, so the scroll lands on real layout.
    flushSync(() => setCategory(next));
    syncCategoryParam(next);
    scrollToAnchor(target ?? next);
  }, []);

  const fromLink = initialCategory !== null;
  const value = useMemo(
    () => ({ category, fromLink, openPlaybook, jumpTo: scrollToAnchor }),
    [category, fromLink, openPlaybook]
  );

  return (
    <PlaybookContext.Provider value={value}>
      {children}
    </PlaybookContext.Provider>
  );
}

export function usePlaybook(): PlaybookState {
  const ctx = useContext(PlaybookContext);
  if (!ctx) {
    throw new Error("usePlaybook must be used inside PlaybookProvider");
  }
  return ctx;
}
