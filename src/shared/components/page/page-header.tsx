import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /**
   * One sentence that answers the question the page exists for (2.7, 7 Nov
   * 2026): "You sent 3 campaigns, 1,182 messages in all." It replaced the
   * strip of stat cards that pushed the list below the fold. May hold `<b>`.
   */
  description?: ReactNode;
  /** The page's main action, on the right. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Every list page opens the same way: the title, the answer, the main action
 * on the right, then 24px to its tabs or list. A server-safe component with
 * no animation: the header is the first thing painted, so it should not move.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start gap-5", className)}>
      <div className="min-w-0 flex-1 basis-80">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px] text-(--text-primary)">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-[78ch] text-[14.5px] leading-relaxed text-(--text-secondary) [&_b]:font-semibold [&_b]:text-(--text-primary)">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </div>
  );
}

export default PageHeader;
