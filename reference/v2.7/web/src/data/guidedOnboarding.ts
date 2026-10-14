import type { IconName } from '../components/icons';
import { getPlan, type PlanId } from './pricing';

/* Onboarding data.
 *
 * Most of what lived here — a sample size, an extrapolation model, detected projects, found
 * segments — existed to show an audience before payment by enriching wallets for people who
 * had not paid. Onboarding no longer does any work before payment, so it went with the
 * screens that used it. What is left is the one question that shapes setup. */

/** Who is wiring up the contracts, DNS and SDK. Seven in ten account creators are not, so
 *  the answer decides whether setup is presented as work or as something to forward. */
export type Role = 'builder' | 'operator';

export const ROLES: { id: Role; label: string; desc: string; icon: IconName }[] = [
  { id: 'builder', label: 'I am', desc: "I'll wire up the contracts, DNS and SDK myself", icon: 'code-xml' },
  { id: 'operator', label: 'Someone else is', desc: "I'll build the campaigns. Someone else holds the credentials", icon: 'send' },
];

/* The project, as onboarding asks for it.
 *
 * Name, website and sector qualify the account — who this is, and what kind of thing they
 * run — and the website is what the indexer looks the project up by when no address is
 * given. The contract address is optional: most people setting up the account are not the
 * ones holding it. */
export interface ProjectProfile {
  name: string;
  website: string;
  sector: string;
  description: string;
  /** Optional — when given, it is what gets indexed first. */
  contract: string;
}

export const EMPTY_PROFILE: ProjectProfile = { name: '', website: '', sector: '', description: '', contract: '' };

export const SECTORS = [
  'Blockchain protocol (L1 / L2)', 'DeFi', 'NFTs & gaming', 'Exchange', 'Wallet',
  'Infrastructure & tooling', 'RWA & tokenization', 'Payments & stablecoins', 'DAO & community', 'Other',
] as const;

/** Enough to qualify the account: a name, a website that looks like a domain, and a sector. */
export const profileReady = (p: ProjectProfile) =>
  p.name.trim().length > 0 && /\S+\.\S+/.test(p.website.trim()) && p.sector !== '';

/** What the indexer is pointed at: an address if one was given, otherwise the website. */
export const lookupFor = (p: ProjectProfile) => p.contract.trim() || p.website.trim() || p.name.trim();

/* Plans, as onboarding offers them: four tiers, not six cards.
 *
 * Launch+ and Growth+ are the same capability as Launch and Growth with more contacts, so
 * they are a size within their tier rather than plans of their own — six side-by-side cards
 * made people read every description to find out that two of them were the same thing
 * bigger. Each line says what the tier is for on its own terms, not relative to another. */
export interface PlanTier { id: string; name: string; line: string; sizes: PlanId[] }

export const PLAN_TIERS: PlanTier[] = [
  { id: 'send', name: 'Send', line: 'Email and in-app campaigns. No blockchain data.', sizes: ['send'] },
  { id: 'launch', name: 'Launch', line: 'Wallet and email lanes, with Loops and Intelligence.', sizes: ['launch', 'launch-plus'] },
  { id: 'growth', name: 'Growth', line: 'Adds Forms and a dedicated sending IP.', sizes: ['growth', 'growth-plus'] },
  { id: 'enterprise', name: 'Enterprise', line: 'Contacts, volume and terms set for you. We send an offer.', sizes: ['enterprise'] },
];

export const tierOf = (planId: string) => PLAN_TIERS.find((t) => (t.sizes as string[]).includes(planId));

/* Contact size, chosen with a slider rather than per-tier toggles.
 *
 * One control for "how big is your list", and every tier answers it: Send prices per
 * subscriber, Launch and Growth pick the size that holds it, Enterprise is the answer above
 * Growth+. The stops sit on the plan boundaries so each notch is a real price change. */
export const CONTACT_STOPS = [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000] as const;

export const contactsLabel = (n: number) =>
  n >= CONTACT_STOPS[CONTACT_STOPS.length - 1] ? `${n.toLocaleString('en-US')}+` : n.toLocaleString('en-US');

/** The plan a tier becomes at a list size, or null if the tier cannot hold it. */
export function planFor(tier: string, contacts: number): PlanId | null {
  if (tier === 'send') return 'send';
  if (tier === 'enterprise') return 'enterprise';
  const t = PLAN_TIERS.find((x) => x.id === tier);
  return t?.sizes.find((id) => getPlan(id)!.allowances.contacts >= contacts) ?? null;
}

/** Where a list that has outgrown its tier lands: the smallest Suite tier that holds it. */
export const smallestFit = (contacts: number) =>
  ['launch', 'growth', 'enterprise'].find((t) => planFor(t, contacts) !== null)!;

/* The flow branches on who sets up the technical side.
 *
 * Whoever does it sets up the sending domain and then the contract and its events, so those are
 * their next screens. Someone who is handing it over sends the steps from the technical screen,
 * still sees the sending domain (it is two DNS records, and often the one piece the person
 * paying can forward or do), and skips the contract: that is the developer's, from the steps
 * they were sent. Both end at payment, which can be skipped. */
export type StepId = 'project' | 'technical' | 'dns' | 'contract' | 'plan';

export const STEP_LABEL: Record<StepId, string> = {
  project: 'Your project', technical: 'Technical setup', dns: 'Sending domain', contract: 'Smart contract', plan: 'Plan',
};

export const flowFor = (role: Role): StepId[] =>
  role === 'builder'
    ? ['project', 'technical', 'dns', 'contract', 'plan']
    : ['project', 'technical', 'dns', 'plan'];
