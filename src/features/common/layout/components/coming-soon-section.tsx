"use client";

import { useEffect, useState } from "react";

import type { WipSection } from "@/shared/config/wip-sections";

/**
 * Production placeholder for a work-in-progress section: explains what the
 * section does and animates its progress toward the v1 release. Shown in
 * place of the section's real content when WIP sections are hidden.
 */
export function ComingSoonSection({ section }: { section: WipSection }) {
  const [progress, setProgress] = useState(0);

  // Count up to the section's completion percentage; the bar width animates
  // via CSS transition in step.
  useEffect(() => {
    setProgress(0);
    const target = Math.max(0, Math.min(100, section.percentComplete));
    const stepMs = 900 / Math.max(target, 1);
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= target) {
          window.clearInterval(timer);
          return target;
        }
        return current + 1;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [section.percentComplete]);

  return (
    <div className="mx-auto flex min-h-[62vh] max-w-2xl items-center justify-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 md:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          In development - shipping in v1
        </span>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          {section.label}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {section.description}
        </p>

        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Progress to production
            </span>
            <span
              className="text-lg font-semibold tabular-nums text-foreground"
              aria-live="polite"
            >
              {progress}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={section.percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${section.label} completion`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
