import { useSyncExternalStore } from 'react';
import type { IconName } from '../components/icons';
import { loadPersisted, savePersisted } from './persist';

/* Data sources (2.7).
 *
 * The organising rule for the whole section: Data is what comes IN, Settings is what goes
 * OUT. Contracts, wallet-auth providers and spreadsheets are inputs. The sending domain and
 * the push SDK are outputs and stay in Settings.
 *
 * Worth stating why this moved at all: contracts were filed under Settings → Account, next
 * to the company name and the billing details. The single most important input to the
 * product was sitting in admin. */

export type SourceKind = 'wallet-auth' | 'file' | 'pipe' | 'chain' | 'product';
export type SourceStatus = 'connected' | 'available' | 'soon';

/* What a source can actually do, which is not a preference and not negotiable.
 *
 * We cannot know what a customer uses, so nothing here is ranked or promoted. But "open to
 * everything" is not the same as "everything is equivalent": a nightly export genuinely
 * cannot fire a Loop the moment someone acts, and letting a person build a win-back journey
 * on one is how it misfires by six hours and we get blamed for it.
 *
 * So each source declares its freshness, and the product says so at connect time. */
export type Freshness = 'live' | 'scheduled' | 'one-off';

export const FRESHNESS: Record<Freshness, { label: string; can: string }> = {
  live: { label: 'Live', can: 'Events arrive as they happen. Loops trigger in real time.' },
  scheduled: { label: 'Scheduled', can: 'Syncs on a schedule. Good for segments and analysis; a Loop built on it fires a sync behind.' },
  'one-off': { label: 'One-off', can: 'A single import. Nothing arrives after it unless you import again.' },
};

/** What a source contributes to the join, which is the thing that decides whether it is worth
 *  connecting at all. Identity is the join key: without one of those, product events and chain
 *  events are two datasets with no way to become one customer. */
export type Lane = 'identity' | 'product' | 'chain' | 'list';

export const LANE_LABEL: Record<Lane, string> = {
  identity: 'Identity', product: 'Product lane', chain: 'On-chain lane', list: 'Contacts',
};

export interface DataSource {
  id: string;
  name: string;
  kind: SourceKind;
  status: SourceStatus;
  freshness: Freshness;
  lane: Lane;
  /** What it actually gives us — the reason to connect it, in one line. */
  gives: string;
  /** Alternative spellings people type when searching. */
  aka?: string[];
  /** The vendor's own domain, which is where its icon comes from. Absent for anything we
   *  build ourselves — those use the product's own mark. */
  domain?: string;
  /* Who wrote the integration.
   *
   * Worth stating per-source rather than assuming. A connector we maintain and one the vendor
   * maintains fail differently and get fixed on different timescales, and the person deciding
   * whether to depend on it should be able to see which they are looking at. */
  by?: string;
  /** Longer than `gives` — what the detail page leads with. */
  about?: string;
  /** What actually happens once it is connected, as steps rather than prose. */
  how?: string[];
  /** What the person has to do at their end, written for whoever does the integration. */
  configure?: string;
}

/** Source directories read as a menu unless they are honest about scale, so the categories
 *  carry their own counts and the search covers everything at once. */
export const sourceCount = (k: SourceKind) => SOURCES.filter((s) => s.kind === k).length;

export const SOURCE_KINDS: { id: SourceKind; label: string; desc: string; icon: IconName }[] = [
  { id: 'wallet-auth', label: 'Wallet & identity', icon: 'fingerprint',
    desc: 'Where the wallet↔email link comes from. Connect the provider your dApp already signs people in with and the links arrive already consented.' },
  { id: 'chain', label: 'On-chain', icon: 'network',
    desc: 'Contracts we index for holders and activity. These are the behavioural triggers everything else is built on.' },
  { id: 'file', label: 'Files & sheets', icon: 'clipboard-list',
    desc: 'One-off and recurring imports for lists you already hold elsewhere.' },
  { id: 'product', label: 'Product analytics', icon: 'square-mouse-pointer',
    desc: 'Where the product lane comes from. These tools already record what people do in your app. Connecting one is reading work you have already done, not new instrumentation.' },
  { id: 'pipe', label: 'Pipes', icon: 'arrow-left-right',
    desc: 'Continuous feeds from tools that already know your users.' },
];

