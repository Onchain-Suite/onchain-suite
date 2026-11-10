import type { StartPath } from "@/features/onboarding/utils/start-path";

/**
 * The three answers to "What do you have today?" on the first-run Home (2.7
 * reference `data/startPath.ts`). `win` is what they will see once the first
 * step is done: the reason to do it.
 */
export interface StartOption {
  id: StartPath;
  title: string;
  desc: string;
  win: string;
}

export const START_OPTIONS: StartOption[] = [
  {
    id: "people",
    title: "A list of people",
    desc: "Customers, subscribers or users, in a spreadsheet or another tool.",
    win: "Import them and you can send your first campaign today.",
  },
  {
    id: "site",
    title: "A website or an app",
    desc: "Visitors, but no list yet. Start collecting people who want to hear from you.",
    win: "Publish a sign-up form and people start arriving as contacts, with their consent.",
  },
  {
    id: "chain",
    title: "A smart contract",
    desc: "Your users are already on chain: holders, minters, stakers.",
    win: "Index the contract and your holders appear as an audience in about two minutes.",
  },
];

/**
 * How long each step takes, and the hand-off when it is usually someone else's
 * job. Honest estimates read as help, not nagging.
 */
export const STEP_EFFORT: Record<string, string> = {
  contacts: "A couple of minutes",
  form: "About five minutes, and nothing to install",
  domain: "Ten minutes at your DNS provider, or send it to whoever has access",
  push: "Twenty minutes for a frontend engineer",
  contract: "About two minutes",
  sync: "Two minutes, once a contract is indexed",
  dashboard: "One click, once there are numbers",
};

/** The hero button's words, where the step's own label is not an action. */
export const STEP_ACTION: Record<string, string> = {
  contacts: "Import contacts",
  form: "Build a sign-up form",
  contract: "Index your contract",
};
