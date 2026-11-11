import type { ConnectorDef } from "../types/connectors";
import { optional, secret, text } from "./connector-fields";

/**
 * The tools we can migrate from, with the exact credential fields each
 * backend verifier reads (onchain-backend `connections/connectors/sources/
 * migration/**`). `migrate` runs slice by slice in the background;
 * `migrate-async` is one background export the tool prepares for us.
 *
 * `paging` only matters to the in-browser loop kept for a server with no
 * background runs: it says how that loop asks for the next slice.
 */
export const MIGRATION_CONNECTORS: ConnectorDef[] = [
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
  {
    id: "klaviyo",
    label: "Klaviyo",
    connect: "paste",
    fields: [
      secret("apiKey", "Private API key", {
        hint: "Starts with pk_. It needs read access to profiles.",
        placeholder: "pk_…",
      }),
    ],
    action: "migrate",
    paging: "cursor",
    where: "Klaviyo → Settings → API keys → Create private API key.",
  },
  {
    id: "paragraph",
    label: "Paragraph",
    connect: "paste",
    fields: [secret("apiKey", "API key")],
    action: "migrate",
    paging: "cursor",
    where: "app.paragraph.com → Settings → API keys.",
  },
  {
    id: "customerio",
    label: "Customer.io",
    connect: "paste",
    fields: [
      secret("apiKey", "App API key", {
        hint: "The App API key with export access, not a Track key.",
      }),
      text("segmentId", "Segment ID", {
        hint: "The segment whose people to bring across.",
      }),
      optional(
        text("region", "Region", { hint: "us or eu.", placeholder: "us" })
      ),
    ],
    action: "migrate-async",
    where: "Customer.io → Account settings → API credentials → App API keys.",
  },
  {
    id: "braze",
    label: "Braze",
    connect: "paste",
    fields: [
      text("baseUrl", "REST endpoint", {
        placeholder: "https://rest.iad-01.braze.com",
        hint: "Your Braze REST endpoint.",
      }),
      secret("apiKey", "REST API key", {
        hint: "It needs segments.list and users.export.segment.",
      }),
      text("segmentId", "Segment ID", {
        hint: "The segment whose users to bring across.",
      }),
    ],
    action: "migrate-async",
    where: "Braze → Settings → APIs and identifiers.",
  },
];
