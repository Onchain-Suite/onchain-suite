/* Shared words on /retention-playbook: the header, hero, summary chapter,
   closing chapter and labels. Each category's playbook lives in
   data/playbooks/. `**text**` marks bold, `==text==` a hand-drawn underline.
   Glossary terms are underlined automatically on first use in each section.
   Every figure here traces to a source checked on 14 October 2026. */

import type {
  CategoryCard,
  Chapter,
  GlossaryEntry,
  LabelledPoint,
  Loop,
  PrivacyIcon,
  SetupStep,
  StageTone,
} from "@/onchain-suite-website/types/retention-playbook";

export const META = {
  // The root layout's title template appends " · OnchainSuite".
  title: "Retention playbook",
  description:
    "Email and in-app retention playbooks for perp DEXs, prediction markets and DeFi protocols.",
};

/** Who sends the playbook. Shown in the top bar in place of the site nav. */
export const SENDER = {
  name: "Surgence Labs",
  url: "https://surgence.io",
  domain: "surgence.io",
  mark: "/site/partners/surgence-labs-mark.png",
};

/** Labels for buttons, controls and screen readers. */
export const UI = {
  preparedFor: "Prepared for",
  findPlaybook: "Find your playbook",
  jumpToPlaybook: "Jump to your playbook",
  yourPlaybook: "Your playbook",
  bookWalkthrough: "Book a walkthrough",
  continueReading: "Next: working with us",
  contents: "Contents",
  contentsLabel: "Playbook contents",
  scrollForMore: "Scroll for more",
  tldr: "TLDR",
  what: "What",
  how: "How",
  why: "Why",
  always: "Always",
  never: "Never",
  kpiWhat: "What we count",
  kpiWindow: "Counted within",
  selected: "Selected",
  source: "Source",
  startsWhen: "Starts when",
  sends: "What it sends",
  stopsWhen: "Stops when",
  messageView: "Message view",
  email: "Email",
  inApp: "In-app",
  subject: "Subject",
  preview: "Preview",
  need: "What we need from you",
};

/** The six stages, drawn in the hero window with At risk lit. */
export const STAGES: { name: string; tone: StageTone }[] = [
  { name: "New", tone: "blue" },
  { name: "Activated", tone: "blue" },
  { name: "Engaged", tone: "blue" },
  { name: "At risk", tone: "orange" },
  { name: "Dormant", tone: "grey" },
  { name: "Won back", tone: "navy" },
];

/** The Loop in the hero window. */
export const HERO_LOOP: Loop = {
  name: "Slipping",
  startsWhen: "Activity falls to half of their own 30-day average",
  sends: "A check-in about what changed and what is new",
  stopsWhen: "Activity returns",
};

export const HERO = {
  eyebrow: "Email marketing playbook",
  title: "Keep more of the users you’ve already won",
  subtitle:
    "OnchainSuite spots the wallets that are slipping and reaches them by email or in-app, while they still have funds in your product.",
  visual: {
    stage: "At risk",
    loopTag: "Loop",
    label:
      "The Slipping Loop: when a user's activity falls to half of their own 30-day average, they move to At risk and get a check-in about what changed and what is new. The Loop stops when activity returns.",
  },
};

/** Anchor on the category picker, the target of "Find your playbook". */
export const PICKER_ID = "summary-choose";

export const CATEGORIES: CategoryCard[] = [
  {
    id: "perp-dex",
    label: "Perp DEX",
    line: "Traders who come back to trade week after week.",
    section: "Chapter 01",
  },
  {
    id: "prediction-market",
    label: "Prediction market",
    line: "Users who come back after their first market resolves.",
    section: "Chapter 02",
  },
  {
    id: "defi",
    label: "DeFi: lending, vaults, liquidity",
    line: "Deposits that stay, and depositors who add more over time.",
    section: "Chapter 03",
  },
];

/** Shown wherever OnchainSuite is recommended. House rule: never optional. */
export const DISCLOSURE =
  "**Disclosure:** OnchainSuite is a related party to Surgence Labs. We say so here so the recommendation is judged on what the platform does, and you are free to test it against any alternative.";

