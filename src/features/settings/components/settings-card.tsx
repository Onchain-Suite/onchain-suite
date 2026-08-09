"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Flat "reference-match" settings card: a bordered surface with a header row
 * (title + description on the left, an optional action on the right), then an
 * optional divided body. Non-collapsible on purpose — the reference lays every
 * section out flat, unlike the collapsible {@link SettingsSectionCard}.
 */
interface SettingsCardProps {
  title: string;
  description?: string;
  /** Right-aligned control in the header (Edit / Add / Manage buttons). */
  action?: ReactNode;
  children?: ReactNode;
  /** DOM id so a deep link can scroll to this section. */
  id?: string;
  className?: string;
  bodyClassName?: string;
}

export function SettingsCard({
  title,
  description,
  action,
  children,
  id,
  className,
  bodyClassName,
}: SettingsCardProps) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl border border-border/60 bg-card/60 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children !== null && children !== undefined ? (
        <div
          className={cn(
            "border-t border-border/50 px-5 py-5 sm:px-6",
            bodyClassName
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** Read-only label/value grid used across the reference cards. */
export function DefinitionGrid({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-6 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1.5 break-words text-sm text-foreground">
            {item.value ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Three-step progress rail ("Add DNS records → We check → Verified"). `current`
 * is the 0-based index of the active step; earlier steps render as complete.
 */
export function SettingsStepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}
    >
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium",
                  done
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : active
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground"
                )}
              >
                {done ? (
                  <CheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-sm",
                  done || active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="hidden h-px w-8 bg-border sm:block"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Compact status pill in the reference's green/amber/neutral tones. */
export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "success" | "pending" | "danger" | "neutral";
  children: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
      : tone === "pending"
        ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
        : tone === "danger"
          ? "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400"
          : "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        toneClass
      )}
    >
      {tone === "success" ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
        />
      ) : null}
      {children}
    </span>
  );
}

/** Labeled tile (Plan / Price / Billing / Status) used on the billing summary. */
export function StatTile({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-background/40 px-4 py-3.5",
        className
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}

/** Usage bar with a "used / limit" caption, formatted numbers optional. */
export function UsageMeter({
  label,
  used,
  limit,
  format = (n: number) => n.toLocaleString(),
}: {
  label: string;
  used: number;
  limit: number;
  format?: (n: number) => string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const near = pct >= 90;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground">{label}</span>
        <span className="shrink-0 text-sm tabular-nums text-foreground">
          <span className="font-semibold">{format(used)}</span>
          <span className="text-muted-foreground"> / {format(limit)}</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            near ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
