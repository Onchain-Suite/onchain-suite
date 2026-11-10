import type { StartPath } from "@/features/onboarding/utils/start-path";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * The setup checklist (v2.7 reference `data/setup.ts`). Six steps, in the
 * order that gets someone to a first send soonest from where they start
 * (7 Nov 2026). With a list of people: people, then a channel, then on-chain
 * data. With a website and no list: a sign-up form first, in place of an
 * import. With a smart contract: index it and sync its holders first, because
 * that is the audience they already have. Wallet sync always follows indexing,
 * because sync reads the contract's holders.
 *
 * Static data, React-free: `hooks/use-setup-steps.ts` decides `done` from live
 * workspace state, never from a "has seen" flag.
 */
export type SetupStepId =
  "contacts" | "form" | "domain" | "push" | "contract" | "sync" | "dashboard";

export type SetupStepIcon =
  "users" | "form" | "mail" | "phone" | "network" | "globe";

export interface SetupStepDef {
  id: SetupStepId;
  label: string;
  /** What to do, shown when the open step is expanded. */
  hint: string;
  icon: SetupStepIcon;
  href: string;
}

const ALL_STEPS: SetupStepDef[] = [
  {
    id: "contacts",
    label: "Add your first contacts",
    icon: "users",
    href: `${PRIVATE_ROUTES.AUDIENCE}/import-export`,
    hint: "Import a CSV, bring a list from your old tool, or build a sign-up form. These are the people you will message.",
  },
  {
    id: "form",
    label: "Publish a sign-up form",
    icon: "form",
    href: `${PRIVATE_ROUTES.FORMS}?new=1`,
    hint: "A form on your site or a hosted page. Everyone who fills it in becomes a contact, with their consent recorded.",
  },
  {
    id: "domain",
    label: "Verify a sending domain",
    icon: "mail",
    href: `${PRIVATE_ROUTES.INTEGRATIONS}?tab=channels&channel=email`,
    hint: "A few DNS records, so mail leaves as you rather than as us. Email cannot send until they resolve.",
  },
  {
    id: "push",
    label: "Install in-app push",
    icon: "phone",
    href: `${PRIVATE_ROUTES.INTEGRATIONS}?tab=channels&channel=push`,
    hint: "The SDK in your dApp. Push reaches people who never gave you an email address.",
  },
  {
    id: "contract",
    label: "Index a contract",
    icon: "network",
    href: `${PRIVATE_ROUTES.INTEGRATIONS}?tab=events`,
    hint: "Adds on-chain data: holders as an audience, and mints, swaps and wallets going quiet as Loop triggers. Paste an address, a deployer wallet or your website.",
  },
  {
    id: "sync",
    label: "Sync your wallets",
    icon: "network",
    href: PRIVATE_ROUTES.AUDIENCE,
    hint: "Once a contract is indexed: read its holders and pull per-wallet metrics, so segments can match on what wallets do.",
  },
  {
    id: "dashboard",
    label: "Publish a dashboard",
    icon: "globe",
    href: PRIVATE_ROUTES.ANALYTICS,
    hint: "A link your team can read without an account, so the numbers leave this browser.",
  },
];

const ORDER: Record<StartPath, SetupStepId[]> = {
  people: ["contacts", "domain", "push", "contract", "sync", "dashboard"],
  site: ["form", "domain", "push", "contract", "sync", "dashboard"],
  chain: ["contract", "sync", "contacts", "domain", "push", "dashboard"],
};

/** The six steps for a start answer, first win first. No answer reads as a list of people. */
export function setupStepsFor(path: StartPath | null): SetupStepDef[] {
  return ORDER[path ?? "people"].flatMap((id) => {
    const step = ALL_STEPS.find((s) => s.id === id);
    return step ? [step] : [];
  });
}

/** The default order, for callers with no workspace to ask (tests, fallbacks). */
export const SETUP_STEPS: SetupStepDef[] = setupStepsFor(null);
