"use client";

import { motion } from "framer-motion";

import { fadeInUp } from "../../utils";
import { BillingInvoicesCard } from "./billing-invoices-card";
import { CardOnFileCard } from "./card-on-file-card";
import { CheckoutReturnToast } from "./checkout-return-toast";
import PlanUsage from "./plan-usage";
import { RenewalNoticeCard } from "./renewal-notice-card";

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
      <CheckoutReturnToast />
      {/* Only for a workspace still renewing through our own invoices. */}
      <RenewalNoticeCard />
      <PlanUsage />

      {/* Card on file drives auto-charge on renewal; invoices can also be paid
          by hosted card (payUrl) or crypto (wallet). */}
      <CardOnFileCard />

      <BillingInvoicesCard />
    </motion.div>
  );
}
