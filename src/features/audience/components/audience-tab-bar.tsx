"use client";

import { cn } from "@/lib/utils";

import type { AudienceTab } from "./audience-answer-line";

const TABS: { key: AudienceTab; label: string }[] = [
  { key: "contacts", label: "Contacts" },
  { key: "segments", label: "Segments" },
  { key: "lists", label: "Lists and tags" },
];

/**
 * Audience's three equal tabs (2.7): Contacts, Segments, Lists and tags.
 * Suppressed is a filter on Contacts, since suppressed people are contacts in
 * one particular state; `children` holds the tab's own controls on the right.
 */
export function AudienceTabBar({
  value,
  counts,
  onChange,
  children,
}: {
  value: AudienceTab;
  counts: Record<AudienceTab, number | undefined>;
  onChange: (tab: AudienceTab) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="tablist"
        aria-label="Audience"
        className="inline-flex items-center gap-1 rounded-lg bg-(--tint-hover) p-1"
      >
        {TABS.map((tab) => {
          const active = value === tab.key;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                active
                  ? "bg-card text-(--text-primary) shadow-(--elevation-xs)"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              )}
            >
              {tab.label}
              {typeof count === "number" ? (
                <span className="ml-1.5 text-(--text-tertiary) tabular-nums">
                  {count.toLocaleString("en-US")}
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
