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
      {/* Payment methods are intentionally not shown — payments run through
          the Blockradar crypto checkout, so there is nothing to save here. */}
      <PlanUsage />

      <InvoiceHistory />
    </motion.div>
  );
}
