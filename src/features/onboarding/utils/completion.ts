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
/*
 * These two are kept PER USER. A browser is shared between accounts (a second
 * sign-in, a teammate's laptop), and one account's finished wizard must never
 * be replayed as, or stand in for, another's.
 */
/** A completion that has been asked for but not yet confirmed by the server. */
const pendingKey = (userId: string) =>
  `onchain.onboarding.pendingComplete:${userId}`;
/** The server has confirmed completion to this device: no need to ask again. */
const confirmedKey = (userId: string) =>
  `onchain.onboarding.serverConfirmed:${userId}`;

export const hasCompleteCookie = (cookieHeader: string): boolean =>
  cookieHeader
    .split(";")
    .some((pair) => pair.trim() === `${ONBOARDING_COMPLETE_COOKIE}=1`);

/** Marks this browser as having finished (one year). */
export function markCompleteOnDevice(): void {
  document.cookie = `${ONBOARDING_COMPLETE_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readPendingCompletion(
  userId: string
): CompleteOnboardingBody | null {
  try {
    const raw = window.localStorage.getItem(pendingKey(userId));
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
export function savePendingCompletion(
  userId: string,
  body: CompleteOnboardingBody
): void {
  try {
    window.localStorage.setItem(pendingKey(userId), JSON.stringify(body));
  } catch {
    // Storage blocked: the cookie still stops the reminder on this device.
  }
}

export function clearPendingCompletion(userId: string): void {
  try {
    window.localStorage.removeItem(pendingKey(userId));
  } catch {
    // nothing to clear
  }
}

export function isServerConfirmed(userId: string): boolean {
  try {
    return window.localStorage.getItem(confirmedKey(userId)) === "1";
  } catch {
    return false;
  }
}

/** The server holds the completion: remember it, and drop the pending copy. */
export function markServerConfirmed(userId: string): void {
  markCompleteOnDevice();
  clearPendingCompletion(userId);
  try {
    window.localStorage.setItem(confirmedKey(userId), "1");
  } catch {
    // Storage blocked: we simply ask the server again next time.
  }
}

/** Everything that can say "this person finished onboarding". */
export interface CompletionEvidence {
  /**
   * Someone finished on this browser. Not tied to an account, so it is enough
   * to hold back a reminder but never grounds for changing a server record.
   */
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
 * The server says "in progress" for someone whose workspace is in use, so its
 * record should be fixed. Only for someone who actually started the wizard: an
 * invited member (`not_started`) never ran it, and completing it for them
 * would count them as onboarded. The browser cookie is deliberately not
 * grounds for this: it may belong to another account. (A completion this
 * account asked for here is re-sent from its own pending record instead.)
 */
export const shouldRepairServer = (
  serverStatus: "not_started" | "in_progress" | "completed" | undefined,
  e: Pick<CompletionEvidence, "workspaceLive">
): boolean => serverStatus === "in_progress" && e.workspaceLive;
