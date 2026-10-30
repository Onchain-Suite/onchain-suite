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
];

/**
 * Tools people migrate off, with what comes across and what does not. Static
 * data; the ones with a backend importer are in ./connectors.ts.
 */
export const MIGRATIONS: Migration[] = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    category: "email",
    brings: "Audiences, tags, and subscribe/unsubscribe status",
    leaves: "Campaign history stays in Mailchimp. Reports do not transfer",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    category: "lifecycle",
    brings: "Profiles, lists, segments and consent records",
  },
  {
    id: "customerio",
    name: "Customer.io",
    category: "lifecycle",
    brings: "People, attributes and segment definitions",
    leaves: "Running campaigns have to be rebuilt as Loops",
  },
  {
    id: "braze",
    name: "Braze",
    category: "lifecycle",
    brings: "Users, custom attributes and subscription groups",
  },
  {
    id: "iterable",
    name: "Iterable",
    category: "lifecycle",
    brings: "Users, lists and unsubscribe state",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    brings: "Contacts, lists and marketing email consent",
    leaves: "Deals, tickets and pipelines have no equivalent here",
  },
  {
    id: "intercom",
    name: "Intercom",
    category: "lifecycle",
    brings: "Contacts, tags and email subscription status",
    leaves: "Conversations stay in Intercom",
  },
  {
    id: "convertkit",
    name: "Kit (ConvertKit)",
    category: "email",
    brings: "Subscribers, tags and sequences as draft Loops",
  },
  {
    id: "beehiiv",
    name: "beehiiv",
    category: "email",
    brings: "Subscribers and their subscription status",
  },
  {
    id: "substack",
    name: "Substack",
    category: "email",
    brings: "The subscriber export, as a contact list",
  },
  {
    id: "paragraph",
    name: "Paragraph",
    category: "web3",
    brings: "Subscribers and the wallets linked to them",
  },
  {
    id: "mirror",
    name: "Mirror",
    category: "web3",
    brings: "Subscribers and collector addresses",
  },
  {
    id: "emailoctopus",
    name: "EmailOctopus",
    category: "email",
    brings: "Lists and subscribers, with their subscription status",
  },
  {
    id: "attio",
    name: "Attio",
    category: "crm",
    brings: "People and companies, as contacts with attributes",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    brings: "Contacts, leads and campaign membership",
    leaves: "Opportunities and reports do not transfer",
  },
];
