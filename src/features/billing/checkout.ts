import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import { billingService, type PlanCheckoutSlug } from "./billing.service";

/**
 * Blockradar crypto checkout flow (docs/backend.md):
 *   POST /billing/checkout/plan → { paymentUrl, reference } → user pays on
 *   the hosted Blockradar page → the deposit webhook upgrades the org plan →
 *   GET /billing/upgrade/blockradar/{reference} reports the outcome.
 *
 * The pending reference is persisted locally so that when the user comes
 * back to the app after paying, we can poll the reference and confirm the
 * upgrade (see PendingCheckoutBanner).
 */

const PENDING_CHECKOUT_KEY = "onchain.billing.pendingCheckout.v1";

export interface PendingCheckout {
  reference: string;
  plan: string;
  startedAt: number;
  /** Human-readable checkout amount (e.g. "49" / "49 USDC"), when known. */
  amount?: string;
}

/** Fired whenever the pending checkout changes, so live UI (the pending
 * checkout banner) can pick it up without a remount. */
export const PENDING_CHECKOUT_EVENT = "onchain:billing-checkout";

/**
 * Crypto deposits normally confirm within a couple of minutes. Past this we
 * stop polling and surface a "taking longer than expected" state instead of
 * spinning forever: an abandoned checkout must not leave the banner hitting
 * the status endpoint every few seconds for the life of the session.
 */
export const PENDING_CHECKOUT_TTL_MS = 15 * 60 * 1000;

/**
 * Hard purge window. A pending checkout older than this is dropped on read so
 * a forgotten reference can never haunt the UI across sessions.
 */
const PENDING_CHECKOUT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** True once we've waited past {@link PENDING_CHECKOUT_TTL_MS}. */
export const isPendingCheckoutStale = (
  pending: Pick<PendingCheckout, "startedAt">,
  now: number = Date.now()
): boolean => now - pending.startedAt >= PENDING_CHECKOUT_TTL_MS;

const notifyPendingCheckoutChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PENDING_CHECKOUT_EVENT));
};

/** Display plan name → catalog slug for POST /billing/checkout/plan. */
const PLAN_SLUGS: Record<string, PlanCheckoutSlug> = {
  launch: "launch",
  growth: "growth",
  pro: "pro",
};

/**
 * Every displayed plan is self-serve payable — unknown names normalize to a
 * slug and the backend is the authority (404 Unknown plan on a bad one).
 * Null only for an empty name.
 */
export const planCheckoutSlug = (planName: string): string | null => {
  const key = planName.trim().toLowerCase();
  if (key.length === 0) return null;
  return PLAN_SLUGS[key] ?? key.replace(/[^a-z0-9]+/g, "_");
};

export const readPendingCheckout = (): PendingCheckout | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_CHECKOUT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isJsonObject(parsed)) return null;
    if (typeof parsed.reference !== "string" || parsed.reference.length === 0) {
      return null;
    }
    const pending: PendingCheckout = {
      reference: parsed.reference,
      plan: typeof parsed.plan === "string" ? parsed.plan : "",
      startedAt:
        typeof parsed.startedAt === "number" ? parsed.startedAt : Date.now(),
      amount: typeof parsed.amount === "string" ? parsed.amount : undefined,
    };

    // Self-heal: a checkout this old is never going to confirm, so drop it
    // rather than resurrect a stale banner on every page load.
    if (Date.now() - pending.startedAt >= PENDING_CHECKOUT_MAX_AGE_MS) {
      window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
      return null;
    }

    return pending;
  } catch {
    return null;
  }
};

export const writePendingCheckout = (pending: PendingCheckout): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
  notifyPendingCheckoutChanged();
};

export const clearPendingCheckout = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_CHECKOUT_KEY);
  notifyPendingCheckoutChanged();
};

/**
 * Open the hosted payment page in a new tab so the app stays alive to track
 * the payment. Returns false only when a popup blocker actually intervened —
 * callers fall back to same-tab navigation.
 *
 * Do NOT pass "noopener" in the features string: per the HTML spec
 * `window.open()` returns null whenever noopener is set, even on success. That
 * made callers read a successful open as "blocked" and navigate the current
 * tab to the payment URL as well, so paying opened two tabs. Instead open a
 * blank tab (same-origin, so the handle is readable), sever `opener` there,
 * then navigate it to the payment page.
 */
