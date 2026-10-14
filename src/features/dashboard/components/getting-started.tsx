"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { useSetupSteps } from "./get-started";

/** Per-viewer collapsed state for the sidebar checklist. */
const COLLAPSED_KEY = "onchain.gettingStarted.collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function setupNudge(done: number, total: number): string {
  if (done === 0) return "Let's go";
  if (done >= total) return "All done";
  if (done >= total - 1) return "Almost there";
  return "Keep it up";
}

/**
 * The setup checklist, pinned to the sidebar (v2.7 onboarding migration, step 5).
 *
 * It used to be an in-page carousel on the dashboard, which vanished the moment
 * you navigated - yet every step is something you do on another screen. Pinned
 * to the sidebar, it stays visible while you do the work. It is the single
 * checklist now: it reads from `useSetupSteps` (the same live-state task
 * completion the dashboard already derived), so there is one source, not two.
 *
 * It removes itself at 100% rather than sitting as a trophy, hides while the
 * completion reads are still loading (so it never flashes a wrong count), and
 * collapses to its header line (persisted per viewer). It is hidden entirely
 * when the sidebar is collapsed to the icon rail, where there is no room for it.
 */
export function GettingStarted() {
  const { steps, isLoading } = useSetupSteps();
  const [collapsed, setCollapsed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // per-viewer convenience only
      }
      return next;
    });
  };

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;

  // Nothing to show while loading, or once every step is done (self-removes).
  if (isLoading || total === 0 || done >= total) return null;

  return (
    <section
      aria-label="Getting started"
      className="group-data-[collapsible=icon]:hidden rounded-lg border border-border bg-background p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">
            Getting started
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {done}/{total} done &middot; {setupNudge(done, total)}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? "Expand getting started" : "Collapse getting started"
          }
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* One segment per step: at a glance the bar IS the count. */}
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} steps completed`}
        className="mt-2 flex gap-1"
      >
        {steps.map((s) => (
          <span
            key={s.id}
            className={cn(
              "h-1 flex-1 rounded-full",
              s.done ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {!collapsed && (
        <ul className="mt-2 space-y-0.5">
          {steps.map((s) => {
            const open = openId === s.id && !s.done;
            return (
              <li key={s.id}>
                {s.done ? (
                  <Link
                    href={s.href}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckIcon
                        className="h-2.5 w-2.5"
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="truncate line-through">{s.title}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : s.id)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                    <span className="flex-1 truncate">{s.title}</span>
                    <ChevronRightIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-90"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                )}
                {open && (
                  <div className="px-2 pb-2 pl-8">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {s.hint ?? s.description}
                    </p>
                    <Link
                      href={s.href}
                      className="mt-1 inline-block text-[11px] font-medium text-primary hover:underline"
                    >
                      {s.cta} &rarr;
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
