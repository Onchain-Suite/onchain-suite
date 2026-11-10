"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { useSetupSteps } from "../hooks/use-setup-steps";
import { useWorkspaceMode } from "@/features/onboarding/hooks/use-workspace-mode";
import { Icon } from "@/shared/components/common/hugeicon";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * Setup, as one line in the sidebar (v2.7 reference, 7 Nov 2026).
 *
 * The checklist used to live here as a card with every step in it, and the
 * same steps were on Home, so a new workspace saw its setup twice; expanded,
 * the card also covered the bottom of the nav on a laptop screen. Now the
 * checklist lives in one place, the first-run Home, and this line keeps count
 * from any screen and brings you back to it.
 *
 * It shows only while a workspace is being set up. A workspace in use has no
 * checklist: what still matters there, like an unverified sending domain, is
 * on Home's to-do list. Hidden while its reads load (so it never flashes a
 * wrong count) and on the icon rail, where there is no room.
 */
export function GettingStarted() {
  const { steps, isLoading } = useSetupSteps();
  const { mode, isLoading: modeLoading } = useWorkspaceMode();

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (isLoading || modeLoading || mode !== "empty") return null;
  if (total === 0 || done >= total) return null;
  const next = steps.find((s) => !s.done);

  return (
    <Link
      href={`${PRIVATE_ROUTES.DASHBOARD}#setup`}
      data-tour="getting-started"
      aria-label={`Setup: ${done} of ${total} done.${next ? ` Next: ${next.label}.` : ""}`}
      className="flex flex-col gap-1.5 rounded-lg border border-(--border-subtle) bg-card px-3 py-2.5 shadow-(--elevation-xs) transition-colors group-data-[collapsible=icon]:hidden hover:border-(--border-default)"
    >
      <span className="flex items-center gap-2 text-[13px]">
        <b className="font-semibold text-(--text-primary)">Setup</b>
        <span className="text-(--text-tertiary) tabular-nums">
          {done} of {total}
        </span>
        <Icon
          icon={ArrowRight01Icon}
          className="ml-auto size-[13px] text-(--text-tertiary)"
        />
      </span>
      {/* One segment per step: the segments are the count. */}
      <span aria-hidden="true" className="flex gap-[3px]">
        {steps.map((s) => (
          <span
            key={s.id}
            className={cn(
              "h-[3px] flex-1 rounded-full",
              s.done ? "bg-primary" : "bg-(--border-subtle)"
            )}
          />
        ))}
      </span>
      {next ? (
        <span className="truncate text-[11.5px] text-(--text-tertiary)">
          Next: {next.label}
        </span>
      ) : null}
    </Link>
  );
}
