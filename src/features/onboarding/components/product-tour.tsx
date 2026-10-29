"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import { anchorOf, TOUR } from "../data/tour";
import {
  endTour,
  startTour,
  tourBack,
  tourNext,
  useTour,
} from "../hooks/use-tour";
import { useWorkspaceMode } from "../hooks/use-workspace-mode";
import { CerebraMark } from "@/features/onboarding-flow/components/guided/cerebra-mark";
import { Button } from "@/shared/components/ui/button";

/**
 * The product tour callout (v2.7 onboarding migration, step 6; anchored upgrade).
 *
 * Cerebra walks the sidebar one section at a time. Each stop opens its section, rings the
 * sidebar row it describes, and the callout sits beside that row with an arrow pointing at
 * it - so the words, the route there and the page itself are all in view together. Where the
 * row cannot be measured (the collapsed icon rail, the mobile sheet, or the getting-started
 * checklist when it is hidden) it falls back to speaking from the corner.
 *
 * Non-modal on purpose: the point is to look at the page, so nothing is dimmed or blocked.
 * Focus moves to the primary button each stop, and Escape ends it. Auto-starts once for a
 * brand-new empty workspace that has not seen it; "Take the tour" in the user menu replays it.
 */
export function ProductTour() {
  const { active, index, done } = useTour();
  const { mode, isLoading } = useWorkspaceMode();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const boxRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);

  // firstName is not on better-auth's base user type, so read it narrowed.
  const rawFirst = (session?.user as { firstName?: unknown } | undefined)
    ?.firstName;
  const firstName = typeof rawFirst === "string" ? rawFirst.trim() : "";

  const base = TOUR[index];
  // The same Cerebra that talked them through onboarding, so the tour opens by name.
  const stop =
    index === 0 && firstName && base
      ? {
          ...base,
          title: `Welcome to OnchainSuite, ${firstName}`,
          body: `I'm Cerebra, and I'll show you around, one section at a time. This is your dashboard: ${base.body
            .charAt(0)
            .toLowerCase()}${base.body.slice(1)}`,
        }
      : base;

  const pos = useAnchor(active && stop ? anchorOf(stop) : undefined, boxRef);

  // Auto-start once: empty workspace, not yet seen, not already running.
  useEffect(() => {
    if (isLoading || active || done) return;
    if (mode !== "empty") return;
    startTour();
  }, [isLoading, active, done, mode]);

  // Navigate to the stop's route when the stop changes (not when the user wanders off
  // mid-tour: that is the location changing, not the stop).
  useEffect(() => {
    if (!active || !stop) return;
    if (pathname && !pathname.startsWith(stop.to)) router.push(stop.to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  // Keyboard follows the tour: focus the primary button on each stop.
  useEffect(() => {
    if (active) {
      footRef.current
        ?.querySelector<HTMLButtonElement>("button:last-child")
        ?.focus();
    }
  }, [active, index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // Ring the sidebar row this stop describes, so the words and the row read together. Imperative
  // (the row lives in the shared nav) and self-cleaning; only when the row is actually on screen.
  useEffect(() => {
    if (!active) return;
    const s = TOUR[index];
    if (!s) return;
    const row = document.querySelector<HTMLElement>(
      `[data-tour="${anchorOf(s)}"]`
    );
    if (!row) return;
    const prev = {
      boxShadow: row.style.boxShadow,
      borderRadius: row.style.borderRadius,
      zIndex: row.style.zIndex,
    };
    row.style.boxShadow = "0 0 0 2px var(--primary)";
    row.style.borderRadius = "var(--radius, 0.5rem)";
    row.style.zIndex = "1";
    return () => {
      row.style.boxShadow = prev.boxShadow;
      row.style.borderRadius = prev.borderRadius;
      row.style.zIndex = prev.zIndex;
    };
  }, [active, index]);

  if (!active || !stop) return null;
  const last = index === TOUR.length - 1;

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      className={cn(
        "animate-in fade-in border-border bg-popover text-popover-foreground fixed z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 rounded-lg border p-4 shadow-xl duration-200",
        pos
          ? "slide-in-from-left-1"
          : "right-6 bottom-[90px] slide-in-from-bottom-1"
      )}
      style={pos ? { top: pos.top, left: pos.left } : undefined}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="shrink-0">
          <CerebraMark face size={26} />
        </span>
        <b className="text-foreground text-[13px] font-semibold">Cerebra</b>
        <span className="text-muted-foreground text-xs tabular-nums">
          {index + 1} of {TOUR.length}
        </span>
        <button
          type="button"
          onClick={endTour}
          className="text-muted-foreground hover:text-foreground ml-auto rounded-sm px-1 text-xs font-medium transition-colors"
        >
          Skip tour
        </button>
      </div>

      <h2
        id="tour-title"
        className="text-foreground mt-1 text-base font-semibold tracking-tight"
      >
        {stop.title}
      </h2>
      <p
        id="tour-body"
        className="text-muted-foreground text-[13.5px] leading-6"
      >
        {stop.body}
      </p>

      <div className="mt-1 flex gap-1" aria-hidden="true">
        {TOUR.map((t, i) => (
          <span
            key={`${t.to}:${t.anchor ?? ""}`}
            className={cn(
              "h-[3px] flex-1 rounded-full",
              i === index
                ? "bg-primary"
                : i < index
                  ? "bg-primary/40"
                  : "bg-muted"
            )}
          />
        ))}
      </div>

      <div
        ref={footRef}
        className="mt-1 flex items-center justify-between gap-2"
      >
        {index > 0 ? (
          <Button variant="outline" size="sm" onClick={tourBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button size="sm" onClick={tourNext}>
          {last ? "Done" : "Next"}
          {!last && (
            <ArrowRightIcon className="ml-1 h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* Arrow: points at the sidebar row when anchored, or down at the launcher in the corner. */}
      <span
        aria-hidden="true"
        className={cn(
          "border-border bg-popover absolute h-3 w-3 rotate-45",
          pos ? "border-b border-l" : "border-r border-b"
        )}
        style={
          pos ? { left: -7, top: pos.arrow - 6 } : { right: 20, bottom: -7 }
        }
      />
    </div>
  );
}

/* Where the callout goes for a sidebar row: to its right, vertically centred on it, clamped
 * inside the viewport, with the arrow tracking the row's centre even when the box is clamped.
 * Measured after layout and again whenever the page or the sidebar changes size. Returns null
 * (corner fallback) when the row can't be measured - the collapsed rail, the mobile sheet, or
 * a hidden checklist. Ported from reference/v2.7/web/src/components/CerebraTour.tsx. */
const GAP = 14;
const EDGE = 12;

function useAnchor(
  to: string | undefined,
  boxRef: React.RefObject<HTMLDivElement | null>
) {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    arrow: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!to) {
      setPos(null);
      return;
    }
    const place = () => {
      const row = document.querySelector<HTMLElement>(`[data-tour="${to}"]`);
      const box = boxRef.current;
      const r = row?.getBoundingClientRect();
      // No layout (or a hidden/collapsed sidebar) gives a zero box: fall back to the corner.
      if (!row || !box || !r || r.width === 0 || r.right <= 0) {
        setPos(null);
        return;
      }
      const h = box.offsetHeight;
      const mid = r.top + r.height / 2;
      const top = Math.min(
        Math.max(mid - h / 2, EDGE),
        window.innerHeight - h - EDGE
      );
      setPos({
        top,
        left: r.right + GAP,
        arrow: Math.min(Math.max(mid - top, 18), h - 18),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    // The shadcn sidebar renders no <aside>; observe its fixed container so a collapse re-places.
    const side = document.querySelector('[data-slot="sidebar-container"]');
    const ro =
      typeof ResizeObserver !== "undefined" && side
        ? new ResizeObserver(place)
        : null;
    if (ro && side) ro.observe(side);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      ro?.disconnect();
    };
  }, [to, boxRef]);

  return pos;
}
