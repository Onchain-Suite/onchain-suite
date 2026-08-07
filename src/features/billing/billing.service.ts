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
 * UI come from here — no hardcoded catalog when the backend answers.
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

export interface UpgradeFiatRequest {
  plan: BillingPlanName;
}

export interface UpgradeBlockradarRequest {
  desiredListSize: number;
  plan?: BillingPlanName;
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
 * Sellable lineup per docs/backend.md 2026-07-25: Launch $29 · Growth $199 ·
 * Pro $499 (PAYG is the signup default, not a checkout slug). `starter` and
 * `pro_plus` were retired — checkout now 404s on them.
 */
export type PlanCheckoutSlug = "launch" | "growth" | "pro";

export interface PlanCheckoutRequest {
  /** Known catalog slugs, or any backend-provided slug string. */
  plan: PlanCheckoutSlug | (string & {});
  organizationId: string;
  billingCycle?: "monthly" | "annual";
  /**
   * "crypto" (Blockradar, default) or "card" (Stripe-hosted checkout —
   * docs/backend.md 2026-07-28). Card returns `mode: "stripe_checkout"`;
   * 400 FIAT_CHECKOUT_UNAVAILABLE when Stripe isn't configured.
   */
  paymentMethod?: "crypto" | "card";
}

/**
 * Response of POST /billing/checkout/plan — Blockradar crypto checkout.
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

/** GET /billing/payg/wallet/{orgId} — prepaid usage wallet (micro-USD ledger). */
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
   * Per-meter plan usage (`GET /billing/plan-usage/:organizationId`) —
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
   * amount }). This is the primary payment path — fiat checkout is disabled
   * in production unless BILLING_FIAT_ENABLED is set server-side.
   */
  checkoutPlan(body: PlanCheckoutRequest, options?: BillingServiceOptions) {
    return billingRequest<PlanCheckoutResponse>(
      { method: "POST", url: "/billing/checkout/plan", data: body },
      options
    );
  },

  /**
   * Switch the org onto Pay-As-You-Go (`POST /billing/payg/start`) — flips
   * `organization.plan` to `payg` and grants the one-time $5 trial credit.
   */
  startPayg(organizationId: string, options?: BillingServiceOptions) {
    return billingRequest<Record<string, unknown>>(
      { method: "POST", url: "/billing/payg/start", data: { organizationId } },
      options
    );
  },

  /** `GET /billing/payg/wallet/{orgId}` — balance, unit rates, recent ledger. */
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
   * `POST /billing/checkout/credits` — Blockradar checkout that tops up the
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

  /** `POST /billing/upgrade/{reference}/cancel` — cancel a pending checkout. */
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
