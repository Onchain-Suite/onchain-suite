import type { Metadata } from "next";
import { Suspense } from "react";

import { AnimatedLoading } from "@/components/loading";

import { PaymentThankYou } from "@/features/billing/components/payment-thank-you";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment received — Onchain Suite",
  description:
    "Thanks for your payment. Your Onchain Suite plan activates automatically once the transaction confirms.",
  robots: { index: false },
};

export default function PaymentThankYouPage() {
  return (
    <Suspense fallback={<AnimatedLoading />}>
      <PaymentThankYou />
    </Suspense>
  );
}