export const openCheckoutInNewTab = (paymentUrl: string): boolean => {
  if (typeof window === "undefined") return false;

  const win = window.open("", "_blank");
  if (!win) return false;

  try {
    // Severed while the tab is still about:blank, so the payment page can't
    // reach back into the app (reverse tabnabbing).
    win.opener = null;
  } catch {
    // Some engines disallow the write; navigation below still works.
  }

  try {
    win.location.replace(paymentUrl);
  } catch {
    // Never strand an empty tab — close it and let the caller fall back.
    try {
      win.close();
    } catch {
      /* already gone */
    }
    return false;
  }

  return true;
};

export type CheckoutUpgradeStatus = "pending" | "completed" | "failed";

/**
 * Normalize the status of GET /billing/upgrade/blockradar/{reference}. The
 * exact field name varies with response nesting, so scan the usual spots.
 */
export const normalizeUpgradeStatus = (
  payload: unknown
): CheckoutUpgradeStatus => {
  const candidates: unknown[] = [];
  const collect = (value: unknown) => {
    if (!isJsonObject(value)) return;
    candidates.push(value.status, value.state, value.paymentStatus);
    if (isJsonObject(value.data)) collect(value.data);
    if (isJsonObject(value.upgrade)) collect(value.upgrade);
  };
  collect(payload);

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim().toLowerCase();
    if (
      ["completed", "success", "succeeded", "paid", "confirmed"].includes(value)
    ) {
      return "completed";
    }
    if (
      [
        "failed",
        "expired",
        "cancelled",
        "canceled",
        "amount_mismatch",
      ].includes(value)
    ) {
      return "failed";
    }
  }
  return "pending";
};

export interface StartPlanCheckoutResult {
  paymentUrl: string;
  reference: string;
  amount?: string;
  mode?: string;
}

/**
 * Start a plan checkout for a display plan name ("Growth", "Pro", …) — crypto
 * (Blockradar, default) or card (Stripe-hosted). Persists the pending
 * reference locally and returns the hosted payment URL to redirect to.
 * Every plan is payable; null only for an empty plan name.
 */
export async function startPlanCheckout(
  planName: string,
  organizationId?: string,
  options?: { paymentMethod?: "crypto" | "card" }
): Promise<StartPlanCheckoutResult | null> {
  const slug = planCheckoutSlug(planName);
  if (!slug) return null;

  const orgId = organizationId ?? getSelectedOrganizationId() ?? undefined;
  if (!orgId) throw new Error("No active organization selected.");

  let res;
  try {
    res = await billingService.checkoutPlan({
      plan: slug,
      organizationId: orgId,
      billingCycle: "monthly",
      ...(options?.paymentMethod === "card"
        ? { paymentMethod: "card" as const }
        : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't start checkout.";
    if (message.includes("FIAT_CHECKOUT_UNAVAILABLE")) {
      throw new Error(
        "Card payments aren't available yet — switch to crypto checkout.",
        { cause: error }
      );
    }
    // "Failed to create payment link" here means the backend couldn't mint
    // the payment link — usually missing operator setup (API key, master
    // wallet, webhook) in this environment, not a user problem.
    throw new Error(
      `${message} If this keeps happening, checkout isn't configured for this environment yet — contact support or try again later.`,
      { cause: error }
    );
  }

  const paymentUrl =
    typeof res.paymentUrl === "string" && res.paymentUrl.length > 0
      ? res.paymentUrl
      : "";
  const reference =
    typeof res.reference === "string" && res.reference.length > 0
      ? res.reference
      : "";

  if (!paymentUrl || !reference) {
    throw new Error(
      "Checkout did not return a payment link. Please try again."
    );
  }

  const amount =
    typeof res.amount === "number"
      ? String(res.amount)
      : typeof res.amount === "string" && res.amount.trim().length > 0
        ? res.amount
        : undefined;

  writePendingCheckout({
    reference,
    plan: planName,
    startedAt: Date.now(),
    amount,
  });
  return {
    paymentUrl,
    reference,
    amount,
    mode: typeof res.mode === "string" ? res.mode : undefined,
  };
}