export const SOURCES: DataSource[] = [
  /* Wallet auth — the join key, and the reason these are not just another category. Product
     analytics keys on a user id; the chain keys on an address. Without one of these, those
     are two datasets that can never become one customer. */
  { id: 'privy', domain: 'privy.io', name: 'Privy', kind: 'wallet-auth', status: 'available', freshness: 'live', lane: 'identity', gives: 'Email and social logins already linked to embedded wallets',
    by: 'Privy',
    about: 'Privy signs people into your dApp with an email, a social account or a wallet, and keeps the link between them. That link is the join key this product is built on. Without it, product events and on-chain events are two datasets about the same person with no way to become one record.',
    how: ['We read your Privy app\'s users and the wallets linked to each.', 'Linked emails arrive with the consent Privy already captured, so nothing has to be re-collected.', 'New sign-ins appear here within seconds, so a Loop can fire on a first connect.'],
    configure: 'In Privy\'s dashboard, create a read-only API key for your app and paste it here. Nothing is written back to Privy.' },
  { id: 'dynamic', domain: 'dynamic.xyz', name: 'Dynamic', kind: 'wallet-auth', status: 'available', freshness: 'live', lane: 'identity', gives: 'Wallet sessions with verified email and social handles',
    by: 'Dynamic',
    about: 'Dynamic handles wallet sessions and verifies emails and social handles alongside them. Connecting it means every wallet that has ever signed in arrives with whatever identity it carried.',
    how: ['We read your environment\'s users, wallets and verified contact details.', 'Sessions stream as they happen.', 'Verification status travels with the record, so you can segment on it.'],
    configure: 'Create a read-only API token in Dynamic\'s dashboard under Developers, and paste it here.' },
  { id: 'web3auth', domain: 'web3auth.io', name: 'Web3Auth', kind: 'wallet-auth', status: 'available', freshness: 'live', lane: 'identity', gives: 'Social login → wallet mapping, with the proof intact' },
  { id: 'reown', domain: 'reown.com', name: 'Reown', kind: 'wallet-auth', status: 'available', freshness: 'live', lane: 'identity', aka: ['WalletConnect'], gives: 'Connected sessions across every wallet that speaks WalletConnect' },
  { id: 'magic', domain: 'magic.link', name: 'Magic', kind: 'wallet-auth', status: 'soon', freshness: 'live', lane: 'identity', gives: 'Email-first wallets for people who never held a seed phrase' },
  { id: 'thirdweb', domain: 'thirdweb.com', name: 'thirdweb', kind: 'wallet-auth', status: 'soon', freshness: 'live', lane: 'identity', gives: 'In-app wallets plus the contracts they were minted from' },
  { id: 'clerk', domain: 'clerk.com', name: 'Clerk', kind: 'wallet-auth', status: 'soon', freshness: 'live', lane: 'identity', gives: 'Accounts and sessions for apps whose login is not wallet-first' },

  // Chain
  { id: 'contracts', name: 'Your contracts', kind: 'chain', status: 'connected', freshness: 'live', lane: 'chain', aka: ['smart contract', 'ABI', 'etherscan'], gives: 'Holders, transfers, stakes and every trigger Loops fire on',
    by: 'OnchainSuite',
    about: 'The contracts you index are where every behavioural trigger comes from. A contract we do not index is a wallet we cannot segment, score or message about.',
    how: ['Paste an address, a deployer wallet, an explorer link or your website.', 'We fetch the ABI, read the holder list, and index the events you tick.', 'Holders and activity are available within minutes of indexing.'],
    configure: 'Nothing to configure at your end. We read public chain data.' },
  { id: 'dune', domain: 'dune.com', name: 'Dune', kind: 'chain', status: 'soon', freshness: 'scheduled', lane: 'chain', gives: 'Query results as a recurring audience: bring your own SQL' },

  /* Product analytics — work the customer has already done. Connecting one of these is the
     difference between a five-minute setup and an engineering ticket. */
  { id: 'segment', domain: 'segment.com', name: 'Segment', kind: 'product', status: 'available', freshness: 'live', lane: 'product', aka: ['twilio segment', 'cdp'], gives: 'Every event you already define, streamed as it happens',
    by: 'OnchainSuite',
    about: 'Segment already carries every event you have defined. Connecting it is reading work you have done rather than instrumenting anything new. Which is usually the difference between a five-minute setup and an engineering ticket.',
    how: ['You add OnchainSuite as a destination in your Segment workspace.', 'Events stream to us as they happen, with their properties intact.', 'Identify calls become the wallet↔person link where they carry one.'],
    configure: 'In Segment, go to Connections → Destinations → Add, search for OnchainSuite, and paste the write key shown here.' },
  { id: 'posthog', domain: 'posthog.com', name: 'PostHog', kind: 'product', status: 'available', freshness: 'live', lane: 'product', gives: 'Product events and person profiles, cloud or self-hosted',
    by: 'OnchainSuite',
    about: 'PostHog holds your product events and person profiles. We read them rather than asking you to send the same events twice.',
    how: ['We pull events and person properties from your project.', 'Cloud and self-hosted both work. Self-hosted needs the instance URL.', 'Events arrive live, so Loops can trigger on them.'],
    configure: 'In PostHog, create a personal API key with read access to events and persons, then paste it with your project ID.' },
  { id: 'mixpanel', domain: 'mixpanel.com', name: 'Mixpanel', kind: 'product', status: 'available', freshness: 'scheduled', lane: 'product', gives: 'Events and user profiles, synced from your project',
    by: 'OnchainSuite',
    about: 'Mixpanel\'s export API is a scheduled read rather than a stream, which is the one thing worth knowing before you build on it: a Loop triggered from Mixpanel data fires on the sync, not on the action.',
    how: ['We sync events and user profiles from your project on a schedule.', 'The window is configurable; the default is hourly.', 'Segments and analysis are unaffected. Only trigger latency is.'],
    configure: 'In Mixpanel, create a service account with read access to your project and paste the credentials here.' },
  { id: 'amplitude', domain: 'amplitude.com', name: 'Amplitude', kind: 'product', status: 'available', freshness: 'scheduled', lane: 'product', aka: ['amp'], gives: 'Events and behavioural cohorts, synced from your project' },
  { id: 'rudderstack', domain: 'rudderstack.com', name: 'RudderStack', kind: 'product', status: 'soon', freshness: 'live', lane: 'product', gives: 'Warehouse-first CDP events, streamed' },
  { id: 'sdk', name: 'Our SDK', kind: 'product', status: 'available', freshness: 'live', lane: 'product', aka: ['track', 'javascript', 'custom events'], gives: 'track() from your own app: custom events, no limits, needs an engineer',
    by: 'OnchainSuite',
    about: 'Our own SDK, for events no third party is recording. One function call, any properties you like, and no vendor between you and the data.',
    how: ['You call track() from your app with an event name and properties.', 'Events arrive immediately and are available to Loops and segments.', 'Identify calls link the event to a wallet or an email.'],
    configure: 'Install the package, call identify() when someone signs in, and track() wherever something happens worth acting on.' },

  // Files
  { id: 'csv', name: 'CSV upload', kind: 'file', status: 'connected', freshness: 'one-off', lane: 'list', aka: ['spreadsheet', 'excel'], gives: 'A one-off list, imported into a destination you choose',
    by: 'OnchainSuite',
    about: 'A spreadsheet you already hold. Imported once, into a destination you choose.',
    how: ['Upload a file with a wallet or email column.', 'You map the columns and pick the list it lands in.', 'Nothing arrives after the import unless you import again.'],
    configure: 'Any .csv or .tsv with a header row.' },
  { id: 'sheets', domain: 'google.com', name: 'Google Sheets', kind: 'file', status: 'available', freshness: 'scheduled', lane: 'list', gives: 'A sheet that re-syncs on a schedule, for lists a team maintains by hand' },

  // Pipes
  { id: 'zapier', domain: 'zapier.com', name: 'Zapier', kind: 'pipe', status: 'available', freshness: 'live', lane: 'product', gives: 'Everything else: 6,000 apps, no engineering' },
  { id: 'webhook-in', name: 'Inbound webhook', kind: 'pipe', status: 'available', freshness: 'live', lane: 'product', aka: ['http', 'post', 'api'], gives: 'Post events straight from your backend',
    by: 'OnchainSuite',
    about: 'Every tool in the world can POST to a URL. This is the route that exists for the ones we have never heard of.',
    how: ['You post JSON to a URL we give you.', 'Events validate against the same rules as the SDK.', 'Anything that can send an HTTP request can send events.'],
    configure: 'Post to the endpoint shown after connecting, with the signing secret in the header.' },
];

