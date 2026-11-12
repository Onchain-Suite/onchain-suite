/**
 * What the billing page lists about money that has moved: the invoices and the
 * card. Mirrors `GET /billing/invoices` and `GET /billing/card`.
 *
 * Types only. Safe to import from anywhere.
 */

export type InvoiceStatus = "paid" | "open" | "void" | "uncollectible" | string;

/**
 * Customer-facing invoice row from `GET /billing/invoices?organizationId=`
 * (OWNER, membership-checked). Admin-only fields (reminders, charge errors,
 * Stripe ids) are never exposed here.
 *
 * Two kinds of row come back in one list (2026-11-12):
 *
 *  - Our own receipts and amounts due. `id` is a row id of ours, and a paid one
 *    has a receipt we mint a download link for (`canDownload`).
 *  - A card subscription's invoices, which Stripe issues and holds. `id` starts
 *    `stripe:`, `canDownload` is false (we hold no file), and the row carries
 *    Stripe's own page and PDF instead.
 */
export interface CustomerInvoice {
  /** Our row id, or `stripe:<invoice id>` for an invoice Stripe holds. */
  id: string;
  number: string;
  description: string;
  amountUsd: number;
  status: InvoiceStatus;
  dueAt?: string | null;
  paidAt?: string | null;
  /** Hosted page to pay on. Only set while the invoice is unpaid. */
  payUrl?: string | null;
  /** True when a receipt PDF of ours can be downloaded. False on Stripe rows. */
  canDownload?: boolean;
  /** Stripe's hosted page for the invoice. Stripe rows only. */
  viewUrl?: string | null;
  /** Stripe's PDF of the invoice. Stripe rows only. */
  pdfUrl?: string | null;
}

/**
 * The org's card from `GET /billing/card?organizationId=`.
 *
 * `source` says whose card it is to charge (2026-11-12). Absent means a card
 * saved with us, which our own renewal and usage charges may use.
 * `"subscription"` means the card on the org's Stripe subscription: Stripe
 * charges it for the subscription, we never do, and it is changed in the
 * Stripe billing portal, not by saving another card here.
 */
export interface CardOnFile {
  hasCard: boolean;
  brand?: string | null;
  last4?: string | null;
  /** When it was saved with us. Null for a subscription's card. */
  since?: string | null;
  source?: "subscription" | string;
}
