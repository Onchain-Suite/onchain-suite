import type { Migration } from "../types/sources";

/**
 * Tools people migrate off, with what comes across and what does not. Static
 * data; the ones with a backend importer are in ./connectors.ts.
 */
export const MIGRATIONS: Migration[] = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    brings: "Audiences, tags, and subscribe/unsubscribe status",
    leaves: "Campaign history stays in Mailchimp. Reports do not transfer",
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    brings: "Profiles, lists, segments and consent records",
  },
  {
    id: "customerio",
    name: "Customer.io",
    brings: "People, attributes and segment definitions",
    leaves: "Running campaigns have to be rebuilt as Loops",
  },
  {
    id: "braze",
    name: "Braze",
    brings: "Users, custom attributes and subscription groups",
  },
  {
    id: "iterable",
    name: "Iterable",
    brings: "Users, lists and unsubscribe state",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    brings: "Contacts, lists and marketing email consent",
    leaves: "Deals, tickets and pipelines have no equivalent here",
  },
  {
    id: "intercom",
    name: "Intercom",
    brings: "Contacts, tags and email subscription status",
    leaves: "Conversations stay in Intercom",
  },
  {
    id: "convertkit",
    name: "Kit (ConvertKit)",
    brings: "Subscribers, tags and sequences as draft Loops",
  },
  {
    id: "beehiiv",
    name: "beehiiv",
    brings: "Subscribers and their subscription status",
  },
  {
    id: "substack",
    name: "Substack",
    brings: "The subscriber export, as a contact list",
  },
  {
    id: "paragraph",
    name: "Paragraph",
    brings: "Subscribers and the wallets linked to them",
  },
  {
    id: "mirror",
    name: "Mirror",
    brings: "Subscribers and collector addresses",
  },
  {
    id: "emailoctopus",
    name: "EmailOctopus",
    brings: "Lists and subscribers, with their subscription status",
  },
  {
    id: "attio",
    name: "Attio",
    brings: "People and companies, as contacts with attributes",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    brings: "Contacts, leads and campaign membership",
    leaves: "Opportunities and reports do not transfer",
  },
];
