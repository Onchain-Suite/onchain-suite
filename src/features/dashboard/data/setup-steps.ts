import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * The Getting started checklist (v2.7 reference `data/setup.ts`). Six steps,
 * in the order that gets someone to a first send soonest: people to message,
 * then a channel to reach them on, then on-chain data. Indexing a contract is
 * not first because contacts, forms, campaigns and Loops all work without one;
 * wallet sync follows it because sync reads the contract's holders.
 *
 * Static data, React-free: the panel maps `icon` to a Heroicon, and
 * `hooks/use-setup-steps.ts` decides `done` from live workspace state, never
 * from a "has seen" flag.
 */
export type SetupStepId =
  "contacts" | "domain" | "push" | "contract" | "sync" | "dashboard";

export type SetupStepIcon = "users" | "mail" | "phone" | "network" | "globe";

export interface SetupStepDef {
  id: SetupStepId;
  label: string;
  /** What to do, shown when the open step is expanded. */
  hint: string;
  icon: SetupStepIcon;
  href: string;
}

export const SETUP_STEPS: SetupStepDef[] = [
  {
    id: "contacts",
    label: "Add your first contacts",
    icon: "users",
    href: PRIVATE_ROUTES.AUDIENCE,
    hint: "Import a CSV, bring a list from your old tool, or build a sign-up form. These are the people you will message.",
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
