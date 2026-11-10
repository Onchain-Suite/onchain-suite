import type { StartPath } from "../constants/guided";

/**
 * What counts as a conversion for a workspace (2.7): the one thing it wants
 * people to do. Asked in onboarding as its own step, suggested from what the
 * team has today, and saved with the onboarding answers. `did` is how a count
 * of it reads in a sentence ("70 of them made a purchase afterwards").
 */
export interface GoalOption {
  id: string;
  label: string;
  desc: string;
  did: string;
  /** Measured on chain, so it needs an indexed contract. */
  onChain?: boolean;
}

export const GOALS: GoalOption[] = [
  {
    id: "purchase",
    label: "A purchase",
    desc: "Someone buys something",
    did: "made a purchase",
  },
  {
    id: "signup",
    label: "A sign-up",
    desc: "Someone creates an account",
    did: "signed up",
  },
  {
    id: "upgrade",
    label: "An upgrade",
    desc: "Someone moves to a paid plan",
    did: "upgraded",
  },
  {
    id: "booking",
    label: "A booking",
    desc: "Someone books a call or a demo",
    did: "booked",
  },
  {
    id: "form",
    label: "A form",
    desc: "Someone fills in one of your forms",
    did: "filled in a form",
  },
  {
    id: "click",
    label: "A click",
    desc: "Someone clicks through to a page",
    did: "clicked through",
  },
  {
    id: "deposit",
    label: "A deposit",
    desc: "A wallet deposits into your protocol",
    did: "made a deposit",
    onChain: true,
  },
  {
    id: "mint",
    label: "A mint",
    desc: "A wallet mints from your contract",
    did: "minted",
    onChain: true,
  },
  {
    id: "swap",
    label: "A swap",
    desc: "A wallet swaps through your protocol",
    did: "swapped",
    onChain: true,
  },
  {
    id: "stake",
    label: "A stake",
    desc: "A wallet stakes with you",
    did: "staked",
    onChain: true,
  },
];

/** The goals that fit what a team has today, best first. */
const SUGGESTED: Record<StartPath, string[]> = {
  people: ["purchase", "upgrade", "booking", "click"],
  site: ["signup", "purchase", "form", "booking"],
  chain: ["deposit", "mint", "swap", "stake"],
};

/**
 * The goal cards for a start answer: the suggested ones first, then the rest.
 * Without an answer, every goal in catalogue order.
 */
export function goalsFor(start: StartPath | ""): {
  suggested: GoalOption[];
  more: GoalOption[];
} {
  if (!start) return { suggested: [], more: GOALS };
  const ids = SUGGESTED[start];
  const suggested = ids
    .map((id) => GOALS.find((g) => g.id === id))
    .filter((g): g is GoalOption => g !== undefined);
  return {
    suggested,
    more: GOALS.filter((g) => !ids.includes(g.id)),
  };
}

export const goalById = (id: string) => GOALS.find((g) => g.id === id);
