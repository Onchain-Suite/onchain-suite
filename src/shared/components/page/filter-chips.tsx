"use client";

import { cn } from "@/lib/utils";

export interface FilterChip<K extends string> {
  key: K;
  label: string;
  count: number;
}

/**
 * The row of filters under a list page's header (2.7): "All · 7", "Sent · 3".
 * A single-select radio group: arrow keys are the browser's, Tab lands once.
 */
export function FilterChips<K extends string>({
  label,
  chips,
  value,
  onChange,
}: {
  /** What the chips filter, for screen readers ("Filter campaigns by status"). */
  label: string;
  chips: FilterChip<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const on = chip.key === value;
        return (
          <button
            key={chip.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(chip.key)}
            className={cn(
              "h-7 rounded-md border px-2.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
              on
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-(--border-subtle) bg-card text-(--text-secondary) hover:text-(--text-primary)"
            )}
          >
            {chip.label}
            <span className="tabular-nums"> · {chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A remembered filter must still be one of today's chips, or it falls back. */
export function validChip<K extends string>(
  value: unknown,
  keys: readonly K[],
  fallback: K
): K {
  return keys.includes(value as K) ? (value as K) : fallback;
}