export const SUMMARY: Chapter = {
  id: "summary",
  number: "00",
  kicker: "Chapter 00 · Summary",
  title: "The channel you own",
  dek: "What email and in-app messages do for a protocol, why most protocols cannot run them today, and what OnchainSuite changes.",
  sections: [
    {
      id: "what-email-does",
      title: "What email does for a protocol",
      blocks: [
        {
          kind: "p",
          text: "Incentives, points and airdrops are good at bringing wallets in and poor at keeping them. When a programme ends, most teams are left with one way to reach the people they paid for: a post on X that the user may never see.",
        },
        {
          kind: "stats",
          stats: [
            {
              figure: "43.69%",
              text: "of Uniswap airdrop recipients sent the token to an exchange on their first transfer. For Lido it was 65.75%.",
              source:
                "Study of nine airdrops, arXiv 2312.02752 (v4, July 2025)",
              href: "https://arxiv.org/abs/2312.02752",
            },
            {
              figure: "18x",
              text: "the revenue per recipient from automated email flows against one-off campaigns.",
              source: "Klaviyo email benchmarks, 2026 (e-commerce)",
              href: "https://www.klaviyo.com/products/email-marketing/benchmarks",
            },
          ],
        },
        {
          kind: "p",
          text: "Email is the one channel a protocol can own outright. No feed decides who sees it, and it reaches people when they are away from your app. Its real strength is the ==triggered message==: in Klaviyo's benchmarks, automated flows were 5.3% of sends and about 41% of email revenue, and Omnisend's 2026 report, across 150,000 brands, found automations earned 16 times more per send than campaigns.",
        },
        {
          kind: "note",
          text: "E-commerce numbers. Crypto has no public equivalent yet, which is the opening.",
        },
      ],
    },
    {
      id: "why-not-yet",
      title: "Why most protocols do not do it yet",
      blocks: [
        {
          kind: "table",
          head: ["What gets in the way", "What it means for a protocol"],
          rows: [
            [
              "Mainstream email tools exclude crypto",
              "Mailchimp's acceptable use policy prohibits cryptocurrencies, Klaviyo's bans crypto services, and HubSpot lists crypto as a restricted industry.",
            ],
            [
              "They cannot see the chain",
              "They know who opened an email. They do not know who withdrew their collateral yesterday, so every message is a guess.",
            ],
            [
              "Many users never share an email",
              "A wallet-only user is out of reach by email. Embedded wallets narrow the gap: Privy reports 160M+ accounts and Magic 53M+ wallets, both with email sign-in. In-app messages reach the rest.",
            ],
            [
              "Inbox rules tightened",
              "Since February 2024, Gmail and Yahoo require SPF, DKIM and DMARC, one-click unsubscribe and a spam rate under 0.3% from bulk senders.",
            ],
            [
              "Opens stopped meaning much",
              "Apple Mail accounted for 62.26% of opens in July 2026, and its privacy protection opens emails automatically. We judge a message by what wallets do afterwards.",
            ],
          ],
        },
      ],
    },
    {
      id: "what-changes",
      title: "What OnchainSuite changes",
      blocks: [
        {
          kind: "p",
          text: "OnchainSuite is an email and in-app platform built around the wallet. A contact can be a wallet, an email address, or both, and every Loop can start from something a wallet does on-chain.",
        },
        {
          kind: "artifact",
          code: "00.01",
          title: "From a wallet's action to the right message",
          diagram: {
            type: "flow",
            nodes: [
              {
                label: "A wallet acts",
                note: "withdraws, borrows, gets liquidated",
              },
              {
                label: "OnchainSuite reads it",
                note: "contracts watched for you",
              },
              {
                label: "A Loop decides",
                note: "segment, wait, branch, suppress",
              },
              { label: "Email or in-app", note: "one message, one action" },
              { label: "The Loop stops", note: "when the wallet acts" },
            ],
          },
        },
        {
          kind: "table",
          head: ["Layer", "What ships today"],
          rows: [
            [
              "Triggers",
              "22 ready-made on-chain triggers, including liquidation detected, position opened and closed, capital withdrawn, borrow opened, loan repaid, rewards claimed, staked and unstaked, plus any event your contract emits.",
            ],
            [
              "Chains",
              "Contracts are watched automatically on Ethereum, Base, Arbitrum, Optimism and Polygon. Other chains, including Solana and app-chains, send events through the Automation Trigger API.",
            ],
            [
              "Channels",
              "Email and in-app messages from the same Loop. The in-app SDK also delivers web and mobile push.",
            ],
            [
              "Audience",
              "Segments from rules, SQL or a plain-English sentence, recalculated as wallets act.",
            ],
            [
              "Measurement",
              "A holdout group inside any Loop, and a SQL Query Editor over your own wallet data.",
            ],
          ],
        },
        { kind: "p", text: DISCLOSURE },
      ],
    },
    {
      id: "how-we-work",
      title: "How Surgence works",
      blocks: [
        {
          kind: "p",
          text: "Surgence Labs plans and runs the programme with your team, on OnchainSuite. Each playbook that follows is what we would do for a protocol like yours ==before we have seen inside your account==. The first job is to check it against the real thing.",
        },
        {
          kind: "callout",
          tone: "rules",
          title: "Three rules on every message",
          items: [
            "Nothing goes to the whole list. Every message goes to a segment.",
            "One message, one link, one action.",
            "Consent before promotion. Where we cannot show what someone agreed to, the first message asks.",
          ],
        },
        {
          kind: "table",
          head: ["Before we write a word, we check", "What we look for"],
          rows: [
            [
              "Your product",
              "Every page, the docs and the app, walked as a new user, so messages use your words and point only at what ships today.",
            ],
            [
              "Your community",
              "X, Discord and Telegram, for the questions users keep asking and the words they use.",
            ],
            [
              "Your sign-up points",
              "Every place an email is captured, with a test address and a test wallet, and what the first message actually says.",
            ],
            [
              "Your sending account",
              "Lists, past sends, automations, bounces, complaints and domain authentication.",
            ],
            [
              "Your chain data",
              "Contract addresses checked against the explorer, and the on-chain segments we can build today.",
            ],
            [
              "Your people",
              "Who approves each message and whose voice it goes out in.",
            ],
          ],
        },
        {
          kind: "note",
          text: "Nothing reaches a message unless a source sits behind it.",
        },
      ],
    },
    {
      id: "choose",
      title: "Choose your playbook",
      blocks: [
        {
          kind: "p",
          text: "Each playbook is the full programme for one kind of protocol: campaigns, automation, lifecycle, retention triggers and the newsletter, then what we measure and what we need from you.",
        },
        { kind: "picker" },
      ],
    },
  ],
};

