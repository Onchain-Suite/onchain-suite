/**
 * Onchain dynamic variables (a.k.a. merge tags) supported across email
 * templates, the campaign subject line, and the automation Send-email action.
 *
 * Syntax is Handlebars-style with spaces: `{{ ens_name }}`. Rendering is
 * whitespace-tolerant, so `{{ens_name}}` and `{{  ens_name  }}` also resolve.
 *
 * These replace the previous generic Web2 tags (firstName, company, phone…)
 * with a Web3-native set keyed off the wallet / onchain profile.
 */
export type VariableGroup = "web3" | "web2";

export interface OnchainVariable {
  /** Stable id used in pickers. */
  id: string;
  /** Human label shown in the inserter. */
  label: string;
  /** The literal token users insert, e.g. `{{ ens_name }}`. */
  tag: string;
  /** Bare key inside the braces, e.g. `ens_name`. */
  key: string;
  /** One-line description of what the value resolves to. */
  description: string;
  /** Realistic sample used for previews and template thumbnails. */
  sample: string;
  /**
   * Safe fallback baked into templates as `| default: "..."` so a missing
   * value never blocks a send (the backend validator rejects unresolved
   * variables without a default).
   */
  fallback?: string;
  /** Which family the variable belongs to. */
  group: VariableGroup;
}

/** Web3 / onchain variables, keyed off the wallet + onchain profile. */
export const WEB3_VARIABLES: OnchainVariable[] = [
  {
    id: "name",
    label: "Name",
    tag: "{{ name }}",
    key: "name",
    fallback: "there",
    description: "Display name if known, otherwise a friendly fallback.",
    sample: "Alex Rivera",
    group: "web3",
  },
  {
    id: "ens_name",
    label: "ENS name",
    tag: "{{ ens_name }}",
    key: "ens_name",
    fallback: "there",
    description: "Primary ENS (or resolved name) for the wallet.",
    sample: "alex.eth",
    group: "web3",
  },
  {
    id: "wallet",
    label: "Wallet address",
    tag: "{{ wallet }}",
    key: "wallet",
    fallback: "your wallet",
    description: "Full checksummed wallet address.",
    sample: "0x8d35C0e1b3A2F1c9D4e5A6b7C8d9E0f1A2b3C4d5",
    group: "web3",
  },
  {
    id: "wallet_short",
    label: "Wallet (short)",
    tag: "{{ wallet_short }}",
    key: "wallet_short",
    fallback: "your wallet",
    description: "Truncated address, e.g. 0x8d35…C4d5.",
    sample: "0x8d35…C4d5",
    group: "web3",
  },
  {
    id: "protocol",
    label: "Protocol",
    tag: "{{ protocol }}",
    key: "protocol",
    fallback: "our protocol",
    description: "Your protocol / project name.",
    sample: "Onchain Suite",
    group: "web3",
  },
  {
    id: "chain",
    label: "Chain",
    tag: "{{ chain }}",
    key: "chain",
    fallback: "the network",
    description: "Network the contact is most active on.",
    sample: "Ethereum",
    group: "web3",
  },
  {
    id: "token_symbol",
    label: "Token symbol",
    tag: "{{ token_symbol }}",
    key: "token_symbol",
    fallback: "tokens",
    description: "Ticker of your token or the relevant asset.",
    sample: "OCS",
    group: "web3",
  },
  {
    id: "amount",
    label: "Amount",
    tag: "{{ amount }}",
    key: "amount",
    fallback: "some",
    description: "Contextual amount (reward, balance, allocation).",
    sample: "250",
    group: "web3",
  },
  {
    id: "tx_hash",
    label: "Transaction hash",
    tag: "{{ tx_hash }}",
    key: "tx_hash",
    description: "Relevant transaction hash (often truncated).",
    sample: "0x9f2c…4a1b",
    group: "web3",
  },
  {
    id: "unsubscribe_url",
    label: "Unsubscribe URL",
    tag: "{{ unsubscribe_url }}",
    key: "unsubscribe_url",
    description: "Per-recipient unsubscribe link (required in footers).",
    sample: "#unsubscribe",
    group: "web3",
  },
];

