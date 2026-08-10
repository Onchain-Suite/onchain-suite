"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useSession } from "@/lib/auth-client";

import {
  type AcceptInviteResult,
  OrganizationMembersError,
  organizationMembersService,
} from "@/features/settings/organization-members.service";
import { Button } from "@/shared/components/ui/button";
import { AUTH_ROUTES, PRIVATE_ROUTES } from "@/shared/config/app-routes";

type AcceptState =
  | { phase: "checking" }
  | { phase: "accepting" }
  | { phase: "success"; result: AcceptInviteResult }
  | { phase: "error"; title: string; message: string };

/**
 * Maps `POST /invites/{token}/accept` failures to explicit, user-readable
 * states (expired/invalid link vs. already accepted vs. everything else).
 */
const toErrorState = (error: unknown): AcceptState => {
  const status =
    error instanceof OrganizationMembersError ? error.status : null;
  if (status === 404 || status === 410 || status === 400) {
    return {
      phase: "error",
      title: "Invite link is invalid or expired",
      message:
        "This invitation is no longer valid. Ask an organization admin to send you a new invite email.",
    };
  }
  if (status === 409) {
    return {
      phase: "error",
      title: "Invite already accepted",
      message:
        "This invitation has already been used. If that was you, you already have access - head to your dashboard.",
    };
  }
  return {
    phase: "error",
    title: "Couldn't accept the invite",
    message:
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "Something went wrong while accepting the invitation. Please try the link again.",
  };
};

export function InviteAcceptView({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [state, setState] = useState<AcceptState>({ phase: "checking" });
  const acceptStartedRef = useRef(false);

  // Unauthenticated users sign in first and come straight back here.
  useEffect(() => {
    if (isPending || session) return;
    const redirectTo = encodeURIComponent(
      `/invite/${encodeURIComponent(token)}`
    );
    router.replace(`${AUTH_ROUTES.LOGIN}?redirectTo=${redirectTo}`);
  }, [isPending, session, token, router]);

  // Accept exactly once per mount when authenticated.
  useEffect(() => {
    if (isPending || !session || acceptStartedRef.current) return;
    acceptStartedRef.current = true;
    setState({ phase: "accepting" });

    let cancelled = false;
    organizationMembersService
      .acceptInvite(token)
      .then((result) => {
        if (cancelled) return;
        // Invited members skip onboarding entirely (docs/backend.md
        // 2026-07-29: accept marks onboarding COMPLETE server-side and binds
        // sessions to the inviting org) - mirror that locally and go
        // straight to the team dashboard.
        document.cookie =
          "onchain.onboardingComplete=1; Path=/; Max-Age=31536000; SameSite=Lax";
        if (result.organizationId) {
          document.cookie = `onchain.selectedOrgId=${encodeURIComponent(
            result.organizationId
          )}; Path=/; Max-Age=31536000; SameSite=Lax`;
        }
        setState({ phase: "success", result });
        router.replace(PRIVATE_ROUTES.DASHBOARD);
      })
      .catch((error: unknown) => {
        if (!cancelled) setState(toErrorState(error));
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, session, token, router]);

  const goToDashboard = () => router.push(PRIVATE_ROUTES.DASHBOARD);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {state.phase === "checking" || state.phase === "accepting" ? (
          <>
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"
            />
            <h1 className="text-lg font-semibold text-foreground">
              {state.phase === "accepting"
                ? "Accepting your invitation…"
                : "Checking your session…"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This should only take a moment.
            </p>
          </>
        ) : state.phase === "success" ? (
          <>
            <div
              aria-hidden="true"
              className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              ✓
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {state.result.organizationName
                ? `You've joined ${state.result.organizationName}`
                : "Invitation accepted"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.result.role
                ? `You're in as ${state.result.role.charAt(0)}${state.result.role.slice(1).toLowerCase()}. `
                : ""}
              Your team&apos;s workspace is ready.
            </p>
            <Button className="mt-6 w-full" onClick={goToDashboard}>
              Go to dashboard
            </Button>
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400"
            >
              !
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {state.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.message}
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={goToDashboard}
            >
              Go to dashboard
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

export default InviteAcceptView;
