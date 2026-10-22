"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useOnboardingTracking } from "../../onboarding-flow/hooks";
import { AUTH_ROUTES } from "@/shared/config/app-routes";
import { useMyOrgRole } from "@/shared/hooks/client/use-my-org-role";

/**
 * Session-scoped guard so the resume redirect fires at most once: users who
 * deliberately leave /onboarding and come back to the dashboard must not be
 * bounced into a redirect loop.
 */
const RESUME_REDIRECT_SESSION_KEY = "onchain.onboarding.resumeRedirected";

/**
 * The owner-only "finish onboarding" banner plus the resume redirect that
 * bounces an owner who abandoned the wizard back to /onboarding (once per
 * session). The setup CHECKLIST itself now lives in the sidebar
 * (`GettingStarted`), so this is no longer a checklist host, only the resume
 * affordance. Renders nothing for members, completed owners, or once the
 * onboarding-complete cookie is set.
 */
export function OnboardingResumeBanner() {
  const router = useRouter();
  const {
    progress,
    resume,
    isLoading: isOnboardingLoading,
  } = useOnboardingTracking();
  const [onboardingCompleteCookie, setOnboardingCompleteCookie] =
    useState(false);

  // Onboarding is the OWNER's journey. Members (admin/editor/viewer) never
  // completed the wizard, so both the resume-redirect and the "finish
  // onboarding" banner must be owner-only - role null (loading/unknown)
  // counts as not-owner so members are never yanked out of the dashboard.
  const { role: myOrgRole } = useMyOrgRole();
  const isOrgOwner = myOrgRole === "OWNER";

  useEffect(() => {
    const cookieHeader =
      typeof document !== "undefined" ? (document.cookie ?? "") : "";
    const pairs = cookieHeader
      .split(";")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => {
        const idx = p.indexOf("=");
        if (idx === -1) return [p, ""] as const;
        return [p.slice(0, idx), p.slice(idx + 1)] as const;
      });
    const map = new Map(pairs);
    setOnboardingCompleteCookie(map.get("onchain.onboardingComplete") === "1");
  }, []);

  // Resumable onboarding: users who abandoned mid-flow land back on
  // /onboarding to finish - at most once per browser session (see
  // RESUME_REDIRECT_SESSION_KEY), so skipping out isn't a redirect loop.
  useEffect(() => {
    if (!isOrgOwner) return;
    if (isOnboardingLoading) return;
    if (resume?.status !== "in_progress") return;
    if (progress?.is_completed) return;
    if (typeof window === "undefined") return;
    // Read the cookie directly - the mirrored state may not have settled yet.
    if (document.cookie.includes("onchain.onboardingComplete=1")) return;
    if (window.sessionStorage.getItem(RESUME_REDIRECT_SESSION_KEY) === "1") {
      return;
    }
    window.sessionStorage.setItem(RESUME_REDIRECT_SESSION_KEY, "1");
    router.push(AUTH_ROUTES.ONBOARDING);
  }, [
    isOrgOwner,
    isOnboardingLoading,
    resume?.status,
    progress?.is_completed,
    router,
  ]);

  if (
    !isOrgOwner ||
    isOnboardingLoading ||
    onboardingCompleteCookie ||
    progress?.is_completed
  ) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            Finish onboarding to unlock your dashboard
          </div>
          <div className="text-sm text-muted-foreground">
            {typeof progress?.completion_percentage === "number"
              ? `${progress.completion_percentage}% complete. Continue where you left off.`
              : "Continue where you left off to personalize your workspace and set up your organization."}
          </div>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
        >
          Continue onboarding
        </Link>
      </div>
    </div>
  );
}