/** Match on name, alias and what it gives, so someone typing "cdp" or "excel" finds something. */
export function searchSources(q: string): DataSource[] {
  const t = q.trim().toLowerCase();
  if (!t) return SOURCES;
  return SOURCES.filter((s) => [s.name, ...(s.aka ?? []), s.gives]
    .some((v) => v.toLowerCase().includes(t)));
}

export const sourcesOfKind = (k: SourceKind) => SOURCES.filter((s) => s.kind === k);

/* Setup instructions live at versioned URLs, not pasted into the UI or an email.
 *
 * Copied from OneSignal, who point a coding agent at a markdown file in their own repo
 * rather than inlining a wall of prompt text. Ours change whenever a third-party API does —
 * Apple's APNs, the X developer portal — and this way fixing them does
 * not mean shipping the app. */
export const SETUP_DOC_BASE = 'onchainsuite.xyz/setup';
export const setupDocUrl = (id: string) => `https://${SETUP_DOC_BASE}/${id}.md`;

/* Typing a tool we have never heard of.
 *
 * This is the most valuable thing on the Sources screen, and the easiest to throw away. The
 * names people type into that box are the only honest ranking of what to integrate next —
 * better than any roadmap vote, because the person typing has the data in hand and a reason
 * to move it today.
 *
 * A dead end that says "no results" loses it twice: we never learn the name, and the person
 * concludes the product cannot take their data. It almost always can. What it cannot do is
 * take it from *that tool* in one click. Those are very different sentences and only one of
 * them ends the evaluation.
 *
 * So a miss records the name and offers the two routes that work for every tool that will
 * ever exist. */
