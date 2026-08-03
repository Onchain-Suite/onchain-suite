"use client";

import { motion } from "framer-motion";

import { fadeInUp } from "../../utils";
import InvoiceHistory from "./invoice-history";
import PlanUsage from "./plan-usage";

export default function BillingSettings() {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Payment methods are intentionally not shown. Card payments go through
          Stripe Checkout in one-time `mode: "payment"` sessions, so no card is
          ever vaulted against the org — there is nothing saved to manage here.
          A saved-cards panel would need a Stripe Customer + SetupIntent on the
          backend first. */}
      <PlanUsage />

      <InvoiceHistory />
    </motion.div>
  );
}