/** Web2 / classic CRM variables for teams that also hold off-chain data. */
export const WEB2_VARIABLES: OnchainVariable[] = [
  {
    id: "first_name",
    label: "First name",
    tag: "{{ first_name }}",
    key: "first_name",
    fallback: "there",
    description: "Contact's first name.",
    sample: "Alex",
    group: "web2",
  },
  {
    id: "last_name",
    label: "Last name",
    tag: "{{ last_name }}",
    key: "last_name",
    description: "Contact's last name.",
    sample: "Rivera",
    group: "web2",
  },
  {
    id: "email",
    label: "Email",
    tag: "{{ email }}",
    key: "email",
    description: "Contact's email address.",
    sample: "alex@rivera.xyz",
    group: "web2",
  },
  {
    id: "company",
    label: "Company",
    tag: "{{ company }}",
    key: "company",
    fallback: "your team",
    description: "Company or organization name.",
    sample: "Rivera Labs",
    group: "web2",
  },
  {
    id: "job_title",
    label: "Job title",
    tag: "{{ job_title }}",
    key: "job_title",
    description: "Contact's role or title.",
    sample: "Founder",
    group: "web2",
  },
  {
    id: "city",
    label: "City",
    tag: "{{ city }}",
    key: "city",
    description: "Contact's city.",
    sample: "Lisbon",
    group: "web2",
  },
  {
    id: "country",
    label: "Country",
    tag: "{{ country }}",
    key: "country",
    description: "Contact's country.",
    sample: "Portugal",
    group: "web2",
  },
  {
    id: "signup_date",
    label: "Signup date",
    tag: "{{ signup_date }}",
    key: "signup_date",
    description: "When the contact first joined.",
    sample: "Mar 4, 2026",
    group: "web2",
  },
];

/** Web3 variables - kept as the default export name for existing imports. */
export const ONCHAIN_VARIABLES: OnchainVariable[] = WEB3_VARIABLES;

/** Every variable across both families. */
export const ALL_VARIABLES: OnchainVariable[] = [
  ...WEB3_VARIABLES,
  ...WEB2_VARIABLES,
];

/** Variables grouped for the inserter UI. */
export const VARIABLE_GROUPS: {
  id: VariableGroup;
  label: string;
  variables: OnchainVariable[];
}[] = [
  { id: "web3", label: "Web3 · Onchain", variables: WEB3_VARIABLES },
  { id: "web2", label: "Web2 · Profile", variables: WEB2_VARIABLES },
];

/** Map of key -> sample value, for previews (covers both families). */
export const ONCHAIN_VARIABLE_SAMPLES: Record<string, string> =
  ALL_VARIABLES.reduce<Record<string, string>>((acc, v) => {
    acc[v.key] = v.sample;
    return acc;
  }, {});

/**
 * Replace `{{ key }}` tokens in a string. Unknown keys are left untouched by
 * default (so authors can spot typos), or blanked when `blankUnknown` is set.
 */
export function renderMergeTags(
  input: string,
  values: Record<string, string> = ONCHAIN_VARIABLE_SAMPLES,
  options: { blankUnknown?: boolean } = {}
): string {
  if (!input) return input;
  return input.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*(?:\|[^}]*)?}}/g,
    (match, rawKey) => {
      const key = String(rawKey);
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return values[key];
      }
      return options.blankUnknown ? "" : match;
    }
  );
}

/** List every distinct variable key referenced by a string. */
export function extractUsedVariableKeys(input: string): string[] {
  const found = new Set<string>();
  const re = /{{\s*([a-zA-Z0-9_]+)\s*(?:\|[^}]*)?}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) found.add(m[1]);
  return [...found];
}

const FALLBACKS_BY_KEY: Record<string, string> = ALL_VARIABLES.reduce<
  Record<string, string>
>((acc, v) => {
  if (typeof v.fallback === "string") acc[v.key] = v.fallback;
  return acc;
}, {});

/**
 * Rewrite bare `{{ key }}` tokens to `{{ key | default: "..." }}` for every
 * variable that has a safe fallback. Tokens that already carry a pipe
 * (existing defaults/filters) are left untouched. This keeps starter
 * templates sendable to any audience - the backend refuses to send when a
 * variable resolves blank without a default.
 */
export function withMergeTagDefaults(input: string): string {
  if (!input) return input;
  return input.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (match, rawKey: string) => {
      const fallback = FALLBACKS_BY_KEY[rawKey];
      if (!fallback) return match;
      return `{{ ${rawKey} | default: "${fallback}" }}`;
    }
  );
}
