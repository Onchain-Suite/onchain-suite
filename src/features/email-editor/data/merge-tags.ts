import { ONCHAIN_VARIABLE_SAMPLES } from "@/features/templates/onchain-variables";

/**
 * The merge tags the email editor offers, and how each one is written into the
 * HTML that is sent.
 *
 * Only keys the backend's renderer actually fills are listed (onchain-backend
 * campaign.service `mapLegacyMergePath`): an unknown key renders blank, and a
 * blank recipient tag without a default blocks a campaign launch with
 * RENDER_FIELD_MISSING. That is why `sender_name` and `campaign_name` are not
 * here - the backend has no value for them - and why every recipient tag is
 * always written with a `| default:` (an empty default is still a default).
 *
 * Syntax is the backend's Liquid style: `{{ key | default: "there" }}`. The
 * reference editor's `{{first_name|there}}` would NOT work: the backend reads
 * `there` as an unknown filter and the value stays blank.
 */

export type MergeTagGroup = "Recipient" | "Campaign" | "Compliance";

export interface EditorMergeTag {
  /** What goes inside the braces, e.g. `ens_or_wallet` or `campaign.name`. */
  key: string;
  label: string;
  /** What the tag shows in previews. */
  sample: string;
  group: MergeTagGroup;
  /** Shown when the recipient has no value. Recipient tags only. */
  fallback?: string;
}

const sample = (key: string, otherwise: string) =>
  ONCHAIN_VARIABLE_SAMPLES[key] ?? otherwise;

export const MERGE_TAGS: EditorMergeTag[] = [
  {
    key: "name",
    label: "Name",
    sample: sample("name", "Alex Rivera"),
    group: "Recipient",
    fallback: "there",
  },
  {
    key: "first_name",
    label: "First name",
    sample: sample("first_name", "Alex"),
    group: "Recipient",
    fallback: "there",
  },
  {
    key: "ens_or_wallet",
    label: "ENS or wallet",
    sample: "alex.eth",
    group: "Recipient",
    fallback: "there",
  },
  {
    key: "ens_name",
    label: "ENS name",
    sample: sample("ens_name", "alex.eth"),
    group: "Recipient",
    fallback: "there",
  },
  {
    key: "wallet_short",
    label: "Wallet (short)",
    sample: sample("wallet_short", "0x8d35…C4d5"),
    group: "Recipient",
    fallback: "your wallet",
  },
  {
    key: "wallet",
    label: "Wallet address",
    sample: sample("wallet", "0x8d35C0e1b3A2F1c9D4e5A6b7C8d9E0f1A2b3C4d5"),
    group: "Recipient",
    fallback: "your wallet",
  },
  {
    key: "chain",
    label: "Chain",
    sample: sample("chain", "Base"),
    group: "Recipient",
    fallback: "the network",
  },
  {
    key: "email",
    label: "Email",
    sample: "alex@example.com",
    group: "Recipient",
    fallback: "",
  },
  {
    key: "campaign.name",
    label: "Campaign name",
    sample: "Season 2 launch",
    group: "Campaign",
  },
  {
    key: "unsubscribe_url",
    label: "Unsubscribe link",
    sample: "https://onchainsuite.com/t/unsubscribe",
    group: "Compliance",
  },
  {
    key: "preference_center_url",
    label: "Manage preferences",
    sample: "https://onchainsuite.com/t/unsubscribe",
    group: "Compliance",
  },
  {
    key: "postal_address",
    label: "Postal address",
    sample: "2261 Market St #4523, San Francisco, CA 94114",
    group: "Compliance",
  },
];

export const findMergeTag = (key: string): EditorMergeTag | undefined =>
  MERGE_TAGS.find((t) => t.key === key);

/** Recipient tags get a fallback, since we may not know the value. */
export const needsFallback = (key: string): boolean =>
  findMergeTag(key)?.group === "Recipient";

export const defaultFallback = (key: string): string =>
  findMergeTag(key)?.fallback ?? "";

/**
 * Tags every email must carry somewhere every recipient sees it: a way to
 * unsubscribe and the sender's postal address (CAN-SPAM §7704(a)(5), GDPR
 * Art. 21). The backend appends its own footer only when the HTML has no
 * unsubscribe at all, and never adds a postal address, so the editor checks.
 */
export const REQUIRED_TAGS = ["unsubscribe_url", "postal_address"] as const;

/** The standard footer: no sender name tag, because the backend has none. */
export const DEFAULT_FOOTER = [
  "You're receiving this because you opted in to our emails.",
  "{{ postal_address }}",
  "{{ unsubscribe_url }} · {{ preference_center_url }}",
].join("\n");

/** Matches any `{{ key }}` or `{{ key | filters }}` token, capturing the key. */
export const TAG_TOKEN = /\{\{\s*([a-z_][a-z0-9_.]*)\s*(?:\|[^}]*)?\}\}/gi;

/** Quote-safe fallback text: the backend splits filters on quotes and pipes. */
const cleanFallback = (s: string) => s.replace(/["|{}]/g, "").trim();

/**
 * The token written into sent HTML for one merge tag. Recipient tags always
 * carry a default so a missing value never blanks the line or blocks a launch.
 * The postal address never does: the backend refuses `| default:` there, and a
 * missing address should block, because sending without one breaks the law.
 */
export function tagToken(key: string, fallback = ""): string {
  if (needsFallback(key)) {
    return `{{ ${key} | default: "${cleanFallback(fallback)}" }}`;
  }
  return `{{ ${key} }}`;
}
