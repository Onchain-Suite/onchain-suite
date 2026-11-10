"use client";

import {
  Clock01Icon,
  FlashIcon,
  InboxIcon,
  Mail01Icon,
  PencilEdit02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import type { TodayIcon, TodayItem, Urgency } from "../../utils/today";
import { Icon, type IconSvgElement } from "@/shared/components/common/hugeicon";

const GLYPH: Record<TodayIcon, IconSvgElement> = {
  inbox: InboxIcon,
  loop: FlashIcon,
  clock: Clock01Icon,
  draft: PencilEdit02Icon,
  mail: Mail01Icon,
};

const WHEN: Record<Urgency, { label: string; className: string }> = {
  now: { label: "Now", className: "bg-primary/10 text-primary" },
  today: {
    label: "Today",
    className: "bg-(--status-info-bg) text-(--status-info-text)",
  },
  soon: {
    label: "Soon",
    className: "bg-(--tint-hover) text-(--text-tertiary)",
  },
};

/** One thing to do: what it is, why it matters now, and the button that does it. */
export function TodoRow({
  item,
  done,
  onDone,
}: {
  item: TodayItem;
  /** Shown faded when "done for today" items are revealed. */
  done: boolean;
  onDone: () => void;
}) {
  const urgent = item.urgency === "now";
  return (
    <li
      data-row=""
      tabIndex={-1}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3.5 rounded-xl border border-(--border-subtle) bg-card py-3.5 pr-3.5 pl-4 shadow-(--elevation-xs) transition-[border-color,box-shadow] hover:border-(--border-default) hover:shadow-(--elevation-1) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        done && "opacity-55 shadow-none"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[34px] items-center justify-center rounded-lg",
          urgent
            ? "bg-primary/10 text-primary"
            : "bg-(--tint-hover) text-(--text-secondary)"
        )}
      >
        <Icon icon={GLYPH[item.icon]} className="size-[17px]" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 pt-px">
        <span className="flex flex-wrap items-center gap-2">
          <b className="text-[14.5px] font-semibold text-(--text-primary)">
            {item.title}
          </b>
          <span
            className={cn(
              "rounded-full px-[7px] py-px text-[11px] font-semibold",
              WHEN[item.urgency].className
            )}
          >
            {WHEN[item.urgency].label}
          </span>
        </span>
        <span className="text-[13px] leading-normal text-(--text-secondary)">
          {item.why}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant={urgent ? "default" : "outline"} asChild>
          <Link href={item.action.href}>{item.action.label}</Link>
        </Button>
        {!done ? (
          <button
            type="button"
            onClick={onDone}
            aria-label={`Done for today: ${item.title}`}
            title="Done for today"
            className="flex size-8 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--tint-hover) hover:text-(--text-primary)"
          >
            <Icon icon={Tick02Icon} className="size-[15px]" />
          </button>
        ) : null}
      </div>
    </li>
  );
}
