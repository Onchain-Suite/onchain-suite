"use client";

import Link from "next/link";

import { useOnboardingCompletion } from "@/features/onboarding/hooks/use-onboarding-completion";
import { AUTH_ROUTES } from "@/shared/config/app-routes";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

/**
 * A quiet way back into the setup wizard for an owner who left it partway.
 *
 * It only appears when nothing says they finished: not this browser, not the
 * session, not the server, and the workspace is not in use (see
 * `useOnboardingCompletion`). It never redirects. It used to bounce owners to
 * /onboarding from the server's record alone, and that record could be
 * missing for someone who had finished, so people running a live workspace
 * were sent back to a wizard they had completed.
 *
 * Owner-only: onboarding is the owner's journey. A role still loading counts
 * as not-owner, so members never see it.
 */
export function OnboardingResumeBanner() {
  const { inProgress, completionPercentage } = useOnboardingCompletion();
  const { role } = useMyOrgRole();

  if (role !== "OWNER" || !inProgress) return null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border-subtle) bg-card px-4 py-3">
      <p className="text-sm text-(--text-secondary)">
        <b className="font-semibold text-(--text-primary)">
          You left setup partway.
        </b>{" "}
        {typeof completionPercentage === "number" && completionPercentage > 0
          ? `${completionPercentage}% done. Pick up where you left off.`
          : "Pick up where you left off, or carry on from the steps below."}
      </p>
      <Link
        href={AUTH_ROUTES.ONBOARDING}
        className="inline-flex h-8 items-center rounded-lg border border-(--border-default) px-3 text-sm font-medium text-(--text-primary) transition-colors hover:bg-(--tint-hover)"
      >
        Continue setup
      </Link>
    </div>
  );
}
