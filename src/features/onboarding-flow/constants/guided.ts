/**
 * Guided onboarding data (v2.7 revamp).
 *
 * The one question that shapes setup is who is wiring up the technical side; the rest of the
 * flow branches off it. Pure data + pure helpers, server-safe. Plan tiers and pricing are NOT
 * here: the plan step reuses the app's existing billing `PlanPicker`.
 */

/**
 * Who is wiring up the contracts, DNS and SDK. Most account creators are not, so the answer
 * decides whether setup is presented as work to do or as steps to forward.
 */
export type Role = "builder" | "operator";

/** Icon key for a role card; mapped to a heroicon by the step component. */
export type RoleIcon = "builder" | "operator";

export const ROLES: Array<{
  id: Role;
  label: string;
  desc: string;
  icon: RoleIcon;
}> = [
  {
    id: "builder",
    label: "I am",
    desc: "I'll wire up the contracts, DNS and SDK myself",
    icon: "builder",
  },
  {
    id: "operator",
    label: "Someone else is",
    desc: "I'll build the campaigns. Someone else holds the credentials",
    icon: "operator",
  },
];

/**
 * The project, as onboarding asks for it. Name, website and sector qualify the account; the
 * website is what the indexer looks the project up by when no address is given. The contract
 * is optional - most people setting up the account are not the ones holding it.
 */
export interface ProjectProfile {
  /** The person's first name. Cerebra greets them by it through setup and into the tour. */
  firstName: string;
  name: string;
  website: string;
  sector: string;
  description: string;
  /** Optional: when given, it is what gets indexed first. */
  contract: string;
  /** Chains the project is on (backend chain keys), used to scope onchain contract suggestions. */
  chains: string[];
}

export const EMPTY_PROFILE: ProjectProfile = {
  firstName: "",
  name: "",
  website: "",
  sector: "",
  description: "",
  contract: "",
  chains: [],
};

/** One contract the user wants indexed: an address on a chosen chain. Sent to the backend. */
export interface OnboardingContract {
  address: string;
  /** Backend chain key (see data/chains.ts). */
  chain: string;
  name?: string;
}

/**
 * A contract entered by hand on step 4, the fallback when the paste box can't
 * auto-find it. Kept structured (name + address + chain + type) so it is both
 * what we index and what the UI shows. `type` is a UI label (e.g. "erc721");
 * only address/chain/name reach the indexer.
 */
export interface ManualContractDraft {
  name: string;
  address: string;
  /** Backend chain key (see data/chains.ts). */
  chain: string;
  type: string;
}

// Sectors come from the app's existing grouped Web3 / Web2 picker
// (`constants/index.ts` organizationOptions + web2Options), not a flat list, so
// the "web2 clients skip contract indexing" logic keeps working.

/** Enough to qualify the account: a first name, a project name, a website that looks like a domain, and a sector. */
export const profileReady = (p: ProjectProfile): boolean =>
  p.firstName.trim().length > 0 &&
  p.name.trim().length > 0 &&
  /\S+\.\S+/.test(p.website.trim()) &&
  p.sector !== "";

/** What the indexer is pointed at: an address if one was given, otherwise the website. */
export const lookupFor = (p: ProjectProfile): string =>
  p.contract.trim() || p.website.trim() || p.name.trim();

/** Contact-size stops for the plan slider; each notch sits on a plan boundary. */
export const CONTACT_STOPS = [
  1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000,
] as const;

export const contactsLabel = (n: number): string =>
  n >= CONTACT_STOPS[CONTACT_STOPS.length - 1]
    ? `${n.toLocaleString("en-US")}+`
    : n.toLocaleString("en-US");

/**
 * The flow branches on who sets up the technical side. The builder sets up the sending domain
 * then the contract; someone handing it over sends the steps, still sees the sending domain
 * (a handful of DNS records the account owner can often forward), and skips the contract (the
 * developer's job, from the steps they were sent). Both end at the plan, which can be skipped.
 */
export type StepId = "project" | "technical" | "dns" | "contract" | "plan";

export const STEP_LABEL: Record<StepId, string> = {
  project: "Your project",
  technical: "Technical setup",
  dns: "Sending domain",
  contract: "Smart contract",
  plan: "Plan",
};

export const flowFor = (role: Role): StepId[] =>
  role === "builder"
    ? ["project", "technical", "dns", "contract", "plan"]
    : ["project", "technical", "dns", "plan"];

/**
 * The scoped flow an invited technical member runs (the owner handed the setup over). The org
 * already exists and the plan is the owner's decision, so it is just the sending domain then the
 * contract - the two credential-bound steps the developer was brought in for. Entered at a stable
 * route (`?mode=handoff`); it never creates an org or touches billing.
 */
export const HANDOFF_FLOW: StepId[] = ["dns", "contract"];

/** The query value that puts onboarding into the invited-developer handoff flow. */
export const HANDOFF_MODE = "handoff";
