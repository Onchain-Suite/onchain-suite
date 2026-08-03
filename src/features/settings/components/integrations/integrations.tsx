"use client";

import { motion } from "framer-motion";

import { fadeInUp, staggerContainer } from "../../utils";
import InAppIntegration from "./inapp";

export default function IntegrationsSettings() {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.section
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={fadeInUp} className="space-y-6">
          <InAppIntegration />
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
