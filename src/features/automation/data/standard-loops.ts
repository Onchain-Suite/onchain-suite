import { protocolTemplates } from "./protocol-templates";

/*
 * How each standard Loop reads on the New Loop page: one line that says who
 * comes in and what they get, in order. Written from the template's own steps
 * (see protocol-templates.ts), so a card never promises a step the Loop does
 * not have. The test checks every template has a line.
 */

export const STANDARD_LOOP_SUMMARY: Record<string, string> = {
  "welcome-series":
    "Someone joins a list: a welcome now, getting started two days later, tips three days after that.",
  "new-holder-onboarding":
    "A wallet buys in: welcome them now, show them what to do first two days later.",
  "lead-nurture":
    "Someone fills in a form: thank them now, a closer look three days later.",
  "after-a-purchase":
    "A purchase lands on-chain: thank them within the hour, what to do next three days later.",
  "follow-up-on-interest":
    "Someone clicks a campaign link: one helpful follow-up an hour later.",
  "vip-holders":
    "A wallet makes a large transfer: a VIP welcome within the hour, private access two days later.",
  "win-back-quiet-wallets":
    "Someone goes quiet: an email now, an incentive five days later.",
  "save-a-withdrawal":
    "A wallet withdraws: one email straight away with a reason to stay.",
  "sunset-unengaged":
    "Someone stops opening: one last check-in before you stop emailing them.",
};

/** The card line for a template, falling back to its own description. */
export const standardLoopSummary = (id: string): string =>
  STANDARD_LOOP_SUMMARY[id] ??
  protocolTemplates.find((t) => t.id === id)?.description ??
  "";
