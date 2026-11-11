import { cn } from "@/lib/utils";

import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

/**
 * One way to start a Loop on the New Loop page (2.7): an icon, a name and one
 * line, side by side. `feature` marks the one we would start with; `muted`
 * the plain "from scratch".
 */
export function LoopStartCard({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  busy = false,
  tone = "default",
  size = "default",
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  /** This card's Loop is being created. */
  busy?: boolean;
  tone?: "default" | "feature" | "muted";
  size?: "default" | "large";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className={cn(
        "flex w-full items-start gap-3.5 rounded-xl border bg-card text-left transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none disabled:cursor-not-allowed",
        size === "large" ? "p-[18px]" : "p-4",
        tone === "feature"
          ? "border-primary/45 bg-primary/[0.04]"
          : "border-(--border-default)",
        disabled && !busy
          ? "opacity-60"
          : "hover:border-(--border-strong) hover:shadow-(--elevation-1)"
      )}
    >
      <span
        className={cn(
          "flex size-[38px] shrink-0 items-center justify-center rounded-lg",
          tone === "feature"
            ? "bg-primary text-primary-foreground"
            : tone === "muted"
              ? "bg-(--tint-hover) text-(--text-secondary)"
              : "bg-(--bg-selected) text-primary"
        )}
      >
        <Icon icon={icon} className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <b className="text-sm font-semibold text-(--text-primary)">{title}</b>
        <span className="text-xs leading-[1.45] text-(--text-secondary)">
          {busy ? "Creating your Loop…" : description}
        </span>
      </span>
    </button>
  );
}
