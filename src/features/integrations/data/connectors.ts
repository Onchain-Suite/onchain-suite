import type { ConnectorDef, ConnectorField } from "../types/connectors";

/**
 * Every connector the backend can verify today, with the exact credential
 * fields its verifier reads (onchain-backend `connections/connectors/**`,
 * staging 2026-10-22). Static, because the server's own directory route
 * (`GET /organization/connections/available`) is not on staging yet.
 *
 * A catalog entry with no connector here has no backend, and the UI says so
 * instead of pretending to connect it.
 */

const secret = (
  key: string,
  label: string,
  extra: Partial<ConnectorField> = {}
): ConnectorField => ({ key, label, type: "secret", required: true, ...extra });

const text = (
  key: string,
  label: string,
  extra: Partial<ConnectorField> = {}
): ConnectorField => ({ key, label, type: "text", required: true, ...extra });

const optional = (f: ConnectorField): ConnectorField => ({
  ...f,
  required: false,
});

/**
 * Optional sender throughput for the per-recipient channels (SMS, WhatsApp).
 * Sends are paced to this rate across every worker, so set it to what the
 * sender can really deliver: a 10DLC campaign's MPS, a short code, a WhatsApp
 * number's throughput. Blank uses the platform default.
 */
const throughputFields = (): ConnectorField[] => [
  optional(
    text("sendRatePerSecond", "Messages per second", {
      placeholder: "10",
      hint: "Your sender's real throughput. Leave blank for the default.",
    })
  ),
  optional(
    text("dailySendLimit", "Daily send limit", {
      placeholder: "e.g. 1000",
      hint: "Optional cap per UTC day, such as a WhatsApp messaging tier. Sends past it wait until the next day.",
    })
  ),
  optional(
    text("quietHours", "Send window (recipient's local time)", {
      placeholder: "08:00-21:00",
      hint: "Messages outside this window wait until it opens in the recipient's time zone. Blank uses 08:00-21:00.",
    })
  ),
  optional(
    text("maxPerRecipientPerDay", "Max messages per person per day", {
      placeholder: "1",
      hint: "Across all campaigns. People over the limit are skipped. 0 means no limit.",
    })
  ),
  optional(
    text("maxPerRecipientPerWeek", "Max messages per person per week", {
      placeholder: "3",
      hint: "Across all campaigns, over the last 7 days. 0 means no limit.",
    })
  ),
];

