/**
 * Recipe templates — pre-wired flows a blank canvas can start from.
 *
 * Each recipe is a linear spine of steps (a trigger followed by actions). The
 * builder turns it into real nodes + edges via `resolveNodeShape`, so the
 * `type`s here must be canonical trigger/action types (see FIXED_TRIGGERS /
 * FIXED_ACTIONS). `data` is merged over the resolved node data, which is how a
 * recipe pre-fills a wait duration, a tag, or starter in-app copy — content
 * that would otherwise read as "Needs setup".
 *
 * Kept intentionally linear: a valid spine can never produce a dangling or
 * mis-handled edge, so a recipe always drops onto the canvas ready to publish
 * once the send steps are pointed at real templates. Branch-shaped recipes can
 * come later once the wiring carries source handles.
 */
export interface AutomationRecipeStep {
  type: string;
  label: string;
  data?: Record<string, unknown>;
}

export interface AutomationRecipe {
  id: string;
  title: string;
  /** One line: what the flow does and when it fires. */
  description: string;
  category: "Growth" | "Retention" | "DeFi" | "NFT" | "Governance";
  /** Key into RECIPE_ICONS in the builder (keeps this file JSX-free). */
  iconKey: string;
  steps: AutomationRecipeStep[];
}

export const AUTOMATION_RECIPES: AutomationRecipe[] = [
  {
    id: "welcome-new-holders",
    title: "Welcome new holders",
    description: "When a wallet acquires your token, greet it and follow up.",
    category: "Growth",
    iconKey: "sparkles",
    steps: [
      { type: "holder_acquired", label: "Token acquired" },
      { type: "wait", label: "Wait", data: { duration: "5 minutes" } },
      {
        type: "send_inapp",
        label: "Send in-app",
        data: {
          title: "Welcome aboard",
          body: "Thanks for holding — here's how to get started.",
        },
      },
      { type: "wait", label: "Wait", data: { duration: "1 day" } },
      { type: "send_email", label: "Send email" },
    ],
  },
  {
    id: "win-back-withdrawn-capital",
    title: "Win back withdrawn capital",
    description: "A wallet pulls capital out — tag it and reach out to return.",
    category: "Retention",
    iconKey: "heart",
    steps: [
      { type: "capital_withdrawn", label: "Capital withdrawn" },
      { type: "add_tag", label: "Add tag", data: { tag: "at-risk" } },
      { type: "wait", label: "Wait", data: { duration: "1 day" } },
      { type: "send_email", label: "Send email" },
    ],
  },
  {
    id: "liquidation-rescue",
    title: "Liquidation rescue",
    description: "A position gets liquidated — notify immediately, then email.",
    category: "DeFi",
    iconKey: "shield",
    steps: [
      { type: "liquidation_detected", label: "Liquidation" },
      {
        type: "send_inapp",
        label: "Send in-app",
        data: {
          title: "Your position was liquidated",
          body: "Here's what happened and how to protect your next one.",
        },
      },
      { type: "send_email", label: "Send email" },
    ],
  },
  {
    id: "reward-your-stakers",
    title: "Reward your stakers",
    description: "A wallet stakes — thank it and mark it as a staker.",
    category: "DeFi",
    iconKey: "gift",
    steps: [
      { type: "staked", label: "Staked" },
      { type: "wait", label: "Wait", data: { duration: "5 minutes" } },
      {
        type: "send_inapp",
        label: "Send in-app",
        data: {
          title: "Thanks for staking",
          body: "Your stake is live. Watch this space for staker-only perks.",
        },
      },
      { type: "add_tag", label: "Add tag", data: { tag: "staker" } },
    ],
  },
  {
    id: "nft-sale-follow-up",
    title: "NFT sale follow-up",
    description: "A marketplace sale settles — follow up and add to a list.",
    category: "NFT",
    iconKey: "bag",
    steps: [
      { type: "nft_sold", label: "NFT sold" },
      { type: "wait", label: "Wait", data: { duration: "5 minutes" } },
      { type: "send_email", label: "Send email" },
      { type: "add_to_list", label: "Add to list" },
    ],
  },
  {
    id: "governance-turnout-nudge",
    title: "Governance turnout nudge",
    description: "A proposal opens — nudge in-app, then email the undecided.",
    category: "Governance",
    iconKey: "scale",
    steps: [
      { type: "governance_activity", label: "Governance activity" },
      {
        type: "send_inapp",
        label: "Send in-app",
        data: {
          title: "A proposal needs your vote",
          body: "Voting is open. Make your voice count before it closes.",
        },
      },
      { type: "wait", label: "Wait", data: { duration: "2 days" } },
      { type: "send_email", label: "Send email" },
    ],
  },
];
