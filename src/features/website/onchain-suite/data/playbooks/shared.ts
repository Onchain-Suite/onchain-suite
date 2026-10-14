/* Pieces every playbook carries: the house rules line, the platform section
   with its disclosure, and the measurement note. Sources checked 14 October
   2026; see the evidence notes in each playbook file. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { ChapterSection } from "@/onchain-suite-website/types/retention-playbook";

export const RULES_LINE =
  "Three rules apply to every message: nothing goes to the whole list, each message carries one link, and nobody gets a promotional message they did not agree to.";

/** Opens are not results: Apple Mail had 62.26% of opens in July 2026 (Litmus). */
export const MEASURE_NOTE =
  "Opens are not counted as results, because Apple Mail opens emails by itself. Every always-on Loop keeps a holdout, a small group left out on purpose, so we can show what the messages caused. Targets are set once the first month gives us a baseline.";

export function platformSection(uses: string): ChapterSection {
  return {
    id: "platform",
    title: "Sending platform: OnchainSuite",
    blocks: [
      {
        kind: "p",
        text: "OnchainSuite can do what EmailOctopus and beehiiv do. They cannot do what OnchainSuite does, which is ==act on wallet and product events==.",
      },
      { kind: "p", text: uses },
      {
        kind: "p",
        text: "We can run this on a mainstream tool, but we would have to cut the plan down to broadcasts and simple automations, and drop the lifecycle stages and retention triggers that depend on what wallets do.",
      },
      { kind: "p", text: DISCLOSURE },
    ],
  };
}

/** Questions every protocol answers before the first send. */
export const BASE_QUESTIONS: string[][] = [
  [
    "Where do your email addresses come from, and what did people agree to receive?",
    "Decides who gets campaigns straight away, and who is asked first",
  ],
  [
    "Which domain do emails send from, and who manages its DNS?",
    "SPF, DKIM and DMARC on that domain decide inbox or spam",
  ],
  [
    "Who approves each message, and whose voice does it go out in?",
    "Nothing waits for sign-off",
  ],
];
