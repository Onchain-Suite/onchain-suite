import type { ChannelId } from "../types/channel";

/**
 * How each channel is set up, as the person doing it needs it told: who on the
 * team can do it, how long it takes, the steps in order, and the thing people
 * get wrong.
 *
 * Every channel needs a credential the person running campaigns usually does
 * not hold: email needs the DNS provider, push needs a deploy, the social
 * channels need whoever owns the account. So the same text serves three
 * places: the steps shown on the channel's own page, the three-node progress
 * above them, and the instructions handed to someone else.
 *
 * Static data, React-free.
 */
export interface SetupGuide {
  /** What the task is called when it is handed to someone. */
  task: string;
  /** Who on the team can actually do this: the reason the handoff exists. */
  who: string;
  /** Honest estimate. Someone deciding whether to context-switch needs it. */
  minutes: number;
  /** The three nodes of the progress line: start, middle, live. */
  flow: readonly [string, string, string];
  /** What they have to do, in order. */
  steps: readonly string[];
  /** The thing people get wrong, said up front. */
  gotcha: string;
}

export const SETUP_GUIDES: Record<ChannelId, SetupGuide> = {
  email: {
    task: "Email sending domain",
    who: "whoever manages your DNS",
    minutes: 10,
    flow: ["Add a domain", "Add the DNS records", "Verified"],
    steps: [
      "Open your DNS provider (Cloudflare, Namecheap, Route 53, wherever the domain lives).",
      "Add the DKIM CNAME records. Paste only the short host shown: most providers add the domain for you, and adding it twice puts the record on the wrong host.",
      "Add the MX and SPF TXT records on the bounce host. If that host already has an SPF record, merge the two. Do not add a second one.",
      "Add the DMARC TXT record and save. Records usually resolve within an hour.",
    ],
    gotcha:
      "A host may only have one SPF record. Two will fail both, and email lands in spam instead of bouncing.",
  },
  push: {
    task: "In-app push SDK",
    who: "a frontend engineer with deploy access",
    minutes: 20,
    flow: ["Install the SDK", "We listen", "Connected"],
    steps: [
      "Allow the origin your dApp runs on, then add the OnchainSuite script tag or install the package.",
      "Call identify with the wallet address once a wallet connects.",
      "Deploy to the origin you allowed, and open the dApp with a wallet connected.",
    ],
    gotcha:
      "identify takes a wallet address only. It rejects email and other personal identifiers by design.",
  },
  x: {
    task: "X account",
    who: "whoever owns the X developer account",
    minutes: 15,
    flow: ["Create an X app", "Paste the token", "Connected"],
    steps: [
      "Create an app in the X developer portal.",
      "Turn on OAuth 2.0 user authentication and request dm.write, tweet.read and users.read.",
      "Authorise it against the account you send from, and copy the user access token. Copy the refresh token and client credentials too, so the token renews itself.",
      "Paste them here.",
    ],
    gotcha:
      "X only permits a DM to someone who follows you or has messaged you first. No API tier changes this, so your followers are the ceiling on reach.",
  },
  whatsapp: {
    task: "WhatsApp Business account",
    who: "an admin of your Meta Business account",
    minutes: 30,
    flow: ["Connect Meta", "We verify it", "Connected"],
    steps: [
      "Sign up with Meta from this page, or open Meta Business, WhatsApp, API setup.",
      "Add or pick the business phone number and copy its phone number ID.",
      "Create a permanent system-user token with whatsapp_business_messaging.",
      "Paste both here, then point the webhook at us so replies and opt-outs arrive.",
    ],
    gotcha:
      "WhatsApp only delivers approved templates to people who opted in. Anything else is rejected, not delayed.",
  },
  sms: {
    task: "SMS account",
    who: "whoever can confirm the company's legal details",
    minutes: 30,
    flow: ["Connect Twilio", "We verify it", "Connected"],
    steps: [
      "Let us set up a number for you from this page, or open your own Twilio account.",
      "Copy the Account SID and Auth token from Console, Account, API keys and tokens.",
      "Add a From number or, better, a Messaging Service SID, which picks the right sender per country.",
      "For US numbers, register the business and the campaign with the carriers (A2P 10DLC).",
    ],
    gotcha:
      "US carriers block traffic from an unregistered business, and every text must honour STOP. Point the inbound webhook at us or opt-outs are never recorded.",
  },
  telegram: {
    task: "Telegram bot",
    who: "whoever runs your Telegram bot or channel",
    minutes: 5,
    flow: ["Create a bot", "Paste its token", "Connected"],
    steps: [
      "Open @BotFather in Telegram and send /newbot.",
      "Name the bot and copy the token it gives you.",
      "Paste the token here, then turn on opt-ins.",
      "To post to a channel, add the bot to it as an admin.",
    ],
    gotcha:
      "Telegram cannot message anyone first. A person must press Start on your bot before you can reach them.",
  },
  discord: {
    task: "Discord bot",
    who: "an admin of your Discord server",
    minutes: 10,
    flow: ["Create a bot", "Paste its token", "Connected"],
    steps: [
      "Open the Discord Developer Portal and create an application.",
      "Under Bot, reset the token and copy it. A user token is rejected.",
      "Turn on the Server Members intent if you want to bring members in as contacts.",
      "Invite the bot to your server with permission to post in the channel you will use.",
    ],
    gotcha:
      "Discord does not allow reliable cold DMs. You post to a channel, and can mention a role.",
  },
  farcaster: {
    task: "Farcaster account",
    who: "whoever holds the Farcaster account",
    minutes: 10,
    flow: ["Approve a signer", "Paste the keys", "Connected"],
    steps: [
      "Create an app in the Neynar dashboard and copy its API key.",
      "Create a signer for the account you cast from, and approve it in Warpcast.",
      "Copy the signer UUID and paste both here.",
      "Optional: add a Warpcast API key for direct casts, and your Mini App domain for notifications.",
    ],
    gotcha:
      "An unapproved signer is rejected. Approve it in Warpcast before you paste it.",
  },
};

/** Mobile push has its own progress line: the OS delivers, so it sets the rules. */
export const MOBILE_PUSH_FLOW = [
  "Add a credential",
  "We verify it",
  "Connected",
] as const;
