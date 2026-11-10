import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Icon, type IconSvgElement } from "./hugeicon";

/**
 * The quiet empty state for a tab, a list or a pane inside a page (2.7
 * reference `EmptyState`): an icon, what is missing, and what fills it. A
 * whole section with nothing in it uses `SectionEmpty` instead, which adds a
 * preview and the action that fills it.
 *
 * Copy says what the place is for, not just that it is empty: "A tag is a
 * label you put on people" beats "No tags".
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconSvgElement;
  title: string;
  description: ReactNode;
  /** One button or link that fills it, when there is one. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-xl border border-(--border-subtle) bg-card text-(--text-secondary) shadow-(--elevation-xs)">
        <Icon icon={icon} className="size-[22px]" />
      </span>
      <h3 className="mt-3.5 text-sm font-semibold text-(--text-primary)">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-(--text-tertiary)">
        {description}
      </p>
      {action ? <div className="mt-[18px]">{action}</div> : null}
    </div>
  );
}
