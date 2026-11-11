import { cn } from "@/lib/utils";

import type { HealthTone } from "../../utils/developer";

const TONE: Record<HealthTone | "info", string> = {
  success: "bg-(--status-success-bg) text-(--status-success-text)",
  error: "bg-(--status-error-bg) text-(--status-error-text)",
  warning: "bg-(--status-warning-bg) text-(--status-warning-text)",
  info: "bg-(--status-info-bg) text-(--status-info-text)",
  neutral: "bg-(--tint-hover) text-(--text-secondary)",
};

/** A status in a word, coloured by what it means. `dot` adds the state dot. */
export function ToneBadge({
  tone,
  dot = false,
  children,
}: {
  tone: HealthTone | "info";
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap",
        TONE[tone]
      )}
    >
      {dot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}
