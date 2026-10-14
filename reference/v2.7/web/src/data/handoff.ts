import type { IconName } from '../components/icons';

/* Setup handoff.
 *
 * Every channel we sell needs credentials the person evaluating the product usually does
 * not have. Email needs the registrar. Push needs a deploy. X needs the developer portal.
 * That is three different people
 * on a normal team, and none of them is the growth lead who just finished onboarding.
 *
 * Before this, every one of those ended at the same instruction — "Data → Channels"
 * — which is a dead end when it is not your login. So the product stops pretending the
 * evaluator will do it, and lets them hand it to whoever will, in one message, tracked.
 *
 * The instructions live here rather than in the component because the same text has to
 * serve three surfaces: the preview shown before sending, the email itself, and the pending
 * state in the workspace. Three copies of setup steps would drift within a release. */

export type HandoffChannel = 'email' | 'push' | 'x';

export interface SetupTask {
  id: HandoffChannel;
  label: string;
  icon: IconName;
  /** Who on the team can actually do this — the reason the handoff exists. */
  who: string;
  /** Honest estimate. A dev deciding whether to context-switch needs it. */
  minutes: number;
  /** What they have to do, in order. */
  steps: string[];
  /** The thing people get wrong, stated up front rather than discovered later. */
  gotcha: string;
  /** The signal that flips this to connected, in the words of the thing we are polling for.
   *  A handoff is the one screen where you cannot check the work yourself, so the honest
   *  thing to show is what we are watching rather than a static "sent 2h ago". */
  watching: string;
}

export const SETUP_TASKS: SetupTask[] = [
  {
    id: 'email',
    label: 'Email sending domain',
    icon: 'mail',
    who: 'whoever manages your DNS',
    minutes: 10,
    steps: [
      'Open your domain registrar (Cloudflare, Namecheap, Route 53, wherever the domain lives).',
      'Add the DKIM CNAME record exactly as given, including the selector prefix.',
      'Add the SPF TXT record. If an SPF record already exists, merge the include into it. Do not add a second one.',
      'Save, then tell us. Records usually resolve within an hour.',
    ],
    gotcha: 'A domain may only have one SPF record. Two will fail both, and email silently lands in spam rather than bouncing.',
    watching: 'a DNS lookup every 15 minutes, until the DKIM and SPF records resolve',
  },
  {
    id: 'push',
    label: 'In-app push SDK',
    icon: 'smartphone',
    who: 'a frontend engineer with deploy access',
    minutes: 20,
    steps: [
      'Add the OnchainSuite script tag to your dApp, or install @onchainsuite/web.',
      'Call os.identify({ wallet }) once a wallet connects.',
      'Deploy to the origin you allowlisted.',
    ],
    gotcha: 'identify() takes a wallet address only. It rejects email and other personal identifiers by design, because we must never hold the wallet↔identity mapping.',
    watching: 'the first event from the SDK on your domain',
  },
  {
    id: 'x',
    label: 'X DM access',
    icon: 'at-sign',
    who: 'whoever owns the X developer account',
    minutes: 15,
    steps: [
      'Create an app in the X developer portal.',
      'Enable OAuth 2.0 and request the dm.write scope.',
      'Authorise it against the account you send from.',
    ],
    gotcha: 'X only permits DMs to accounts that follow you. No API tier changes this, so authorising the app does not by itself make anyone reachable.',
    watching: 'the OAuth callback, then the first follower with a linked wallet',
  },
];

export const taskById = (id: HandoffChannel) => SETUP_TASKS.find((t) => t.id === id)!;

/** Total time being asked of the recipient — stated before you send, because a handoff
 *  that hides its own cost is how it ends up ignored. */
export const totalMinutes = (ids: HandoffChannel[]) =>
  ids.reduce((a, id) => a + taskById(id).minutes, 0);
