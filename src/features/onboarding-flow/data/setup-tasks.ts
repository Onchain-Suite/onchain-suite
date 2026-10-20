/**
 * Setup handoff tasks (v2.7 onboarding revamp).
 *
 * Every channel we sell needs credentials the person evaluating the product usually does not
 * have: email needs the registrar, push needs a deploy, X needs the developer portal. That is
 * three different people on a normal team, none of them the growth lead who just finished
 * onboarding. So the technical step lets them hand it to whoever will do it.
 *
 * The instructions live here, not in the component, because the same text serves three surfaces:
 * the preview shown before sending, the invite itself, and the pending state in the workspace.
 * Pure data, server-safe.
 */

export type HandoffChannel = "email" | "push" | "x";

/** Icon key for a task card; mapped to a Heroicon by the step component. */
export type HandoffIcon = "email" | "push" | "x";

export interface SetupTask {
  id: HandoffChannel;
  label: string;
  icon: HandoffIcon;
  /** Who on the team can actually do this: the reason the handoff exists. */
  who: string;
  /** Honest estimate. A dev deciding whether to context-switch needs it. */
  minutes: number;
  /** What they have to do, in order. */
  steps: string[];
  /** The thing people get wrong, stated up front rather than discovered later. */
  gotcha: string;
  /** The signal that flips this to connected, in the words of the thing we poll for. */
  watching: string;
}

export const SETUP_TASKS: SetupTask[] = [
  {
    id: "email",
    label: "Email sending domain",
    icon: "email",
    who: "whoever manages your DNS",
    minutes: 10,
    steps: [
      "Open your DNS provider (Cloudflare, Namecheap, Route 53, wherever the domain lives).",
      "Add the three DKIM CNAME records. Paste only the Host shown: most providers add the domain for you, and adding it twice puts the record on the wrong host.",
      "Add the MX and SPF TXT records on the bounce host. If that host already has an SPF record, merge the include into it. Do not add a second one.",
      "Add the DMARC TXT record and save. Records usually resolve within an hour.",
    ],
    gotcha:
      "A domain may only have one SPF record. Two will fail both, and email silently lands in spam rather than bouncing.",
    watching: "a DNS lookup every 15 minutes, until every record resolves",
  },
  {
    id: "push",
    label: "In-app push SDK",
    icon: "push",
    who: "a frontend engineer with deploy access",
    minutes: 20,
    steps: [
      "Add the OnchainSuite script tag to your dApp, or install @onchainsuite/web.",
      "Call os.identify({ wallet }) once a wallet connects.",
      "Deploy to the origin you allowlisted.",
    ],
    gotcha:
      "identify() takes a wallet address only. It rejects email and other personal identifiers by design, because we must never hold the wallet to identity mapping.",
    watching: "the first event from the SDK on your domain",
  },
  {
    id: "x",
    label: "X DM access",
    icon: "x",
    who: "whoever owns the X developer account",
    minutes: 15,
    steps: [
      "Create an app in the X developer portal.",
      "Enable OAuth 2.0 and request the dm.write scope.",
      "Authorise it against the account you send from.",
    ],
    gotcha:
      "X only permits DMs to accounts that follow you. No API tier changes this, so authorising the app does not by itself make anyone reachable.",
    watching:
      "the OAuth callback, then the first follower with a linked wallet",
  },
];

export const taskById = (id: HandoffChannel): SetupTask =>
  SETUP_TASKS.find((t) => t.id === id) ?? SETUP_TASKS[0];

/** Total time asked of the recipient, stated before you send: a handoff that hides its own cost
 *  is how it ends up ignored. */
export const totalMinutes = (ids: HandoffChannel[]): number =>
  ids.reduce((a, id) => a + taskById(id).minutes, 0);
