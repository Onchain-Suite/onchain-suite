import type { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

import { apiClient } from "@/lib/api-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

export type BillingPeriod = "month" | "current";

export type BillingPlanName = "Growth" | "Pro" | "Enterprise";

export interface BillingOverview {
  plan?: BillingPlan;
  usage?: BillingUsageSummary;
  limits?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BillingUsageSummary {
  [key: string]: unknown;
}

export interface BillingUsage {
  period?: BillingPeriod;
  items?: Array<{
    key: string;
    used: number;
    limit?: number;
    unit?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface BillingPlan {
  name?: string;
  /** Catalog slug (e.g. "launch", "growth") when the backend provides one. */
  slug?: string;
  status?: string;
  description?: string;
  price?: string | number;
  interval?: "month" | "year" | string;
  features?: unknown;
  [key: string]: unknown;
}

export interface BillingPlansResponse {
  plans?: BillingPlan[];
  [key: string]: unknown;
}

export type PlanUsageMeterStatus = "ok" | "warn" | "exceeded" | string;

/** One usage meter from `GET /billing/plan-usage/:organizationId`. */
export interface PlanUsageMeter {
  used: number;
  limit: number;
  percent: number;
  status: PlanUsageMeterStatus;
}

/**
 * Known meter keys returned by `GET /billing/plan-usage/:organizationId`
 * (docs/backend.md 2026-07-03 pricing system + 2026-07-11 trackedWallets).
 */
export interface PlanUsageMeters {
  contacts?: PlanUsageMeter;
  emailsPerMonth?: PlanUsageMeter;
  aiCredits?: PlanUsageMeter;
  goldrushCredits?: PlanUsageMeter;
  seats?: PlanUsageMeter;
  automations?: PlanUsageMeter;
  apiKeys?: PlanUsageMeter;
  trackedWallets?: PlanUsageMeter;
}

/** Response of `GET /billing/plan-usage/:organizationId`. */
export interface PlanUsageResponse {
  plan?: string;
  meters?: PlanUsageMeters;
  [key: string]: unknown;
}

const pickPlanString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const pickPlanPrice = (...values: unknown[]): string | number | undefined => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
};

/** Known catalog limit keys → short human-readable feature lines. */
const describePlanLimits = (limits: unknown): string[] => {
  if (!isJsonObject(limits)) return [];
  const out: string[] = [];
  const add = (key: string, format: (n: number) => string) => {
    const raw = limits[key];
    if (typeof raw === "number" && Number.isFinite(raw)) out.push(format(raw));
    else if (raw === null) out.push(format(Number.POSITIVE_INFINITY));
  };
  const count = (n: number) =>
    Number.isFinite(n) ? n.toLocaleString() : "Unlimited";
  add("contacts", (n) => `${count(n)} contacts`);
  add("emailsPerMonth", (n) => `${count(n)} messages / month`);
  add("seats", (n) => `${count(n)} team seats`);
  add("automations", (n) => `${count(n)} automations`);
  add("aiCredits", (n) => `${count(n)} AI credits / month`);
  return out;
};

/**
 * Normalize GET /billing/plans into a predictable BillingPlan[] regardless of
 * response nesting (root array, {plans}, {items}, {data}) and field naming
 * (price/priceUsd/amount/monthlyPrice, interval/cycle). Prices shown in the
 * UI come from here - no hardcoded catalog when the backend answers.
 */
export const normalizeBillingPlans = (payload: unknown): BillingPlan[] => {
  const root =
    isJsonObject(payload) && !Array.isArray(payload)
      ? (payload.plans ?? payload.items ?? payload.data ?? payload)
      : payload;
  const list = Array.isArray(root) ? root : [];

  return list
    .map((raw): BillingPlan | null => {
      if (!isJsonObject(raw)) return null;
      const name = pickPlanString(raw.name, raw.title, raw.plan, raw.slug);
      if (!name) return null;
      const features = Array.isArray(raw.features)
        ? raw.features.filter((f): f is string => typeof f === "string")
        : describePlanLimits(raw.limits);
      return {
        ...raw,
        name,
        slug: pickPlanString(raw.slug, raw.id, raw.plan)?.toLowerCase(),
        description: pickPlanString(raw.description, raw.tagline),
        price: pickPlanPrice(
          raw.price,
          raw.priceUsd,
          raw.monthlyPrice,
          raw.priceMonthly,
          raw.amount
        ),
        interval:
          pickPlanString(raw.interval, raw.cycle, raw.billingCycle)?.replace(
            /ly$/,
            ""
          ) ?? "month",
        features,
      };
    })
    .filter((plan): plan is BillingPlan => plan !== null);
};

/**
 * Slider pricing (`GET /billing/contact-pricing?contacts=N` → `{ quote, anchors }`,
 * docs/backend.md 2026-08-27). Interpolates between the named tiers so the space
 * between anchors stops being a cliff: an org with 11,000 contacts gets Launch's
 * features at 11,000 contacts instead of being pushed onto Growth. Read-only and
 * cheap - safe to call on every drag. Entitlements come from the LOWER anchor.
 */
export interface ContactPricingQuote {
  contacts: number;
  monthlyPrice: number;
  annualPrice: number | null;
  /** Slug of the tier whose features apply (the lower anchor). */
  plan: string;
  planLabel: string;
  /** True when `contacts` lands exactly on a named tier. */
  isNamedTier: boolean;
  /** The next tier up, for "unlock X at N contacts" hints. */
  nextTier: ContactPricingAnchor | null;
  /** $ per extra contact in the current band. */
  marginalRate: number | null;
}

/** One tier stop for rendering the slider marks. */
export interface ContactPricingAnchor {
  plan: string;
  planLabel: string;
  contacts: number;
  monthlyPrice: number;
  annualPrice?: number | null;
}

export interface ContactPricing {
  quote: ContactPricingQuote;
  anchors: ContactPricingAnchor[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeAnchor = (raw: unknown): ContactPricingAnchor | null => {
  if (!isJsonObject(raw)) return null;
  const contacts = num(raw.contacts ?? raw.limit ?? raw.size);
  const monthlyPrice = num(raw.monthlyPrice ?? raw.price ?? raw.amount);
  if (contacts === null || monthlyPrice === null) return null;
  return {
    plan:
      pickPlanString(
        raw.plan,
        raw.slug,
        raw.id,
        raw.planLabel
      )?.toLowerCase() ?? "",
    planLabel:
      pickPlanString(raw.planLabel, raw.label, raw.name, raw.plan) ?? "",
    contacts,
    monthlyPrice,
    annualPrice: num(raw.annualPrice),
  };
};

/** Normalize the contact-pricing payload defensively (tolerates missing fields). */
export const normalizeContactPricing = (payload: unknown): ContactPricing => {
  const root = isJsonObject(payload)
    ? ((payload.data ?? payload) as Record<string, unknown>)
    : {};
  const q = isJsonObject(root.quote) ? root.quote : {};
  const anchors = Array.isArray(root.anchors)
    ? root.anchors
        .map(normalizeAnchor)
        .filter((a): a is ContactPricingAnchor => a !== null)
    : [];
  return {
    quote: {
      contacts: num(q.contacts) ?? 0,
      monthlyPrice: num(q.monthlyPrice ?? q.price) ?? 0,
      annualPrice: num(q.annualPrice),
      plan: pickPlanString(q.plan, q.slug, q.planLabel)?.toLowerCase() ?? "",
      planLabel: pickPlanString(q.planLabel, q.label, q.plan) ?? "",
      isNamedTier: q.isNamedTier === true,
      nextTier: normalizeAnchor(q.nextTier),
      marginalRate: num(q.marginalRate),
    },
    anchors,
  };
};

/**
 * The Suite contact curve (docs/pricing.md v4.2, SSOT), used ONLY as a fallback
 * when `GET /billing/contact-pricing` is not yet deployed on the connected
 * backend. Suite = ($16 + $13.30 x contacts/1,000) x tier multiplier
 * (Launch 0.79 / Growth 1.00 / Pro 1.60), so each tier at its reference contact
 * count reproduces its shelf price - Launch $39 @ 2,500, Growth $349 @ 25,000,
 * Pro $1,622 @ 75,000. Within a band the price scales at the tier's marginal
 * rate ($13.30/1,000 x multiplier) and entitlements come from the lower tier
 * (11,000 contacts stays on Launch). Guidance only: the real endpoint wins the
 * moment it exists, and the charged amount is always resolved at checkout.
 */
const FALLBACK_PRICING_ANCHORS: ContactPricingAnchor[] = [
  { plan: "launch", planLabel: "Launch", contacts: 2_500, monthlyPrice: 39 },
  { plan: "growth", planLabel: "Growth", contacts: 25_000, monthlyPrice: 349 },
  { plan: "pro", planLabel: "Pro", contacts: 75_000, monthlyPrice: 1_622 },
];
// Marginal $/contact per band = $13.30/1,000 x tier multiplier:
// Launch (0.79) -> 0.0105, Growth (1.00) -> 0.0133, Pro (1.60, continues above
// its reference) -> 0.0213.
const FALLBACK_BAND_RATES = [0.0105, 0.0133, 0.0213];

export const computeFallbackContactPricing = (
  contacts: number
): ContactPricing => {
  const anchors = FALLBACK_PRICING_ANCHORS;
  const n = Math.max(0, Math.round(Number.isFinite(contacts) ? contacts : 0));
  const isNamedTier = anchors.some((a) => a.contacts === n);
  // Below the entry tier, the entry price applies (you cannot buy less).
  if (n <= anchors[0].contacts) {
    return {
      quote: {
        contacts: n,
        monthlyPrice: anchors[0].monthlyPrice,
        annualPrice: null,
        plan: anchors[0].plan,
        planLabel: anchors[0].planLabel,
        isNamedTier: n === anchors[0].contacts,
        nextTier: anchors[1] ?? null,
        marginalRate: FALLBACK_BAND_RATES[0],
      },
      anchors,
    };
  }
  let lowerIdx = anchors.length - 1;
  for (let i = 0; i < anchors.length - 1; i += 1) {
    if (n < anchors[i + 1].contacts) {
      lowerIdx = i;
      break;
    }
  }
  const lower = anchors[lowerIdx];
  const rate =
    FALLBACK_BAND_RATES[Math.min(lowerIdx, FALLBACK_BAND_RATES.length - 1)];
  const monthly = Math.round(lower.monthlyPrice + (n - lower.contacts) * rate);
  return {
    quote: {
      contacts: n,
      monthlyPrice: monthly,
      annualPrice: null,
      // Entitlements come from the LOWER anchor: at 11,000 you get Launch.
      plan: lower.plan,
      planLabel: lower.planLabel,
      isNamedTier,
      nextTier: anchors[lowerIdx + 1] ?? null,
      marginalRate: rate,
    },
    anchors,
  };
};

/* ---------- v4.2 unified line quote (GET /billing/quote?plan=&units=) ----------
   One slider per line; the contact count DECIDES the Suite tier (bands), and the
   public quote matches the authenticated charge exactly, so shown == charged. */

const SEND_BASE_FEE = 6; // $/mo
const SEND_RATE_PER_1K = 3.95; // $ per 1,000 subscribers
export const SEND_MIN_SUBSCRIBERS = 1000;
/** SSOT contact stops for the Suite slider (Launch/Growth/Pro references). */
export const SUITE_TIER_ANCHORS = FALLBACK_PRICING_ANCHORS;

export interface LineQuote {
  line: "suite" | "send";
  /** Tier slug for Suite (launch/growth/pro), or "send". */
  plan: string;
  planLabel: string;
  /** "contacts" (Suite) or "subscribers" (Send). */
  unitLabel: string;
  units: number;
  /** Whole dollars, never cents. */
  monthlyPrice: number;
  annualPrice: number | null;
  /** Send: true when at/below the minimum subscribers. */
  atMinimum?: boolean;
  /** Suite: the contact band this size falls in. */
  band?: { from: number; to: number | null };
  /** The next tier up + the $ jump crossing into it (the price cliff). */
  nextTier?: {
    plan: string;
    label: string;
    units: number;
    monthlyPrice: number;
    stepUp: number;
  } | null;
}

const suiteFallbackLineQuote = (contacts: number): LineQuote => {
  const { quote } = computeFallbackContactPricing(contacts);
  const next = quote.nextTier;
  // Cliff = the jump crossing the boundary: price just under the boundary on the
  // current band vs the next tier's reference price (+$74 at 25k, +$609 at 75k).
  let stepUp = 0;
  if (next) {
    const belowBoundary = computeFallbackContactPricing(next.contacts - 1).quote
      .monthlyPrice;
    stepUp = Math.max(0, next.monthlyPrice - belowBoundary);
  }
  return {
    line: "suite",
    plan: quote.plan || "launch",
    planLabel: quote.planLabel || "Launch",
    unitLabel: "contacts",
    units: quote.contacts,
    monthlyPrice: quote.monthlyPrice,
    annualPrice: quote.annualPrice ?? quote.monthlyPrice * 12,
    nextTier: next
      ? {
          plan: next.plan,
          label: next.planLabel,
          units: next.contacts,
          monthlyPrice: next.monthlyPrice,
          stepUp,
        }
      : null,
  };
};

export const computeFallbackSendPricing = (subscribers: number): LineQuote => {
  const n = Math.max(
    SEND_MIN_SUBSCRIBERS,
    Math.round(Number.isFinite(subscribers) ? subscribers : 0)
  );
  const monthly = Math.round(SEND_BASE_FEE + SEND_RATE_PER_1K * (n / 1000));
  return {
    line: "send",
    plan: "send",
    planLabel: "Send",
    unitLabel: "subscribers",
    units: n,
    monthlyPrice: monthly,
    annualPrice: monthly * 12,
    atMinimum: subscribers <= SEND_MIN_SUBSCRIBERS,
    nextTier: null,
  };
};

const normalizeLineQuote = (
  payload: unknown,
  line: "suite" | "send",
  requested: number
): LineQuote => {
  const root = isJsonObject(payload)
    ? ((payload.data ?? payload) as Record<string, unknown>)
    : {};
  const monthly = num(root.monthlyPrice ?? root.price);
  if (monthly === null || monthly < 0) {
    return line === "send"
      ? computeFallbackSendPricing(requested)
      : suiteFallbackLineQuote(requested);
  }
  const nt = isJsonObject(root.nextTier) ? root.nextTier : null;
  const band = isJsonObject(root.band) ? root.band : undefined;
  return {
    line,
    plan:
      pickPlanString(root.plan, root.slug, root.planLabel)?.toLowerCase() ??
      (line === "send" ? "send" : "launch"),
    planLabel:
      pickPlanString(root.planLabel, root.label, root.plan) ??
      (line === "send" ? "Send" : "Launch"),
    unitLabel:
      typeof root.unitLabel === "string"
        ? root.unitLabel
        : line === "send"
          ? "subscribers"
          : "contacts",
    units: num(root.units ?? root.contacts ?? root.subscribers) ?? requested,
    monthlyPrice: monthly,
    annualPrice: num(root.annualPrice) ?? monthly * 12,
    atMinimum: root.atMinimum === true,
    band: band ? { from: num(band.from) ?? 0, to: num(band.to) } : undefined,
    nextTier: nt
      ? {
          plan: pickPlanString(nt.plan, nt.slug, nt.label)?.toLowerCase() ?? "",
          label: pickPlanString(nt.label, nt.planLabel, nt.plan) ?? "",
          units: num(nt.contacts ?? nt.units ?? nt.subscribers) ?? 0,
          monthlyPrice: num(nt.monthlyPrice ?? nt.price) ?? 0,
          stepUp: num(nt.stepUp) ?? 0,
        }
      : null,
  };
};

export interface UpgradeFiatRequest {
  plan: BillingPlanName;
}

export interface UpgradeBlockradarRequest {
  desiredListSize: number;
  /** Catalog slug ("launch"…) or a billing_plans row id, per API_ENDPOINTS.md. */
  plan?: BillingPlanName | (string & {});
}

export interface BillingUpgradeResponse {
  success?: boolean;
  checkoutUrl?: string;
  reference?: string;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

/** Catalog slugs accepted by POST /billing/checkout/plan (docs/backend.md). */
/**
 * Sellable lineup per docs/pricing.md v4.2: Launch $39 · Growth $349 ·
 * Pro $1,622 (PAYG is the signup default, not a checkout slug). `starter`,
 * `scale` and `pro_plus` are not sellable tiers - checkout 404s on them.
 */
export type PlanCheckoutSlug = "launch" | "growth" | "pro";

export interface PlanCheckoutRequest {
  /** Known catalog slugs, or any backend-provided slug string. */
  plan: PlanCheckoutSlug | (string & {});
  organizationId: string;
  billingCycle?: "monthly" | "annual";
  /**
   * "crypto" (Blockradar, default) or "card" (Stripe-hosted checkout -
   * docs/backend.md 2026-07-28). Card returns `mode: "stripe_checkout"`;
   * 400 FIAT_CHECKOUT_UNAVAILABLE when Stripe isn't configured.
   */
  paymentMethod?: "crypto" | "card";
  /**
   * Pricing-slider contact capacity (API_ENDPOINTS.md). Priced by the SAME curve
   * as `GET /billing/contact-pricing`, so the charge equals the quote. Ignored at
   * or below the tier's own contact limit; omit for a plain tier purchase. This
   * field belongs on `checkout/plan` - NOT the legacy `/billing/upgrade*`
   * endpoints, which price on a different one-time curve and grant no org
   * capacity. On payment the backend writes `metadata.billing.contactCapacity`.
   */
  contacts?: number;
}

/**
 * Response of POST /billing/checkout/plan - Blockradar crypto checkout.
 * `mode: "static_link"` means paymentUrl is the hosted static payment link
 * (pre-filled amount); the webhook matches the echoed reference either way.
 */
export interface PlanCheckoutResponse {
  mode?: "static_link" | string;
  paymentUrl?: string;
  reference?: string;
  plan?: string;
  cycle?: string;
  amount?: number | string;
  [key: string]: unknown;
}

/** GET /billing/payg/wallet/{orgId} - prepaid usage wallet (micro-USD ledger). */
export interface PaygWallet {
  balanceUsd: number;
  rates?: Record<string, number | string>;
  ledger?: Array<{
    id?: string;
    amountUsd?: number;
    meter?: string;
    reason?: string;
    createdAt?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export type InvoiceStatus = "paid" | "open" | "void" | "uncollectible" | string;

export interface BillingInvoice {
  id: string;
  number?: string;
  status?: InvoiceStatus;
  amount?: number | string;
  currency?: string;
  issuedAt?: string;
  dueAt?: string;
  hostedInvoiceUrl?: string;
  pdfUrl?: string;
  [key: string]: unknown;
}

export interface InvoiceListResponse {
  items?: BillingInvoice[];
  data?: BillingInvoice[];
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export interface InvoiceDownloadResponse {
  url?: string;
  [key: string]: unknown;
}

/**
 * Customer-facing invoice row from `GET /billing/invoices?organizationId=`
 * (OWNER, membership-checked). `payUrl` is the Stripe hosted card page; crypto
 * invoices are paid from the wallet. Admin-only fields (reminders, charge
 * errors, Stripe ids) are never exposed here.
 */
export interface CustomerInvoice {
  number: string;
  description: string;
  amountUsd: number;
  status: InvoiceStatus;
  dueAt?: string | null;
  paidAt?: string | null;
  payUrl?: string | null;
}

/** The org's saved card from `GET /billing/card?organizationId=`. */
export interface CardOnFile {
  hasCard: boolean;
  brand?: string | null;
  last4?: string | null;
  since?: string | null;
}

/**
 * `POST /billing/card/setup-intent`. In the hosted flow the backend returns a
 * Stripe-hosted setup page `url` to redirect to; the embedded (Elements) flow
 * would instead return `clientSecret`. We normalise the many possible URL field
 * names in {@link billingService.startCardSetup}.
 */
export interface CardSetupResponse {
  url?: string;
  setupUrl?: string;
  paymentUrl?: string;
  hostedUrl?: string;
  redirectUrl?: string;
  clientSecret?: string;
  customerId?: string;
  [key: string]: unknown;
}

export type PaymentMethodType = "card" | "crypto";

export interface BillingPaymentMethod {
  id: string;
  type: PaymentMethodType;
  brand?: string;
  last4?: string;
  address?: unknown;
  isDefault?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface PaymentMethodsListResponse {
  items?: BillingPaymentMethod[];
  data?: BillingPaymentMethod[];
  [key: string]: unknown;
}

export interface AddPaymentMethodRequest {
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  address?: unknown;
  isDefault?: boolean;
}

export interface SetDefaultPaymentMethodRequest {
  id: string;
}

export interface BillingServiceOptions {
  orgId?: string;
}

const BILLING_TAG = "onchain:billing-api";

const pickOrgId = (options?: BillingServiceOptions): string | null => {
  return options?.orgId ?? getSelectedOrganizationId() ?? null;
};

const toFriendlyMessage = (error: unknown): string => {
  const e = error as AxiosError<unknown>;
  const status = e?.response?.status;
  const data = e?.response?.data;
  const nestedError =
    isJsonObject(data) && isJsonObject(data.error) ? data.error : undefined;
  const serverMessage = isJsonObject(nestedError)
    ? nestedError.message
    : isJsonObject(data)
      ? data.message
      : (e?.message ?? "");
  const nonEmptyServerMessage =
    serverMessage && String(serverMessage).trim().length > 0
      ? String(serverMessage)
      : undefined;
  const lowered = String(serverMessage).toLowerCase();

  if (!status)
    return "Network error. Please check your connection and try again.";
  if (status === 401)
    return "You’re not authenticated. Please sign in again and retry.";
  if (status === 403)
    return "You don’t have permission to perform this action.";
  if (status === 400 && lowered.includes("database error"))
    return "Billing is not available for this organization yet. Please try again later.";
  if (status === 404) return "Billing resource not found.";
  if (status === 409)
    return nonEmptyServerMessage ?? "Request conflict. Please retry.";
  if (status === 422)
    return (
      nonEmptyServerMessage ?? "Validation error. Please review your input."
    );
  if (status === 429)
    return "Too many requests. Please wait a moment and try again.";
  if (status >= 500)
    return "Billing service is temporarily unavailable. Please try again.";
  return nonEmptyServerMessage ?? "Unexpected billing error. Please try again.";
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class SimpleRateLimiter {
  private lastRunAt = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly minIntervalMs: number) {}

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      const now = Date.now();
      const waitFor = Math.max(0, this.minIntervalMs - (now - this.lastRunAt));
      if (waitFor > 0) await sleep(waitFor);
      this.lastRunAt = Date.now();
      return fn();
    };

    const next = this.chain.then(run, run) as Promise<T>;
    this.chain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }
}

const limiter = new SimpleRateLimiter(
  process.env.NODE_ENV === "test" ? 0 : 250
);

const logBillingEvent = (detail: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BILLING_TAG, { detail }));
  }
};

const shouldRetry = (error: unknown): boolean => {
  const e = error as AxiosError<unknown>;
  if (!e?.response) return true;
  const { status } = e.response;
  return status === 429 || status >= 500;
};

const requestWithRetry = async <T>(
  config: AxiosRequestConfig,
  opts?: { retries?: number; retryBaseDelayMs?: number }
): Promise<AxiosResponse<T>> => {
  const retries = opts?.retries ?? 2;
  const retryBaseDelayMs = opts?.retryBaseDelayMs ?? 400;

  let attempt = 0;
  for (;;) {
    try {
      return await apiClient.request<T>(config);
    } catch (err) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(err)) throw err;
      const delay = retryBaseDelayMs * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
};

const billingRequest = async <T>(
  config: AxiosRequestConfig,
  options?: BillingServiceOptions
): Promise<T> => {
  const orgId = pickOrgId(options);
  const headers = {
    ...(config.headers ?? {}),
    ...(orgId ? { "x-org-id": orgId } : {}),
    "x-onchain-silent-error": "1",
  };

  const safeMeta = {
    method: String(config.method ?? "GET").toUpperCase(),
    url: String(config.url ?? ""),
    orgIdPresent: !!orgId,
  };

  return limiter.schedule(async () => {
    const startedAt = Date.now();
    try {
      const res = await requestWithRetry<T>({ ...config, headers });
      logBillingEvent({
        ...safeMeta,
        ok: true,
        status: res.status,
        ms: Date.now() - startedAt,
      });
      const envelope = res.data as unknown;
      const data =
        isJsonObject(envelope) && "data" in envelope ? envelope.data : envelope;
      return data as T;
    } catch (error) {
      const e = error as AxiosError<unknown>;
      logBillingEvent({
        ...safeMeta,
        ok: false,
        status: e?.response?.status ?? null,
        ms: Date.now() - startedAt,
      });
      throw new Error(toFriendlyMessage(error), { cause: error });
    }
  });
};

export const billingService = {
  /**
   * Get overview of current plan, usage, and limits.
   *
   * @example
   * const overview = await billingService.getOverview()
   */
  getOverview(options?: BillingServiceOptions) {
    return billingRequest<BillingOverview>(
      { method: "GET", url: "/billing" },
      options
    );
  },

  /**
   * Get detailed usage statistics.
   *
   * @example
   * const usage = await billingService.getUsage({ period: "month" })
   */
  getUsage(
    params?: { period?: BillingPeriod },
    options?: BillingServiceOptions
  ) {
    return billingRequest<BillingUsage>(
      { method: "GET", url: "/billing/usage", params },
      options
    );
  },

  /**
   * Per-meter plan usage (`GET /billing/plan-usage/:organizationId`) -
   * `{ plan, meters: { contacts, emailsPerMonth, aiCredits, goldrushCredits,
   * seats, automations, apiKeys, trackedWallets } }`, each meter
   * `{ used, limit, percent, status }`. The `aiCredits` meter is the one that
   * gates the AI assistant / SQL generation / MCP agent (402
   * AI_CREDITS_EXCEEDED).
   */
  getPlanUsage(organizationId?: string, options?: BillingServiceOptions) {
    const orgId = organizationId ?? pickOrgId(options);
    if (!orgId) {
      return Promise.reject(
        new Error("No organization selected for plan usage.")
      );
    }
    return billingRequest<PlanUsageResponse>(
      { method: "GET", url: `/billing/plan-usage/${orgId}` },
      { ...options, orgId }
    );
  },

  /**
   * Get current plan and upgrade options.
   */
  getPlan(options?: BillingServiceOptions) {
    return billingRequest<BillingPlan>(
      { method: "GET", url: "/billing/plan" },
      options
    );
  },

  /**
   * List all available plans.
   */
  getPlans(options?: BillingServiceOptions) {
    return billingRequest<unknown>(
      { method: "GET", url: "/billing/plans" },
      options
    ).then((payload): BillingPlansResponse => ({
      plans: normalizeBillingPlans(payload),
    }));
  },

  /**
   * Slider pricing quote for a contact count
   * (`GET /billing/contact-pricing?contacts=N`). Read-only and cheap - meant to
   * be called on every slider drag. Returns the interpolated quote plus the tier
   * anchors for rendering slider marks. See {@link ContactPricing}.
   */
  getContactPricing(
    contacts: number,
    options?: BillingServiceOptions
  ): Promise<ContactPricing> {
    const safe = Math.max(
      0,
      Math.round(Number.isFinite(contacts) ? contacts : 0)
    );
    return (
      billingRequest<unknown>(
        {
          method: "GET",
          url: "/billing/contact-pricing",
          params: { contacts: safe },
        },
        options
      )
        .then((payload) => {
          const parsed = normalizeContactPricing(payload);
          // Endpoint answered but with nothing usable (older backend): use the curve.
          return parsed.anchors.length > 0 || parsed.quote.monthlyPrice > 0
            ? parsed
            : computeFallbackContactPricing(safe);
        })
        // The endpoint isn't on every backend yet (docs/backend.md 2026-08-27);
        // degrade to the documented curve rather than leaving the slider dead.
        .catch(() => computeFallbackContactPricing(safe))
    );
  },

  /**
   * v4.2 unified quote (`GET /billing/quote?plan=<suite|send>&units=<n>`). One
   * slider per line; the count decides the Suite tier. The public quote matches
   * this exactly, so the displayed price equals the charge. Falls back to the
   * SSOT curve when the endpoint is unavailable. See {@link LineQuote}.
   */
  getLineQuote(
    line: "suite" | "send",
    units: number,
    options?: BillingServiceOptions
  ): Promise<LineQuote> {
    const min = line === "send" ? SEND_MIN_SUBSCRIBERS : 0;
    const safe = Math.max(min, Math.round(Number.isFinite(units) ? units : 0));
    return billingRequest<unknown>(
      {
        method: "GET",
        url: "/billing/quote",
        params: { plan: line, units: safe },
      },
      options
    )
      .then((payload) => normalizeLineQuote(payload, line, safe))
      .catch(() =>
        line === "send"
          ? computeFallbackSendPricing(safe)
          : suiteFallbackLineQuote(safe)
      );
  },

  /**
   * Upgrade plan using fiat checkout.
   *
   * @example
   * const res = await billingService.upgradeFiat({ plan: "Pro" })
   */
  upgradeFiat(body: UpgradeFiatRequest, options?: BillingServiceOptions) {
    return billingRequest<BillingUpgradeResponse>(
      { method: "POST", url: "/billing/upgrade", data: body },
      options
    );
  },

  /**
   * Start a Blockradar crypto checkout for an org plan
   * (POST /billing/checkout/plan → { paymentUrl, reference, plan, cycle,
   * amount }). This is the primary payment path - fiat checkout is disabled
   * in production unless BILLING_FIAT_ENABLED is set server-side.
   */
  checkoutPlan(body: PlanCheckoutRequest, options?: BillingServiceOptions) {
    return billingRequest<PlanCheckoutResponse>(
      { method: "POST", url: "/billing/checkout/plan", data: body },
      options
    );
  },

  /**
   * Switch the org onto Pay-As-You-Go (`POST /billing/payg/start`) - flips
   * `organization.plan` to `payg` and grants the one-time $5 trial credit.
   */
  startPayg(organizationId: string, options?: BillingServiceOptions) {
    return billingRequest<Record<string, unknown>>(
      { method: "POST", url: "/billing/payg/start", data: { organizationId } },
      options
    );
  },

  /** `GET /billing/payg/wallet/{orgId}` - balance, unit rates, recent ledger. */
  async getPaygWallet(
    organizationId: string,
    options?: BillingServiceOptions
  ): Promise<PaygWallet> {
    const payload = await billingRequest<Record<string, unknown>>(
      { method: "GET", url: `/billing/payg/wallet/${organizationId}` },
      options
    );
    const balance = Number(payload.balanceUsd);
    return {
      ...payload,
      balanceUsd: Number.isFinite(balance) ? balance : 0,
      ledger: Array.isArray(payload.ledger)
        ? (payload.ledger as PaygWallet["ledger"])
        : [],
    };
  },

  /**
   * `POST /billing/checkout/credits` - Blockradar checkout that tops up the
   * PAYG wallet on webhook confirmation ($10–$1000).
   */
  checkoutCredits(
    body: { organizationId: string; amountUsd: number },
    options?: BillingServiceOptions
  ) {
    return billingRequest<PlanCheckoutResponse>(
      { method: "POST", url: "/billing/checkout/credits", data: body },
      options
    );
  },

  /**
   * Upgrade plan using Blockradar (crypto checkout).
   */
  upgradeBlockradar(
    body: UpgradeBlockradarRequest,
    options?: BillingServiceOptions
  ) {
    return billingRequest<BillingUpgradeResponse>(
      { method: "POST", url: "/billing/upgrade/blockradar", data: body },
      options
    );
  },

  /**
   * Check status of a specific Blockradar upgrade reference.
   */
  getBlockradarUpgradeStatus(
    reference: string,
    options?: BillingServiceOptions
  ) {
    return billingRequest<BillingUpgradeResponse>(
      { method: "GET", url: `/billing/upgrade/blockradar/${reference}` },
      options
    );
  },

  /** `POST /billing/upgrade/{reference}/cancel` - cancel a pending checkout. */
  cancelUpgrade(reference: string, options?: BillingServiceOptions) {
    return billingRequest<BillingUpgradeResponse>(
      { method: "POST", url: `/billing/upgrade/${reference}/cancel` },
      options
    );
  },

  /**
   * List invoices.
   */
  listInvoices(
    params?: { page?: number; limit?: number; status?: InvoiceStatus },
    options?: BillingServiceOptions
  ) {
    return billingRequest<InvoiceListResponse>(
      { method: "GET", url: "/billing/invoices", params },
      options
    );
  },

  /**
   * Get single invoice details.
   */
  getInvoice(invoiceId: string, options?: BillingServiceOptions) {
    return billingRequest<BillingInvoice>(
      { method: "GET", url: `/billing/invoices/${invoiceId}` },
      options
    );
  },

  /**
   * Get signed download URL for a PDF invoice.
   */
  getInvoiceDownloadUrl(invoiceId: string, options?: BillingServiceOptions) {
    return billingRequest<InvoiceDownloadResponse>(
      { method: "GET", url: `/billing/invoices/${invoiceId}/download` },
      options
    );
  },

  /**
   * Customer-facing invoice list (`GET /billing/invoices`) - OWNER,
   * membership-checked. Returns {@link CustomerInvoice} rows with a hosted
   * `payUrl`. Tolerates an array or an `{ items }` / `{ data }` envelope.
   */
  getBillingInvoices(organizationId?: string, options?: BillingServiceOptions) {
    const orgId = organizationId ?? pickOrgId(options);
    return billingRequest<
      | CustomerInvoice[]
      | { items?: CustomerInvoice[]; data?: CustomerInvoice[] }
    >(
      {
        method: "GET",
        url: "/billing/invoices",
        params: orgId ? { organizationId: orgId } : undefined,
      },
      { orgId: orgId ?? undefined }
    );
  },

  /**
   * The org's card on file (`GET /billing/card`) for the "Visa ****4242 / Add
   * card" UI.
   */
  async getCardOnFile(
    organizationId?: string,
    options?: BillingServiceOptions
  ): Promise<CardOnFile> {
    const orgId = organizationId ?? pickOrgId(options);
    try {
      return await billingRequest<CardOnFile>(
        {
          method: "GET",
          url: "/billing/card",
          params: orgId ? { organizationId: orgId } : undefined,
        },
        { orgId: orgId ?? undefined }
      );
    } catch (error) {
      // A brand-new org has no Stripe customer yet, so the card lookup can 404
      // (or 400 "billing not available") before any card exists. That is "no
      // card on file", not a failure - resolve to an empty CardOnFile so the UI
      // shows the Add-card state instead of a red-herring error.
      const status = (error as { cause?: AxiosError }).cause?.response?.status;
      if (status === 404 || status === 400) {
        return { hasCard: false };
      }
      throw error;
    }
  },

  /**
   * Start the hosted card-save flow (`POST /billing/card/setup-intent`) and
   * return the Stripe-hosted setup page URL to redirect the user to. Once they
   * save a card there, Stripe's `setup_intent.succeeded` webhook stores the
   * org's `CardOnFile`, which is what lets auto-charge-on-expiry fire.
   */
  async startCardSetup(
    args?: { successUrl?: string; cancelUrl?: string; organizationId?: string },
    options?: BillingServiceOptions
  ): Promise<{ url: string | null; clientSecret: string | null }> {
    const orgId = args?.organizationId ?? pickOrgId(options);
    // successUrl/cancelUrl override Stripe's default redirect so the user lands
    // back on our billing tab (?tab=billing) rather than /settings/billing.
    const data: Record<string, unknown> = {};
    if (orgId) data.organizationId = orgId;
    if (args?.successUrl) data.successUrl = args.successUrl;
    if (args?.cancelUrl) data.cancelUrl = args.cancelUrl;
    const res = await billingRequest<CardSetupResponse>(
      { method: "POST", url: "/billing/card/setup-intent", data },
      { orgId: orgId ?? undefined }
    );
    const url =
      res.url ??
      res.setupUrl ??
      res.paymentUrl ??
      res.hostedUrl ??
      res.redirectUrl ??
      null;
    return {
      url: typeof url === "string" && url.length > 0 ? url : null,
      clientSecret:
        typeof res.clientSecret === "string" && res.clientSecret.length > 0
          ? res.clientSecret
          : null,
    };
  },

  /**
   * List payment methods.
   */
  listPaymentMethods(options?: BillingServiceOptions) {
    return billingRequest<PaymentMethodsListResponse>(
      { method: "GET", url: "/billing/payment-methods" },
      options
    );
  },

  /**
   * Add a payment method.
   */
  addPaymentMethod(
    body: AddPaymentMethodRequest,
    options?: BillingServiceOptions
  ) {
    return billingRequest<BillingPaymentMethod>(
      { method: "POST", url: "/billing/payment-methods", data: body },
      options
    );
  },

  /**
   * Remove a payment method by id.
   */
  removePaymentMethod(id: string, options?: BillingServiceOptions) {
    return billingRequest<{ success?: boolean }>(
      { method: "DELETE", url: `/billing/payment-methods/${id}` },
      options
    );
  },

  /**
   * Set default payment method.
   */
  setDefaultPaymentMethod(
    body: SetDefaultPaymentMethodRequest,
    options?: BillingServiceOptions
  ) {
    return billingRequest<{ success?: boolean }>(
      { method: "PUT", url: "/billing/payment-methods/default", data: body },
      options
    );
  },
};
