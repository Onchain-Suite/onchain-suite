"use client";

import { cn } from "@/lib/utils";

import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

export interface PillTab<K extends string> {
  key: K;
  label: string;
  icon?: IconSvgElement;
  /** How many things the tab holds, shown after its label once known. */
  count?: number;
}

/** The id a tab's panel points back to with `aria-labelledby`. */
export const pillTabId = (name: string, key: string) => `${name}-tab-${key}`;

/**
 * A page's section tabs as pills (2.7, 7 Nov 2026): the same bar on Audience,
 * Analytics and Integrations. `children` holds the active tab's own controls
 * on the right. Six tabs do not fit a phone, so the row scrolls sideways on
 * its own instead of pushing the page wider.
 */
export function PillTabs<K extends string>({
  name,
  label,
  tabs,
  value,
  onChange,
  children,
  className,
}: {
  /** Stable prefix for the tab ids, e.g. "integrations". */
  name: string;
  /** What the tabs switch between, for screen readers. */
  label: string;
  tabs: PillTab<K>[];
  value: K;
  onChange: (key: K) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-(--tint-hover) p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = value === tab.key;
          return (
            <button
              key={tab.key}
              id={pillTabId(name, tab.key)}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                active
                  ? "bg-card text-(--text-primary) shadow-(--elevation-xs)"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              )}
            >
              {tab.icon ? (
                <Icon icon={tab.icon} className="size-[15px]" />
              ) : null}
              {tab.label}
              {typeof tab.count === "number" ? (
                <span className="text-(--text-tertiary) tabular-nums">
                  {tab.count.toLocaleString("en-US")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
