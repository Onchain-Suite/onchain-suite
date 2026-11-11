/*
 * The public Developer API, as the reference in the API tab lists it. Static:
 * it mirrors notes/product/docs-developer-api.md in the backend (the source for
 * docs.onchainsuite.com), so an endpoint is added here when it ships there.
 */

export const API_BASE_URL = "https://api.onchainsuite.com/api/v1";
export const AUTH_HEADER = "Authorization: Bearer sk_live_…";

/** The header every delivery carries. Verified against the RAW body. */
export const SIGNATURE_HEADER =
  'X-OnChain-Signature: t=<unix>,v1=HMAC_SHA256(secret, "<t>.<rawBody>")';

export type ApiMethod = "GET" | "POST";

export interface ApiEndpoint {
  /** Stable id, also the React key. */
  id: string;
  group: string;
  method: ApiMethod;
  path: string;
  /** A `read_only` key is rejected with 403 on a write route. */
  scope: "read" | "write";
  summary: string;
  /** What to know before calling it, one line each. */
  notes?: string[];
  /** Example query string for a GET, without the leading `?`. */
  query?: string;
  /** Example JSON body for a POST. */
  body?: unknown;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "identify",
    group: "Contacts",
    method: "POST",
    path: "/identify",
    scope: "write",
    summary: "Link a wallet to the workspace, creating the contact if new.",
    notes: [
      "Wallet addresses only. It rejects email, phone or any other personal identifier: sending one would hand you the wallet-to-identity mapping your subscribers were told you cannot see.",
    ],
    body: { walletAddress: "0x…" },
  },
  {
    id: "contacts",
    group: "Contacts",
    method: "GET",
    path: "/contacts",
    scope: "read",
    summary: "List contacts with their tags and channel reachability.",
    notes: ["limit is at most 200."],
    query: "page=1&limit=20",
  },
  {
    id: "events",
    group: "Events",
    method: "POST",
    path: "/events",
    scope: "write",
    summary:
      "Send one event. Events start Loops and build a contact's activity.",
    notes: [
      "The event name is the field `event`: lowercase letters, digits and _ . : - up to 64 characters.",
      "`contact` is required and needs at least one of walletAddress, email or externalId.",
      "An event only does something downstream if a Loop is listening for that name. Otherwise it is recorded on the contact's timeline.",
    ],
    body: {
      event: "swap_executed",
      contact: { walletAddress: "0x…" },
      payload: { pair: "ETH/USDC", amountUsd: 250 },
    },
  },
  {
    id: "events-batch",
    group: "Events",
    method: "POST",
    path: "/events/batch",
    scope: "write",
    summary: "Send up to 100 events in one call, each in the same shape.",
    body: {
      events: [{ event: "swap_executed", contact: { walletAddress: "0x…" } }],
    },
  },
  {
    id: "inapp-push",
    group: "Messages",
    method: "POST",
    path: "/inapp/push",
    scope: "write",
    summary: "Queue an in-app message for a wallet.",
    notes: [
      "Delivered at once if the wallet is connected through the SDK. Otherwise it waits and is picked up on the next connect.",
      "`deliveredNow: false` in the response means queued, not failed.",
    ],
    body: {
      walletAddress: "0x…",
      title: "Welcome",
      body: "You are all set.",
    },
  },
  {
    id: "messages-pending",
    group: "Messages",
    method: "GET",
    path: "/messages/pending",
    scope: "read",
    summary: "Read the in-app messages queued for a wallet.",
    notes: [
      "For backend consumers. The browser SDK receives pushes over a WebSocket and does not call this.",
    ],
    query: "wallet=0x…",
  },
  {
    id: "campaign-send",
    group: "Campaigns",
    method: "POST",
    path: "/campaigns/:id/send",
    scope: "write",
    summary: "Send a campaign prepared in the dashboard to its audience.",
    notes: [
      "This launches a real send on a live key. A test key validates and returns without sending.",
    ],
  },
];
