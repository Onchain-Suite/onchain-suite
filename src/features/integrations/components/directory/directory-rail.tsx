"use client";

import { cn } from "@/lib/utils";

export interface RailItem<K extends string> {
  key: K;
  label: string;
  icon: React.ReactNode;
  count: number;
}

/**
 * The categories down the side of a directory. A row of chips on a phone, a
 * column beside the cards from md up. `children` sits under the list, for a
 * note that applies to every category.
 */
export function DirectoryRail<K extends string>({
  label,
  items,
  value,
  onChange,
  children,
}: {
  /** What the rail filters, for screen readers ("Source categories"). */
  label: string;
  items: RailItem<K>[];
  value: K;
  onChange: (key: K) => void;
  children?: React.ReactNode;
}) {
  return (
    <nav aria-label={label}>
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] md:flex-col md:gap-px md:overflow-visible [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.key === value;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-[7px] text-left text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
                active
                  ? "bg-(--bg-selected) font-medium text-primary"
                  : "text-(--text-secondary) hover:bg-(--tint-hover) hover:text-(--text-primary)"
              )}
            >
              {item.icon}
              <span className="whitespace-nowrap">{item.label}</span>
              <span className="ml-auto pl-2 text-[11.5px] text-(--text-tertiary) tabular-nums">
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
      {children}
    </nav>
  );
}
