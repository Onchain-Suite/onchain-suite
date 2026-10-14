"use client";

import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

import { TOUR } from "../data/tour";
import {
  endTour,
  startTour,
  tourBack,
  tourNext,
  useTour,
} from "../hooks/use-tour";
import { useWorkspaceMode } from "../hooks/use-workspace-mode";
import { Button } from "@/shared/components/ui/button";

/**
 * The product tour callout (v2.7 onboarding migration, step 6).
 *
 * A non-modal card pinned bottom-right: the point is to look at the page each
 * stop opens, so nothing is dimmed or blocked. Each Next navigates to the next
 * section and advances; Back steps back; Skip/Done and Escape end it (and mark
 * it done so it does not return on its own).
 *
 * Auto-starts once for a brand-new empty workspace that has not seen it, since
 * on day one the tour is the most useful thing on the screen. It never
 * auto-starts for a live workspace or once done; the checklist's "Take the tour"
 * button can replay it anytime.
 */
export function ProductTour() {
  const { active, index, done } = useTour();
  const { mode, isLoading } = useWorkspaceMode();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-start once: empty workspace, not yet seen, not already running.
  useEffect(() => {
    if (isLoading || active || done) return;
    if (mode !== "empty") return;
    startTour();
  }, [isLoading, active, done, mode]);

  // Navigate to the stop's route when the stop changes (not when the user
  // wanders off mid-tour: that is the location changing, not the stop).
  useEffect(() => {
    if (!active) return;
    const stop = TOUR[index];
    if (stop && pathname && !pathname.startsWith(stop.to)) {
      router.push(stop.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") endTour();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (!active) return null;
  const stop = TOUR[index];
  if (!stop) return null;
  const last = index === TOUR.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-primary/30 bg-primary/10 p-1.5 text-primary">
          <SparklesIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {index + 1} of {TOUR.length}
        </span>
        <button
          type="button"
          onClick={endTour}
          className="ml-auto text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip tour
        </button>
      </div>

      <h2
        id="tour-title"
        className="mt-3 text-sm font-semibold text-foreground"
      >
        {stop.title}
      </h2>
      <p id="tour-body" className="mt-1 text-sm text-muted-foreground">
        {stop.body}
      </p>

      <div className="mt-3 flex gap-1" aria-hidden="true">
        {TOUR.map((t, i) => (
          <span
            key={t.to}
            className={cn(
              "h-1 flex-1 rounded-full",
              i === index
                ? "bg-primary"
                : i < index
                  ? "bg-primary/40"
                  : "bg-muted"
            )}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
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
    </div>
  );
}
