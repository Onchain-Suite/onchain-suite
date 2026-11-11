import type { Migration, MigrationCategory } from "../types/sources";

/** Category filter for the Migrate tab, in display order. */
export const MIGRATION_CATEGORIES: {
  id: MigrationCategory;
  label: string;
}[] = [
  { id: "email", label: "Email & newsletters" },
  { id: "lifecycle", label: "Lifecycle & messaging" },
  { id: "crm", label: "CRM" },
  { id: "web3", label: "Web3 publishing" },
  { id: "file", label: "Files" },
];

/** Said once for every migration, beside the list and again before one starts. */
export const MIGRATION_CONSENT =
  "Nothing is sent to anyone as part of a migration, and anyone unsubscribed where they came from stays unsubscribed here.";

/**
 * Tools people migrate off, with what comes across and what does not. Static
 * data; the ones with a backend importer are in ./connectors.ts.
 */
export const MIGRATIONS: Migration[] = [
  {
    id: "mailchimp",
    domain: "mailchimp.com",
    name: "Mailchimp",
    category: "email",
    brings: "Audiences, tags, and subscribe/unsubscribe status",
    leaves: "Campaign history stays in Mailchimp. Reports do not transfer",
  },
  {
    id: "klaviyo",
    domain: "klaviyo.com",
    name: "Klaviyo",
    category: "lifecycle",
    brings: "Profiles, lists, segments and consent records",
  },
  {
    id: "customerio",
    domain: "customer.io",
    name: "Customer.io",
    category: "lifecycle",
    brings: "People, attributes and segment definitions",
    leaves: "Running campaigns have to be rebuilt as Loops",
  },
  {
    id: "braze",
    domain: "braze.com",
    name: "Braze",
    category: "lifecycle",
    brings: "Users, custom attributes and subscription groups",
  },
  {
    id: "iterable",
    domain: "iterable.com",
    name: "Iterable",
    category: "lifecycle",
    brings: "Users, lists and unsubscribe state",
  },
  {
    id: "hubspot",
    domain: "hubspot.com",
    name: "HubSpot",
    category: "crm",
    brings: "Contacts, lists and marketing email consent",
    leaves: "Deals, tickets and pipelines have no equivalent here",
  },
  {
    id: "intercom",
    domain: "intercom.com",
    name: "Intercom",
    category: "lifecycle",
    brings: "Contacts, tags and email subscription status",
    leaves: "Conversations stay in Intercom",
  },
  {
    id: "convertkit",
    domain: "kit.com",
    name: "Kit (ConvertKit)",
    category: "email",
    brings: "Subscribers, tags and sequences as draft Loops",
  },
  {
    id: "beehiiv",
    domain: "beehiiv.com",
    name: "beehiiv",
    category: "email",
    brings: "Subscribers and their subscription status",
  },
  {
    id: "substack",
    domain: "substack.com",
    name: "Substack",
    category: "email",
    brings: "The subscriber export, as a contact list",
  },
  {
    id: "paragraph",
    domain: "paragraph.com",
    name: "Paragraph",
    category: "web3",
    brings: "Subscribers and the wallets linked to them",
  },
  {
    id: "mirror",
    domain: "mirror.xyz",
    name: "Mirror",
    category: "web3",
    brings: "Subscribers and collector addresses",
  },
  {
    id: "emailoctopus",
    domain: "emailoctopus.com",
    name: "EmailOctopus",
    category: "email",
    brings: "Lists and subscribers, with their subscription status",
  },
  {
    id: "attio",
    domain: "attio.com",
    name: "Attio",
    category: "crm",
    brings: "People and companies, as contacts with attributes",
  },
  {
    id: "salesforce",
    domain: "salesforce.com",
    name: "Salesforce",
    category: "crm",
    brings: "Contacts, leads and campaign membership",
    leaves: "Opportunities and reports do not transfer",
  },
  {
    id: "csv",
    name: "CSV file",
    category: "file",
    brings: "Any export with a wallet or email column, one row per contact",
  },
];
