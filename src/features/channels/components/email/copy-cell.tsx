"use client";

import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Icon } from "@/shared/components/common/hugeicon";

/**
 * A value that copies itself on click, and says so in place. The whole value is
 * the target, not a small icon beside it, and it wraps instead of truncating:
 * something pasted into a DNS provider has to be readable in full first.
 */
export function CopyCell({
  value,
  what,
  className,
}: {
  value: string;
  /** What is being copied, for the accessible name: "host for DKIM 1". */
  what: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error("Copy failed. Select the value by hand.");
      return;
    }
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1400);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={done ? `Copied ${what}` : `Copy ${what}`}
      title={value}
      className={cn(
        "group/cell flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <code className="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-foreground">
        {value}
      </code>
      <Icon
        icon={done ? Tick02Icon : Copy01Icon}
        className={cn(
          "size-3.5 shrink-0 transition-opacity",
          done
            ? "text-emerald-600 opacity-100 dark:text-emerald-400"
            : "text-muted-foreground opacity-100 @2xl:opacity-0 @2xl:group-hover/cell:opacity-100 @2xl:group-focus-visible/cell:opacity-100"
        )}
      />
    </button>
  );
}
