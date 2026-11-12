/**
 * What the last cell of an invoice row offers.
 *
 * The list holds two kinds of row. Ours: an unpaid one is paid on a hosted
 * page, a paid one has a receipt we mint a download link for. Stripe's (a card
 * subscription's first payment, renewals and plan changes): we hold no file, so
 * the row links to Stripe's own page and PDF.
 */

export type InvoiceRowAction =
  | { kind: "pay"; href: string }
  | { kind: "stripe"; viewUrl: string | null; pdfUrl: string | null }
  | { kind: "receipt" }
  | { kind: "none" };

interface InvoiceLike {
  status?: string | null;
  payUrl?: string | null;
  canDownload?: boolean;
  viewUrl?: string | null;
  pdfUrl?: string | null;
}

/**
 * The link if it is an https one, else null. These go into `href`, and the
 * server already checks them; a link the page renders is checked where it is
 * rendered too.
 */
export function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("https://")) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export const isPaidInvoice = (invoice: { status?: string | null }) =>
  (invoice.status ?? "").toLowerCase() === "paid";

export function invoiceRowAction(invoice: InvoiceLike): InvoiceRowAction {
  const paid = isPaidInvoice(invoice);

  const payUrl = httpsUrl(invoice.payUrl);
  if (!paid && payUrl) return { kind: "pay", href: payUrl };

  const viewUrl = httpsUrl(invoice.viewUrl);
  const pdfUrl = httpsUrl(invoice.pdfUrl);
  if (viewUrl || pdfUrl) return { kind: "stripe", viewUrl, pdfUrl };

  if (paid && invoice.canDownload !== false) return { kind: "receipt" };
  return { kind: "none" };
}
