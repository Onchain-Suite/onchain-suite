import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import {
  BillingError,
  billingService,
  DEFAULT_PAYMENT_METHOD,
  type PaymentCheckoutMethod,
  type PlanCheckoutSlug,
} from "./billing.service";

/**
 * Stripe card checkout flow:
 *   POST /billing/checkout/plan { paymentMethod: "card" } →
 *   { mode: "stripe_checkout", paymentUrl, reference } → user pays on the
 *   Stripe-hosted Checkout page → the `checkout.session.*` webhook upgrades
 *   the org plan → getCheckoutStatus(reference) reports the outcome.
 *
 * The pending reference is persisted locally so that when the user comes
 * back to the app after paying, we can poll the reference and confirm the
 * upgrade (see PendingCheckoutBanner).
 *
 * Crypto (Blockradar) remains available on the same endpoint via
 * `paymentMethod: "crypto"`; it issues a deposit address / static payment link
 * instead, and settles the same `reference` from its deposit webhook. Every
 * function here is provider-neutral.
 */

const PENDING_CHECKOUT_KEY = "onchain.billing.pendingCheckout.v1";

export interface PendingCheckout {
  reference: string;
  plan: string;
  startedAt: number;
  /** Human-readable checkout amount (e.g. "49" / "49 USDC"), when known. */
  amount?: string;
  /** "crypto" (Blockradar) or "card" (Stripe-hosted checkout). */
  paymentMethod?: "crypto" | "card";
  /** Backend checkout mode hint, e.g. "static_link" (Blockradar) or "stripe_checkout". */
  mode?: string;
}

/** Fired whenever the pending checkout changes, so live UI (the pending
 * checkout banner) can pick it up without a remount. */
export const PENDING_CHECKOUT_EVENT = "onchain:billing-checkout";

/**
 * Card payments confirm in seconds (crypto deposits take a couple of minutes),
 * so this window is generous for both. Past it we stop polling and surface a
 * "taking longer than expected" state instead of spinning forever: an
 * abandoned checkout must not leave the banner hitting the status endpoint
 * every few seconds for the life of the session.
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
      paymentMethod:
        parsed.paymentMethod === "crypto" || parsed.paymentMethod === "card"
          ? parsed.paymentMethod
          : undefined,
      mode: typeof parsed.mode === "string" ? parsed.mode : undefined,
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
 * Normalize the status reported by `billingService.getCheckoutStatus`. The
 * exact field name varies with response nesting, so scan the usual spots.
 *
 * The vocabulary is shared by both providers because both settle the same
 * pendingUpgrade record: `success`/`paid` → completed;
 * `failed`/`expired`/`cancelled`/`amount_mismatch` → failed; `pending` and
 * `processing` stay pending.
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
 * Start a plan checkout for a display plan name ("Growth", "Pro", …). Defaults
 * to card (Stripe-hosted Checkout); pass `paymentMethod: "crypto"` for the
 * Blockradar path. Persists the pending reference locally and returns the
 * hosted payment URL to redirect to. Every plan is payable; null only for an
 * empty plan name.
 */
export async function startPlanCheckout(
  planName: string,
  organizationId?: string,
  options?: { paymentMethod?: PaymentCheckoutMethod }
): Promise<StartPlanCheckoutResult | null> {
  const slug = planCheckoutSlug(planName);
  if (!slug) return null;

  const orgId = organizationId ?? getSelectedOrganizationId() ?? undefined;
  if (!orgId) throw new Error("No active organization selected.");

  const paymentMethod = options?.paymentMethod ?? DEFAULT_PAYMENT_METHOD;

  let res;
  try {
    res = await billingService.checkoutPlan({
      plan: slug,
      organizationId: orgId,
      billingCycle: "monthly",
      paymentMethod,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't start checkout.";
    // Branch on the backend's error CODE, not its prose: the message is
    // human-facing copy that gets reworded, and the code is what actually
    // identifies "this environment has no Stripe secret key".
    if (
      error instanceof BillingError &&
      error.code === "FIAT_CHECKOUT_UNAVAILABLE"
    ) {
      throw new BillingError(
        "Card payments aren't set up for this environment yet. Contact support, or pay with crypto instead.",
        error.code,
        { cause: error }
      );
    }
    // Anything else here means the provider couldn't mint a checkout session —
    // usually missing operator setup (Stripe key / webhook secret, or on the
    // crypto path the Blockradar API key + master wallet), not a user problem.
    throw new BillingError(
      `${message} If this keeps happening, checkout isn't configured for this environment yet — contact support or try again later.`,
      error instanceof BillingError ? error.code : undefined,
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

  const mode = typeof res.mode === "string" ? res.mode : undefined;
  const paymentMethod =
    options?.paymentMethod ??
    (mode?.toLowerCase().includes("stripe") === true ? "card" : "crypto");

  writePendingCheckout({
    reference,
    plan: planName,
    startedAt: Date.now(),
    amount,
    paymentMethod,
    mode,
  });
  return {
    paymentUrl,
    reference,
    amount,
    mode,
  };
}
