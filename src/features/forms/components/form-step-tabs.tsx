"use client";

import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

import { cn } from "@/lib/utils";

/**
 * The "Step 1 / Step 2 / + Step" row above the form preview. Clickable, not
 * drag: pick a step to edit it, add a step, or remove one (never the last).
 */
export function FormStepTabs({
  count,
  current,
  onSelect,
  onAdd,
  onRemove,
  max = 6,
}: {
  count: number;
  current: number;
  onSelect: (step: number) => void;
  onAdd: () => void;
  onRemove: (step: number) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className={cn(
            "group flex items-center rounded-md border text-sm transition-colors",
            s === current
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(s)}
            className="px-3 py-1.5 font-medium"
          >
            Step {s}
          </button>
          {count > 1 ? (
            <button
              type="button"
              onClick={() => onRemove(s)}
              aria-label={`Remove step ${s}`}
              className="pr-2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              <XMarkIcon className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
      {count < max ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          Step
        </button>
      ) : null}
    </div>
  );
}
