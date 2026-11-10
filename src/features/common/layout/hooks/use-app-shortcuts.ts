"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { resolveShortcut } from "../utils/shortcuts";
import { useTour } from "@/features/onboarding/hooks/use-tour";
import { useCommandPalette } from "@/shared/components/command-palette";

/** Rows J and K can walk: focusable table rows and anything marked as a row. */
const ROWS = 'main tr[tabindex="0"], main [data-row]';

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;
  return (
    el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
  );
};

/** Something open on top of the page (a dialog, a menu) keeps the keys. */
const overlayOpen = () =>
  Boolean(
    document.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [aria-modal="true"]'
    )
  );

function stepRow(step: 1 | -1) {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(ROWS)).filter(
    (r) => r.offsetParent !== null
  );
  if (!rows.length) return;
  const at = rows.indexOf(document.activeElement as HTMLElement);
  const next =
    at < 0
      ? step === 1
        ? 0
        : rows.length - 1
      : Math.min(rows.length - 1, Math.max(0, at + step));
  rows[next]?.focus();
  rows[next]?.scrollIntoView({ block: "nearest" });
}

/**
 * The dashboard's single-key shortcuts: G then a letter, J and K, / and ?.
 * ⌘K itself belongs to the palette provider. Off while the tour runs, while
 * typing, and under any dialog or menu.
 */
export function useAppShortcuts() {
  const router = useRouter();
  const palette = useCommandPalette();
  const tour = useTour();
  const goArmedAt = useRef(0);
  const latest = useRef({ router, palette, touring: tour.active });
  latest.current = { router, palette, touring: tour.active };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { router: nav, palette: cmd, touring } = latest.current;
      if (touring || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target) || overlayOpen()) return;

      const action = resolveShortcut(e.key, goArmedAt.current, Date.now());
      if (action.kind !== "arm-go") goArmedAt.current = 0;

      switch (action.kind) {
        case "arm-go":
          goArmedAt.current = Date.now();
          return;
        case "go":
          e.preventDefault();
          nav.push(action.href);
          return;
        case "palette":
          e.preventDefault();
          cmd.open();
          return;
        case "help":
          e.preventDefault();
          cmd.openShortcuts();
          return;
        case "row":
          e.preventDefault();
          stepRow(action.step);
          return;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
