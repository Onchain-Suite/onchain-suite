/**
 * Where each email merge variable's DATA comes from - so the UI can tell a user
 * exactly what to fill (and where) instead of a generic "unresolved variable"
 * error. Three families:
 *
 *  - `contact`  : resolved per recipient from the audience (wallet / onchain
 *                 profile / imported CRM fields). Not something the sender fills
 *                 in Settings; it comes from the contact record at send time.
 *  - `settings` : filled once by the sender in Settings (company name, postal
 *                 address, token ticker, verified from-address). These are the
 *                 ones a "fill your profile" nudge should point at.
 *  - `campaign` : taken from the campaign being sent (its name).
 *  - `system`   : generated per recipient by the backend (unsubscribe /
 *                 preference-center links). Nothing to configure.
 *
 * The `settings` entries carry a deep link + hint so a missing value renders as
 * "Add your postal address in Settings → Account" rather than a raw token.
 */

export type VariableSourceKind = "contact" | "settings" | "campaign" | "system";

export interface VariableSourceInfo {
  /** Bare token key inside the braces, e.g. `postal_address`. */
  key: string;
  /** Human label. */
  label: string;
  kind: VariableSourceKind;
  /** Where the data is collected, in words (shown in the reference table). */
  collectedAt: string;
  /** Deep link to fill it - only for `settings` variables the user controls. */
  href?: string;
  /** Actionable one-liner shown when the value is missing. */
  fillHint?: string;
}

/** Account tab holds the org profile (name, billing email, address, ticker). */
export const SETTINGS_ACCOUNT_HREF = "/settings?tab=account";
/** The sender-verification card within the Account tab. */
export const SETTINGS_SENDER_HREF =
  "/settings?tab=account&section=sender-verification";

/**
 * Canonical source map, keyed by token. Aliases (e.g. legacy
 * `manage_preferences_url`) are normalised in {@link getVariableSource}.
 */
export const VARIABLE_SOURCES: Record<string, VariableSourceInfo> = {
  // -- Settings-sourced (the sender fills these once) -----------------------
  sender_name: {
    key: "sender_name",
    label: "Sender name",
    kind: "settings",
    collectedAt: "Settings → Account → Project name",
    href: SETTINGS_ACCOUNT_HREF,
    fillHint: "Add your project / company name so footers identify the sender.",
  },
  protocol: {
    key: "protocol",
    label: "Protocol",
    kind: "settings",
    collectedAt: "Settings → Account → Project name",
    href: SETTINGS_ACCOUNT_HREF,
    fillHint: "Add your project name in Settings → Account.",
  },
  postal_address: {
    key: "postal_address",
    label: "Postal address",
    kind: "settings",
    collectedAt: "Settings → Account → Billing address",
    href: SETTINGS_ACCOUNT_HREF,
    fillHint:
      "Add your postal mailing address in Settings → Account (required in email footers).",
  },
  token_symbol: {
    key: "token_symbol",
    label: "Token symbol",
    kind: "settings",
    collectedAt: "Settings → Account → Token ticker",
    href: SETTINGS_ACCOUNT_HREF,
    fillHint: "Add your token ticker in Settings → Account.",
  },
  sender_email: {
    key: "sender_email",
    label: "Sender email",
    kind: "settings",
    collectedAt: "Settings → Account → Sender verification",
    href: SETTINGS_SENDER_HREF,
    fillHint: "Verify a sending domain / from-address in Settings → Account.",
  },

  // -- Campaign-sourced -----------------------------------------------------
  campaign_name: {
    key: "campaign_name",
    label: "Campaign name",
    kind: "campaign",
    collectedAt: "The campaign's own name",
  },

  // -- System-generated (per recipient, nothing to configure) ---------------
  unsubscribe_url: {
    key: "unsubscribe_url",
    label: "Unsubscribe link",
    kind: "system",
    collectedAt: "Generated per recipient at send time",
  },
  preference_center_url: {
    key: "preference_center_url",
    label: "Manage preferences link",
    kind: "system",
    collectedAt: "Generated per recipient at send time",
  },

  // -- Contact / audience-sourced (per recipient) ---------------------------
  name: contactSource("name", "Name", "Contact display name (or a fallback)"),
  greeting_name: contactSource(
    "greeting_name",
    "Greeting name",
    'First name → ENS → short wallet → "there"'
  ),
  ens_name: contactSource("ens_name", "ENS name", "Wallet's primary ENS name"),
  ens_or_wallet: contactSource(
    "ens_or_wallet",
    "ENS or wallet",
    "ENS name, falling back to the wallet"
  ),
  wallet: contactSource("wallet", "Wallet address", "Full wallet address"),
  wallet_address: contactSource(
    "wallet_address",
    "Wallet address",
    "Full wallet address"
  ),
  wallet_short: contactSource(
    "wallet_short",
    "Wallet (short)",
    "Truncated wallet address"
  ),
  chain: contactSource(
    "chain",
    "Chain",
    "Network the contact is most active on"
  ),
  amount: contactSource("amount", "Amount", "Contextual amount for the send"),
  tx_hash: contactSource("tx_hash", "Transaction hash", "Relevant tx hash"),
  first_name: contactSource("first_name", "First name", "Contact's first name"),
  last_name: contactSource("last_name", "Last name", "Contact's last name"),
  email: contactSource("email", "Email", "Contact's email address"),
  company: contactSource("company", "Company", "Contact's company"),
  job_title: contactSource("job_title", "Job title", "Contact's role"),
  city: contactSource("city", "City", "Contact's city"),
  country: contactSource("country", "Country", "Contact's country"),
  signup_date: contactSource(
    "signup_date",
    "Signup date",
    "When the contact joined"
  ),
};

function contactSource(
  key: string,
  label: string,
  collectedAt: string
): VariableSourceInfo {
  return {
    key,
    label,
    kind: "contact",
    collectedAt: `Audience · ${collectedAt}`,
  };
}

/** Legacy / alias tokens normalised to their canonical key. */
const TOKEN_ALIASES: Record<string, string> = {
  manage_preferences_url: "preference_center_url",
  preferences: "preference_center_url",
  unsubscribe: "unsubscribe_url",
};

/** Look up a token's data source, tolerating whitespace/case and aliases. */
export function getVariableSource(
  rawKey: string
): VariableSourceInfo | undefined {
  const key = rawKey.trim().toLowerCase();
  const canonical = TOKEN_ALIASES[key] ?? key;
  return VARIABLE_SOURCES[canonical];
}

/** The settings-sourced variables, for "complete your profile" nudges. */
export const SETTINGS_VARIABLES: VariableSourceInfo[] = Object.values(
  VARIABLE_SOURCES
).filter((entry) => entry.kind === "settings");
