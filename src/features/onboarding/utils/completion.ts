import type { CompleteOnboardingBody } from "../contracts/completion";

/*
 * Whether someone has finished onboarding, as this device knows it.
 *
 * The server's record is the truth, but the request that writes it can be
 * lost: the wizard used to fire it and navigate to checkout in the same
 * breath, and a rate limit can refuse it. A person who finished must never be
 * told to finish again, so the device keeps its own evidence and the app
 * repairs the server from it (see `use-onboarding-completion`).
 */

export const ONBOARDING_COMPLETE_COOKIE = "onchain.onboardingComplete";
/** A completion that has been asked for but not yet confirmed by the server. */
const PENDING_KEY = "onchain.onboarding.pendingComplete";
/** The server has confirmed completion to this device: no need to ask again. */
const CONFIRMED_KEY = "onchain.onboarding.serverConfirmed";

export const hasCompleteCookie = (cookieHeader: string): boolean =>
  cookieHeader
    .split(";")
    .some((pair) => pair.trim() === `${ONBOARDING_COMPLETE_COOKIE}=1`);

/** Marks this browser as having finished (one year). */
export function markCompleteOnDevice(): void {
  document.cookie = `${ONBOARDING_COMPLETE_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readPendingCompletion(): CompleteOnboardingBody | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as CompleteOnboardingBody)
      : null;
  } catch {
    return null;
  }
}

/** Written BEFORE the request, so a page unload mid-request still leaves it. */
export function savePendingCompletion(body: CompleteOnboardingBody): void {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(body));
  } catch {
    // Storage blocked: the cookie still stops the reminder on this device.
  }
}

export function clearPendingCompletion(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // nothing to clear
  }
}

export function isServerConfirmed(): boolean {
  try {
    return window.localStorage.getItem(CONFIRMED_KEY) === "1";
  } catch {
    return false;
  }
}

/** The server holds the completion: remember it, and drop the pending copy. */
export function markServerConfirmed(): void {
  markCompleteOnDevice();
  clearPendingCompletion();
  try {
    window.localStorage.setItem(CONFIRMED_KEY, "1");
  } catch {
    // Storage blocked: we simply ask the server again next time.
  }
}

/** Everything that can say "this person finished onboarding". */
export interface CompletionEvidence {
  /** This browser saw them finish. */
  cookie: boolean;
  /** A completion was asked for here and is still to be confirmed. */
  pending: boolean;
  /** `user.onboardingCompleted` on the session (also true for invited members). */
  userFlag: boolean;
  /** The server's own record says completed. */
  serverCompleted: boolean;
  /** The workspace is in use: nobody running a live workspace needs the wizard. */
  workspaceLive: boolean;
}

/** True when anything says they finished. One signal is enough to never remind. */
export const isOnboardingDone = (e: CompletionEvidence): boolean =>
  e.cookie || e.pending || e.userFlag || e.serverCompleted || e.workspaceLive;

/**
 * The server says "in progress" but this device knows better, so its record
 * should be fixed. Only for someone who actually started the wizard: an
 * invited member (`not_started`) never ran it, and completing it for them
 * would count them as onboarded.
 */
export const shouldRepairServer = (
  serverStatus: "not_started" | "in_progress" | "completed" | undefined,
  e: Pick<CompletionEvidence, "cookie" | "workspaceLive">
): boolean => serverStatus === "in_progress" && (e.cookie || e.workspaceLive);