const DEFS: ConnectorDef[] = [
  // Channels
  {
    id: "telegram",
    label: "Telegram",
    connect: "paste",
    fields: [secret("botToken", "Bot token", { placeholder: "123456:ABC-…" })],
    action: "none",
    where: "Create a bot with @BotFather and copy its token.",
  },
  {
    id: "discord",
    label: "Discord",
    connect: "paste",
    fields: [secret("botToken", "Bot token")],
    action: "none",
    where:
      "Discord Developer Portal → your application → Bot → Reset token. A user token is rejected.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    connect: "paste",
    fields: [
      text("phoneNumberId", "Phone number ID"),
      secret("accessToken", "Access token", {
        hint: "A permanent system-user token with whatsapp_business_messaging.",
      }),
      ...throughputFields(),
    ],
    action: "none",
    where: "Meta Business → WhatsApp → API setup.",
  },
  {
    id: "sms",
    label: "SMS",
    connect: "paste",
    fields: [
      text("accountSid", "Account SID", { placeholder: "AC…" }),
      secret("authToken", "Auth token"),
      optional(
        text("fromNumber", "From number", {
          placeholder: "+14155550100",
          hint: "E.164. Set this or a Messaging Service SID.",
        })
      ),
      optional(
        text("messagingServiceSid", "Messaging Service SID", {
          placeholder: "MG…",
          hint: "Preferred for sends: picks the right sender per country (10DLC, sender pools).",
        })
      ),
      ...throughputFields(),
    ],
    action: "none",
    where: "Twilio Console → Account → API keys & tokens.",
  },
  {
    id: "x",
    label: "X",
    connect: "paste",
    fields: [
      secret("accessToken", "OAuth 2.0 user access token", {
        hint: "Needs dm.write, tweet.read and users.read.",
      }),
      optional(secret("refreshToken", "Refresh token")),
      optional(text("clientId", "Client ID")),
      optional(secret("clientSecret", "Client secret")),
    ],
    action: "none",
    where:
      "X Developer Portal → your app → User authentication. Add the refresh token and client credentials so the token renews itself.",
  },
  {
    id: "farcaster",
    label: "Farcaster",
    connect: "paste",
    fields: [
      secret("neynarApiKey", "Neynar API key"),
      text("signerUuid", "Signer UUID", {
        hint: "The signer must be approved.",
      }),
      optional(
        secret("warpcastApiKey", "Warpcast API key", {
          hint: "Optional. Turns on direct casts.",
        })
      ),
    ],
    action: "none",
    where: "Neynar dashboard → your app → Signers.",
  },

  // Identity
  {
    id: "privy",
    label: "Privy",
    connect: "paste",
    fields: [text("appId", "App ID"), secret("appSecret", "App secret")],
    action: "identity-sync",
    where: "Privy dashboard → App settings → API keys.",
  },
  {
    id: "dynamic",
    label: "Dynamic",
    connect: "paste",
    fields: [
      text("environmentId", "Environment ID"),
      secret("apiToken", "API token"),
    ],
    action: "identity-sync",
    where: "Dynamic dashboard → Developers → API.",
  },
  {
    id: "clerk",
    label: "Clerk",
    connect: "paste",
    fields: [secret("secretKey", "Secret key", { placeholder: "sk_live_…" })],
    action: "identity-sync",
    where: "Clerk dashboard → API keys.",
  },
  {
    id: "magic",
    label: "Magic",
    connect: "paste",
    fields: [secret("secretKey", "Secret key", { placeholder: "sk_live_…" })],
    action: "none",
    where:
      "Magic dashboard → API keys. Sign-ins arrive through the SDK once it is installed.",
  },
  {
    id: "reown",
    label: "Reown",
    connect: "paste",
    fields: [
      text("projectId", "Project ID", { hint: "32 hexadecimal characters." }),
    ],
    action: "none",
    where:
      "Reown Cloud → your project. Sessions arrive through the SDK once it is installed.",
  },
  {
    id: "thirdweb",
    label: "thirdweb",
    connect: "paste",
    fields: [
      secret("secretKey", "Secret key"),
      optional(text("clientId", "Client ID")),
    ],
    action: "none",
    where:
      "thirdweb dashboard → Settings → API keys. Wallets arrive through the SDK.",
  },
  {
    id: "web3auth",
    label: "Web3Auth",
    connect: "paste",
    fields: [text("clientId", "Client ID")],
    action: "none",
    where:
      "Web3Auth dashboard → your project. Logins arrive through the SDK once it is installed.",
  },

  // Analytics and data
  {
    id: "posthog",
    label: "PostHog",
    connect: "paste",
    fields: [
      secret("personalApiKey", "Personal API key"),
      text("projectId", "Project ID"),
      optional(
        text("host", "Host", {
          hint: "us, eu, or your self-hosted https URL. Defaults to us.",
          placeholder: "us",
        })
      ),
    ],
    action: "none",
    where: "PostHog → Settings → Personal API keys (read access).",
  },
  {
    id: "dune",
    label: "Dune",
    connect: "paste",
    fields: [
      secret("apiKey", "API key"),
      text("queryId", "Query ID", { hint: "The number in the query's URL." }),
    ],
    action: "data-sync",
    where: "Dune → Settings → API. The query should return a wallet column.",
  },
  {
    id: "googlesheets",
    label: "Google Sheets",
    connect: "paste",
    fields: [
      text("spreadsheetId", "Spreadsheet ID", {
        hint: "The long id in the sheet's URL. Share the sheet with our service account first.",
      }),
      optional(text("sheetName", "Sheet name", { placeholder: "Sheet1" })),
      optional(text("range", "Range", { placeholder: "A1:Z" })),
    ],
    action: "data-sync",
    route: "google-sheets",
  },

  // Migrations
  {
    id: "mailchimp",
    label: "Mailchimp",
    connect: "paste",
    fields: [
      secret("apiKey", "API key", {
        hint: "Ends in the datacentre, like -us21.",
      }),
    ],
    action: "migrate",
    paging: "rerun",
    where: "Mailchimp → Profile → Extras → API keys.",
  },
  {
    id: "beehiiv",
    label: "beehiiv",
    connect: "paste",
    fields: [
      secret("apiKey", "API key"),
      text("publicationId", "Publication ID", { placeholder: "pub_…" }),
    ],
    action: "migrate",
    paging: "page",
    where: "beehiiv → Settings → API.",
  },
  {
    id: "emailoctopus",
    label: "EmailOctopus",
    connect: "paste",
    fields: [secret("apiKey", "API key", { hint: "A v2 API key." })],
    action: "migrate",
    paging: "rerun",
    where: "EmailOctopus → Integrations & API.",
  },
  {
    id: "kit",
    label: "Kit",
    connect: "paste",
    fields: [secret("apiKey", "API key", { hint: "A v4 API key." })],
    action: "migrate",
    paging: "cursor",
    where: "Kit → Settings → Developer.",
  },
  {
    id: "attio",
    label: "Attio",
    connect: "paste",
    fields: [secret("accessToken", "Access token")],
    action: "migrate",
    paging: "cursor",
    where: "Attio → Workspace settings → Developers.",
  },
  {
    id: "iterable",
    label: "Iterable",
    connect: "paste",
    fields: [
      secret("apiKey", "API key"),
      optional(
        text("region", "Region", { hint: "us or eu.", placeholder: "us" })
      ),
    ],
    action: "migrate-async",
    where: "Iterable → Integrations → API keys (server-side key).",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    connect: "oauth",
    fields: [],
    action: "migrate",
    paging: "cursor",
  },
  {
    id: "salesforce",
    label: "Salesforce",
    connect: "oauth",
    fields: [],
    action: "migrate",
    paging: "cursor",
  },
  {
    id: "intercom",
    label: "Intercom",
    connect: "oauth",
    fields: [],
    action: "migrate",
    paging: "cursor",
  },
];

export const CONNECTORS: ReadonlyMap<string, ConnectorDef> = new Map(
  DEFS.map((d) => [d.id, d])
);

/** Catalog ids that differ from the backend connector id. */
const CATALOG_ALIAS: Record<string, string> = {
  sheets: "googlesheets",
  convertkit: "kit",
};

/** The backend connector behind a catalog source or migration, if one exists. */
export const connectorFor = (catalogId: string): ConnectorDef | null =>
  CONNECTORS.get(CATALOG_ALIAS[catalogId] ?? catalogId) ?? null;
