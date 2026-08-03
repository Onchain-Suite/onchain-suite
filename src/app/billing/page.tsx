import type { Metadata } from "next";
import { Suspense } from "react";

import { AnimatedLoading } from "@/components/loading";

import { CheckoutCanceled } from "@/features/billing/components/checkout-canceled";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout cancelled — Onchain Suite",
  description:
    "Your Onchain Suite checkout was cancelled. No payment was taken and your plan is unchanged.",
  robots: { index: false },
};

/**
 * Stripe `cancel_url` target (/billing?canceled=…). This route has to exist:
 * the backend hands Stripe `${APP_URL}/billing?canceled={reference}` when it
 * creates the Checkout Session, so without it every abandoned card checkout
 * lands the buyer on a 404.
 */
export default function BillingCanceledPage() {
  return (
    <Suspense fallback={<AnimatedLoading />}>
      <CheckoutCanceled />
    </Suspense>
  );
}
