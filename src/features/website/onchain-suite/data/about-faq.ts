import {
  CHAINS,
  CHANNELS,
  PLANS,
  TOP_TIER,
} from "@/onchain-suite-website/data/brand-facts";

/**
 * The questions /about shows, and the FAQPage JSON-LD built from them. Each one
 * is a brand question people ask AI tools, answered in the first sentence.
 */
export const ABOUT_FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "How much does OnchainSuite cost?",
    a: `The Suite plan starts at $39 a month and the Send plan at $6 a month. Suite: ${PLANS.suite.summary} Send: ${PLANS.send.summary} Above 75,000 contacts the plan is ${TOP_TIER} ${PLANS.freePlan}`,
  },
  {
    q: "Which channels does OnchainSuite send on?",
    a: `${CHANNELS.live} ${CHANNELS.upcoming}`,
  },
  {
    q: "Which chains does OnchainSuite support?",
    a: CHAINS,
  },
];
