import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Billing - Onchain Suite",
  robots: { index: false },
};

/**
 * `/billing` is where the payment providers send someone who backs out of
 * checkout (`/billing?canceled=<ref>`), and where older links point. Billing
 * itself lives in Settings, so there was no page here and leaving Stripe
 * Checkout with the back arrow landed on a 404.
 *
 * It redirects instead of rendering so there is one billing screen, and so
 * links already issued (a checkout session keeps its cancel URL for 24 hours)
 * keep working without a backend deploy.
 */
export default function BillingPage() {
  redirect("/settings?tab=billing");
}
