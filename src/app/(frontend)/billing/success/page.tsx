import type { Metadata } from "next";
import { Suspense } from "react";

import { AnimatedLoading } from "@/components/loading";

import { PaymentThankYou } from "@/features/billing/components/payment-thank-you";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment status — Onchain Suite",
  description:
    "Track your Onchain Suite plan payment. Your plan activates automatically once the transaction confirms.",
  robots: { index: false },
};

/**
 * Blockradar redirect target (/billing/success?ref=…&status=…). Polls the
 * upgrade reference until the deposit webhook confirms the payment.
 */
export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<AnimatedLoading />}>
      <PaymentThankYou />
    </Suspense>
  );
}
