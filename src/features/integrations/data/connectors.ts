import type { ConnectorDef } from "../types/connectors";
import { optional, secret, text, throughputFields } from "./connector-fields";
import { MIGRATION_CONNECTORS } from "./migration-connectors";

/**
 * Every connector the backend can verify today, with the exact credential
 * fields its verifier reads (onchain-backend `connections/connectors/**`,
 * staging 2026-10-22). Static, because the server's own directory route
 * (`GET /organization/connections/available`) is not on staging yet.
 *
 * A catalog entry with no connector here has no backend, and the UI says so
 * instead of pretending to connect it.
 */

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
      optional(
        text("miniAppDomain", "Mini App domain", {
          hint: "Optional. The domain in your farcaster.json, e.g. app.example.xyz. Turns on notifications; their links must be on it.",
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
    scheduled: true,
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
    scheduled: true,
    where: "Dynamic dashboard → Developers → API.",
  },
  {
    id: "clerk",
    label: "Clerk",
    connect: "paste",
    fields: [secret("secretKey", "Secret key", { placeholder: "sk_live_…" })],
    action: "identity-sync",
    scheduled: true,
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
  {
    id: "formo",
    label: "Formo",
    connect: "paste",
    fields: [
      secret("apiKey", "Workspace API key", {
        hint: "It needs the profiles:read scope.",
      }),
    ],
    action: "identity-sync",
    where: "Formo → Team settings → API.",
  },

  // Onchain
  {
    id: "subgraph",
    label: "Subgraph",
    connect: "paste",
    fields: [
      text("subgraphUrl", "Subgraph URL", {
        placeholder: "https://…",
        hint: "Your GraphQL subgraph endpoint.",
      }),
      text("entity", "Entity", {
        placeholder: "swaps",
        hint: "The collection to read.",
      }),
      text("walletField", "Wallet field", {
        placeholder: "sender",
        hint: "The address field on that entity.",
      }),
    ],
    action: "identity-sync",
    where: "Each distinct address in that field becomes a contact.",
  },
  {
    id: "rpc",
    label: "Your RPC endpoint",
    connect: "paste",
    fields: [
      text("rpcUrl", "RPC URL", {
        placeholder: "https://…",
        hint: "Your EVM JSON-RPC endpoint, on any chain.",
      }),
      text("contractAddress", "Contract address", { placeholder: "0x…" }),
      optional(
        text("startBlock", "Start block", {
          placeholder: "e.g. 18500000",
          hint: "Optional. Leave blank and we find the block the contract was deployed at. Set it if your endpoint does not keep old state.",
        })
      ),
    ],
    action: "data-sync",
    scheduled: true,
    where:
      "Reads the contract's event logs from its first block and adds every wallet in them. After that, new blocks are read every 6 hours.",
  },

  ...MIGRATION_CONNECTORS,
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