const REQUEST_KEY = 'ons.source-requests';

let requested: string[] = loadPersisted<string[]>(REQUEST_KEY, []);
const reqSubs = new Set<() => void>();

function emitRequests() {
  savePersisted(REQUEST_KEY, requested);
  reqSubs.forEach((f) => f());
}

/** Record a tool nobody can connect yet. Deduped case-insensitively — "heap", "Heap" and
 *  "HEAP " are one request, not three, or the count we use to prioritise is noise. */
export function requestSource(name: string): boolean {
  const v = name.trim().replace(/\s+/g, ' ');
  if (!v || v.length > 60) return false;
  if (requested.some((r) => r.toLowerCase() === v.toLowerCase())) return false;
  requested = [...requested, v];
  emitRequests();
  return true;
}

export function useRequestedSources(): string[] {
  return useSyncExternalStore(
    (f) => { reqSubs.add(f); return () => reqSubs.delete(f); },
    () => requested,
  );
}

/* The two universal routes.
 *
 * Every tool in the world can POST to a URL, and every app can call a function. These are
 * what "open to everything" actually means in software — the integrations above are
 * shortcuts past them, not the only way in. They are listed last because they need an
 * engineer, and first-run should not start with an engineering ticket if a one-click path
 * exists. */
export const FALLBACK_IDS = ['webhook-in', 'sdk'] as const;
export const fallbackSources = (): DataSource[] =>
  FALLBACK_IDS.map((id) => SOURCES.find((s) => s.id === id)).filter((s): s is DataSource => !!s);

/* Coming from somewhere else.
 *
 * Connecting a source and migrating off a tool are different jobs with different anxieties.
 * A source is something you add; a migration is something you leave — the question is not
 * "what does this give me" but "what comes across, and what do I lose".
 *
 * So this list answers that per tool rather than offering a uniform "Migrate" button that
 * means something different for each one. A tool nobody can export contacts from cannot be
 * migrated and saying so up front is cheaper than finding out at step four.
 */
export interface Migration {
  id: string;
  name: string;
  /** What actually comes across. Named per tool because it genuinely differs. */
  brings: string;
  /** What does not, stated rather than discovered. */
  leaves?: string;
}

export const MIGRATIONS: Migration[] = [
  { id: 'mailchimp', name: 'Mailchimp', brings: 'Audiences, tags, and subscribe/unsubscribe status', leaves: 'Campaign history stays in Mailchimp. Reports do not transfer' },
  { id: 'klaviyo', name: 'Klaviyo', brings: 'Profiles, lists, segments and consent records' },
  { id: 'customerio', name: 'Customer.io', brings: 'People, attributes and segment definitions', leaves: 'Running campaigns have to be rebuilt as Loops' },
  { id: 'braze', name: 'Braze', brings: 'Users, custom attributes and subscription groups' },
  { id: 'iterable', name: 'Iterable', brings: 'Users, lists and unsubscribe state' },
  { id: 'hubspot', name: 'HubSpot', brings: 'Contacts, lists and marketing email consent', leaves: 'Deals, tickets and pipelines have no equivalent here' },
  { id: 'intercom', name: 'Intercom', brings: 'Contacts, tags and email subscription status', leaves: 'Conversations stay in Intercom' },
  { id: 'convertkit', name: 'Kit (ConvertKit)', brings: 'Subscribers, tags and sequences as draft Loops' },
  { id: 'beehiiv', name: 'beehiiv', brings: 'Subscribers and their subscription status' },
  { id: 'substack', name: 'Substack', brings: 'The subscriber export, as a contact list' },
  { id: 'paragraph', name: 'Paragraph', brings: 'Subscribers and the wallets linked to them' },
  { id: 'mirror', name: 'Mirror', brings: 'Subscribers and collector addresses' },
  { id: 'attio', name: 'Attio', brings: 'People and companies, as contacts with attributes' },
  { id: 'salesforce', name: 'Salesforce', brings: 'Contacts, leads and campaign membership', leaves: 'Opportunities and reports do not transfer' },
];

export const searchMigrations = (q: string): Migration[] => {
  const t = q.trim().toLowerCase();
  if (!t) return MIGRATIONS;
  return MIGRATIONS.filter((m) => (m.name + ' ' + m.brings).toLowerCase().includes(t));
};
