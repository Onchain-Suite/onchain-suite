"use client";

import { type ComponentType, type ReactNode } from "react";

/**
 * Shared chrome for the per-step onboarding illustrations: the muted brand wash, the product-card
 * window frame, and a floating chip. Each step renders its own scene inside this; all decorative,
 * so the owning <aside> is aria-hidden.
 */
export function IllustrationShell({
  children,
  chips,
}: {
  children: ReactNode;
  chips?: ReactNode;
}) {
  return (
    <aside aria-hidden className="relative hidden lg:block">
      <div className="pointer-events-none absolute -inset-8 -z-10">
        <div className="bg-primary/15 absolute right-6 top-10 h-48 w-48 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute bottom-6 left-0 h-40 w-40 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        <div className="bg-card overflow-hidden rounded-2xl border border-border shadow-[0_30px_80px_-40px_rgba(23,39,224,0.45)]">
          <div className="bg-muted/40 flex items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="bg-primary/30 h-2.5 w-2.5 rounded-full" />
            <span className="bg-primary/20 h-2.5 w-2.5 rounded-full" />
            <span className="bg-primary/10 h-2.5 w-2.5 rounded-full" />
            <span className="text-muted-foreground ml-1.5 text-[11px] font-medium">
              Onchain Suite
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="bg-primary/40 absolute inline-flex h-full w-full animate-ping rounded-full" />
                <span className="bg-primary relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span className="text-muted-foreground text-[10px]">Live</span>
            </span>
          </div>
          <div className="space-y-4 p-4">{children}</div>
        </div>
        {chips}
      </div>
    </aside>
  );
}

/** A small card that floats just outside the frame, for a bit of life. `className` positions it. */
export function FloatingChip({
  className = "",
  icon: Icon,
  title,
  subtitle,
}: {
  className?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`bg-card absolute flex items-center gap-2 rounded-xl border border-border px-3 py-2 shadow-lg ${className}`}
    >
      <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <span>
        <span className="text-foreground block text-[11px] font-semibold leading-tight">
          {title}
        </span>
        {subtitle ? (
          <span className="text-muted-foreground block text-[10px] leading-tight">
            {subtitle}
          </span>
        ) : null}
      </span>
    </div>
  );
}
