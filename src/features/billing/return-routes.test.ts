import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The pages a payment provider sends the browser back to. The backend builds
 * these URLs (onchain-backend, `billing/checkout-return/return-urls.ts`) and
 * nothing ties them to the routes this app has: `/billing?canceled=...` was
 * issued for months with no `/billing` page behind it, and backing out of
 * Stripe Checkout was a 404.
 *
 * Renaming or removing one of these routes breaks a live checkout, so the list
 * is held here. Change it only together with the backend.
 */
const RETURN_ROUTES = [
  // Paid, or pending: the payment status page.
  { path: "/billing/success", page: "src/app/billing/success/page.tsx" },
  // Sessions issued before the cancel URL was fixed still point here.
  { path: "/billing", page: "src/app/billing/page.tsx" },
  // Cancelled, or a plan changed on the spot: the billing tab.
  { path: "/settings", page: "src/app/(dashboard)/settings/page.tsx" },
];

describe("checkout return routes", () => {
  it.each(RETURN_ROUTES)("$path has a page behind it", ({ page }) => {
    expect(existsSync(join(process.cwd(), page))).toBe(true);
  });
});
