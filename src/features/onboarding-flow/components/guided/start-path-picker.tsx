"use client";

import {
  ContractsIcon,
  Globe02Icon,
  UserListIcon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

import { START_PATHS, type StartPath } from "../../constants/guided";
import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

const GLYPH: Record<StartPath, IconSvgElement> = {
  people: UserListIcon,
  site: Globe02Icon,
  chain: ContractsIcon,
};

/**
 * "What do you have today?" as three answers side by side with short lines,
 * so step 1 still fits a laptop screen (2.7). A radio group: one answer.
 */
export function StartPathPicker({
  value,
  onChange,
}: {
  value: StartPath | "";
  onChange: (start: StartPath) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">
        What do you have today?
      </legend>
      <div role="radiogroup" className="grid gap-2 pt-1 sm:grid-cols-3">
        {START_PATHS.map((p) => {
          const on = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(p.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                on
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-lg",
                  on
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon icon={GLYPH[p.id]} className="size-4" />
              </span>
              <b className="text-foreground text-sm font-semibold">{p.label}</b>
              <span className="text-muted-foreground text-xs leading-snug">
                {p.desc}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