export const PRIVACY_POINTS: (LabelledPoint & { icon: PrivacyIcon })[] = [
  {
    icon: "wallet",
    label: "Wallet first.",
    text: "A user can exist with only a wallet. Email is optional and only ever comes from the user, through a consented form or a list you already hold.",
  },
  {
    icon: "hidden",
    label: "Emails stay protected.",
    text: "Each email is stored as a keyed one-way fingerprint and can be encrypted at rest. ZK Shield, which uses a zero-knowledge proof to show a wallet and an email belong together without revealing either, is being brought into the product.",
  },
  {
    icon: "read-only",
    label: "Read-only.",
    text: "We read public blockchain data. We never hold keys or funds.",
  },
  {
    icon: "compliant",
    label: "Registered in the UK.",
    text: "OnchainSuite Ltd is registered in England and Wales and works under UK GDPR.",
  },
];

export const SETUP_STEPS: SetupStep[] = [
  {
    text: "We find your contracts and holders from your project's address and load their history",
    need: "Your contract address",
  },
  {
    text: "We bring in the records you already have: email lists, app accounts, wallet logins",
    need: "Your existing lists, in any format",
  },
  {
    text: "We connect your sending domain for email and add our SDK for in-app messages",
    need: "Access to your domain settings, and a developer for one short script",
  },
  {
    text: "We build your first Loops together, starting with the ones in your playbook",
    need: "Who approves messages, and whose voice they go out in",
  },
  {
    text: "Monthly review of results and the next change",
    need: "30 minutes a month",
  },
];

export const GLOSSARY: { entries: GlossaryEntry[] } = {
  entries: [
    {
      key: "segment",
      term: "Segment",
      definition:
        'A saved group of users who share something, such as "deposited this month"',
    },
    {
      key: "loop",
      term: "Loop",
      definition:
        "An automatic sequence of messages that starts from a user's action and stops when they act",
    },
    {
      key: "trigger",
      term: "Trigger",
      definition: "The action that starts a Loop, such as a withdrawal",
    },
    {
      key: "retention-trigger",
      term: "Retention trigger",
      definition:
        "A single message sent the same day something happens to a user's account or position",
    },
    {
      key: "capture-point",
      term: "Capture point",
      definition: "Any place a person hands over their email address",
    },
    {
      key: "suppression",
      term: "Suppression",
      definition:
        "A rule that stops the wrong person receiving a message, such as someone who already did the thing it asks for",
    },
    {
      key: "frequency-cap",
      term: "Frequency cap",
      definition:
        "The most messages one person can get in a period, across email and in-app",
    },
    {
      key: "in-app-message",
      term: "In-app message",
      definition:
        "A message that shows inside your product the next time the user opens it. No email needed",
    },
    {
      key: "cohort",
      term: "Cohort",
      definition:
        "A group of users who joined in the same period, followed over time",
    },
    {
      key: "holdout",
      term: "Holdout",
      definition:
        "A small group left out of a Loop on purpose, to show what the messages caused",
    },
    {
      key: "zero-knowledge-proof",
      term: "Zero-knowledge proof",
      definition:
        "A way to prove two things match, such as a wallet and an email, without showing either one",
    },
    {
      key: "health-factor",
      term: "Health factor",
      definition:
        "A number that shows how close a loan is to liquidation. Below 1 means liquidation",
    },
  ],
};

export const CLOSING: Chapter = {
  id: "working-with-us",
  number: "04",
  kicker: "Chapter 04 · Working with us",
  title: "Working with us",
  dek: "How your users' data is handled, how we get started, and the words used in this playbook.",
  sections: [
    { id: "privacy", title: "How we keep your users private" },
    { id: "getting-started", title: "Getting started" },
    { id: "words-we-use", title: "Words we use" },
  ],
};

export const NEXT_STEP = {
  id: "next-step",
  number: "→",
  title: "Next step",
  text: "Book a 30-minute walkthrough and we will show you which of your users are slipping right now.",
  href: "/early-access",
};
