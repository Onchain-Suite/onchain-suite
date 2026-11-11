"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<K extends string> {
  key: K;
  label: string;
}

/**
 * A small either-or switch between views of the same space (2.7): "Indexed
 * contracts · 3 | Product events · 12". A single-select radio group, so the
 * arrow keys are the browser's and Tab lands on it once.
 */
export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  /** What the options switch between, for screen readers. */
  label: string;
  options: SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-(--border-subtle) bg-card p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((option) => {
        const on = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.key)}
            className={cn(
              "shrink-0 rounded-md px-[11px] py-[5px] text-[12.5px] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
              on
                ? "bg-(--bg-selected) font-medium text-primary"
                : "text-(--text-secondary) hover:text-(--text-primary)"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
