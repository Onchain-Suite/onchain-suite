import { describe, expect, it } from "vitest";

import { httpsUrl, invoiceRowAction } from "./invoice-row-action";

const VIEW = "https://invoice.stripe.com/i/acct_1/live_abc";
const PDF = "https://pay.stripe.com/invoice/acct_1/live_abc/pdf";
// Built, not written out: a script URL in source is what the linter forbids.
const SCRIPT_URL = ["javascript", "alert(1)"].join(":");

describe("invoiceRowAction", () => {
  // A subscriber's invoices are Stripe's. Listed without these links, a paid
  // one would have shown nothing to open.
  it("links a paid Stripe invoice to Stripe's page and PDF", () => {
    expect(
      invoiceRowAction({
        status: "paid",
        canDownload: false,
        viewUrl: VIEW,
        pdfUrl: PDF,
      })
    ).toEqual({ kind: "stripe", viewUrl: VIEW, pdfUrl: PDF });
  });

  it("offers whichever of the two links exists", () => {
    expect(
      invoiceRowAction({ status: "void", canDownload: false, viewUrl: VIEW })
    ).toEqual({ kind: "stripe", viewUrl: VIEW, pdfUrl: null });
  });

  it("offers an unpaid invoice its Pay page first", () => {
    expect(
      invoiceRowAction({
        status: "open",
        payUrl: VIEW,
        canDownload: false,
        viewUrl: VIEW,
        pdfUrl: PDF,
      })
    ).toEqual({ kind: "pay", href: VIEW });
  });

  it("never offers Pay on a paid invoice", () => {
    expect(invoiceRowAction({ status: "Paid", payUrl: VIEW })).toEqual({
      kind: "receipt",
    });
  });

  it("offers our own receipt on a paid invoice of ours", () => {
    expect(invoiceRowAction({ status: "paid", canDownload: true })).toEqual({
      kind: "receipt",
    });
    // Older rows do not say; every paid invoice of ours has a receipt.
    expect(invoiceRowAction({ status: "paid" })).toEqual({ kind: "receipt" });
  });

  // Asking us for a receipt of an invoice Stripe holds is a 404.
  it("offers no receipt where we hold no file", () => {
    expect(invoiceRowAction({ status: "paid", canDownload: false })).toEqual({
      kind: "none",
    });
  });

  it("offers nothing on an unpaid invoice with nowhere to pay it", () => {
    expect(invoiceRowAction({ status: "open" })).toEqual({ kind: "none" });
    expect(invoiceRowAction({})).toEqual({ kind: "none" });
  });

  it("renders no link that is not https", () => {
    expect(
      invoiceRowAction({
        status: "open",
        payUrl: SCRIPT_URL,
        viewUrl: "http://invoice.stripe.com/i/a",
        pdfUrl: "data:text/html,x",
      })
    ).toEqual({ kind: "none" });
  });
});

describe("httpsUrl", () => {
  it("passes an https link through untouched", () => {
    expect(httpsUrl(VIEW)).toBe(VIEW);
  });

  it("is null for anything else", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "invoice.stripe.com/i/a",
      "//invoice.stripe.com/i/a",
      "http://a.test",
      SCRIPT_URL,
      " https://a.test",
      7,
      {},
    ]) {
      expect(httpsUrl(bad), String(bad)).toBeNull();
    }
  });
});
