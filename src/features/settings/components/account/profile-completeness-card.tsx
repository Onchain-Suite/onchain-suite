"use client";

import { CheckCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { SettingsCard } from "../settings-card";
import {
  type CompletenessItem,
  useProfileCompleteness,
} from "./use-profile-completeness";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Circular percent ring. SVG uses `var(--primary)` so it themes correctly. */
function CompletionRing({ percent }: { percent: number }) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Profile ${percent}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="var(--border)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="var(--primary)"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 500ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums text-foreground">
          {percent}%
        </span>
      </div>
    </div>
  );
}

function CompletionRow({ item }: { item: CompletenessItem }) {
  if (item.done) {
    return (
      <li className="flex items-center gap-2 py-1.5">
        <CheckCircleIcon
          aria-hidden="true"
          className="size-5 shrink-0 text-emerald-500"
        />
        <span className="text-sm text-muted-foreground line-through">
          {item.label}
        </span>
      </li>
    );
  }

  return (
    <li className="py-1.5">
      <Link
        href={item.href}
        className="group flex items-start gap-2 rounded-md"
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 size-5 shrink-0 rounded-full border-2",
            item.emphasis ? "border-amber-500" : "border-muted-foreground/40"
          )}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:text-primary">
            {item.label}
            {item.emphasis ? (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
                Needed
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {item.hint}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Profile completeness ring for the Account tab: a circular percent gauge plus a
 * checklist of the org fields a sender needs filled - with billing email, postal
 * address and a verified sender flagged as "Needed" since they gate real sending
 * and CAN-SPAM footers. Each open item deep-links to where it's filled.
 */
export function ProfileCompletenessCard() {
  const { items, completed, total, percent, isComplete, isLoading } =
    useProfileCompleteness();

  if (isLoading) {
    return (
      <SettingsCard
        title="Profile completeness"
        description="Fill these so your emails send and personalize correctly."
      >
        <div className="flex items-center gap-6">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2">
            {["a", "b", "c", "d"].map((k) => (
              <Skeleton key={k} className="h-5 w-full max-w-sm" />
            ))}
          </div>
        </div>
      </SettingsCard>
    );
  }

  // Everything filled: a compact confirmation instead of a full checklist.
  if (isComplete) {
    return (
      <SettingsCard
        title="Profile completeness"
        description="Everything a sender needs is filled."
      >
        <div className="flex items-center gap-4">
          <CompletionRing percent={100} />
          <div className="flex items-center gap-2">
            <CheckCircleIcon
              aria-hidden="true"
              className="size-5 text-emerald-500"
            />
            <p className="text-sm font-medium text-foreground">
              All {total} details complete - you&apos;re ready to send.
            </p>
          </div>
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      title="Profile completeness"
      description="Fill these so your emails send and personalize correctly."
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2 sm:w-32">
          <CompletionRing percent={percent} />
          <p className="text-xs text-muted-foreground">
            {completed} of {total} complete
          </p>
        </div>
        <ul className="min-w-0 flex-1 divide-y divide-border/40">
          {items.map((item) => (
            <CompletionRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </SettingsCard>
  );
}

export default ProfileCompletenessCard;
