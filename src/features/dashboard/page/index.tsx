"use client";

import { DashboardTodaySkeleton } from "../components/dashboard-skeletons";
import { TodayView } from "../components/home/today-view";
import { HomeFirstRun } from "../components/home-first-run";
import { OnboardingResumeBanner } from "../components/onboarding-resume-banner";
import { SETUP_DEADLINE_MS, useElapsed } from "../hooks/use-setup-steps";
import { nonEmpty } from "../utils/text";
import { useTimeToValue } from "@/features/onboarding/hooks/use-time-to-value";
import { useWorkspaceMode } from "@/features/onboarding/hooks/use-workspace-mode";
import { Skeleton } from "@/shared/components/ui/skeleton";

interface MainDashboardProps {
  /** Who to greet. Falls back to a neutral word when the session has no name. */
  firstName?: string;
  /** The viewer's timezone, so "Good morning" is their morning. */
  timezone?: string;
}

function getGreeting(tz?: string) {
  let hour = new Date().getHours();
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false,
      }).formatToParts(new Date());
      const hourPart = parts.find((p) => p.type === "hour");
      if (hourPart) {
        hour = parseInt(hourPart.value, 10);
      }
    }
  } catch {
    hour = new Date().getHours();
  }
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Home. A workspace with nothing in it gets the first-run (the question, then
 * the setup steps); a workspace in use gets what needs you today.
 *
 * Which of the two it is takes two reads. While they are in flight Home shows
 * its greeting over a skeleton rather than guessing: guessing "in use" flashed
 * the to-do list (and fired its requests) at every new workspace before
 * swapping to the first-run. The wait is bounded, so a stalled read can never
 * hold Home on the skeleton: past the deadline it opens as a workspace in use.
 */
export function MainDashboard({ firstName, timezone }: MainDashboardProps) {
  const greeting = getGreeting(timezone);
  const name = nonEmpty(firstName) ?? "there";

  const { mode, isLoading } = useWorkspaceMode();
  const pastDeadline = useElapsed(SETUP_DEADLINE_MS);
  const deciding = isLoading && !pastDeadline;

  // Close the time-to-value clock once this workspace first reads as live
  // (reports once, only when the wizard set a first-mile start stamp).
  useTimeToValue();

  if (deciding) {
    return (
      <div className="mx-auto w-full max-w-7xl" aria-busy="true">
        <header className="mb-[22px]">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.6px] text-(--text-primary)">
            {`Good ${greeting}, ${name}.`}
          </h1>
          <Skeleton className="mt-2.5 h-4 w-96 max-w-full" />
        </header>
        <DashboardTodaySkeleton />
      </div>
    );
  }

  if (mode === "empty") {
    return (
      <div className="space-y-6">
        {/* Only for an owner who genuinely left the wizard partway; a
            workspace in use is never told to finish onboarding. */}
        <OnboardingResumeBanner />
        <HomeFirstRun greeting={greeting} name={name} />
      </div>
    );
  }

  return <TodayView greeting={greeting} name={name} />;
}
