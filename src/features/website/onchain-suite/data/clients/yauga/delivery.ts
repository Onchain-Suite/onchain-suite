/* The back of the Yauga book: how we know the strategy worked, how it runs on
   OnchainSuite, and what we need from Yauga and never send. The platform's
   limits were checked against the OnchainSuite documentation. */

import type { ChapterSection } from "@/onchain-suite-website/types/retention-playbook";

export const MEASURE: ChapterSection = {
  id: "measure",
  title: "How we know it worked",
  blocks: [
    {
      kind: "p",
      text: "Bookings, check-ins, practice, streaks and points are counted from Yauga's own events rather than from the estimates in OnchainSuite's automation reports, and every always-on Loop keeps a holdout, a small group left out on purpose, so we can show what the strategy caused.",
    },
    {
      kind: "pull",
      text: "Opens are a health check. ==The goal is movement round the loop.==",
    },
    {
      kind: "p",
      text: "Every Monday a stage report shows how many members sit at each stage, by city and by focus, and the stage where most of them are stuck is where the next week's effort goes. Under it sit six numbers, with targets set once the first month gives us a baseline:",
    },
    {
      kind: "list",
      items: [
        "The share of website sign-ups who come to a first Haus",
        "The share of first-time attendees who join the app or take a membership",
        "The share of members who keep a streak going each week",
        "Points spent on Haus tickets, and repeat check-ins per member",
        "How complete each member's record is, from city and focus to formats and goal",
        "Unsubscribes and spam complaints, which should stay low and flat",
      ],
    },
  ],
};

export const PLATFORM: ChapterSection = {
  id: "platform",
  title: "Running it on OnchainSuite",
  blocks: [
    {
      kind: "p",
      text: "OnchainSuite is the layer that holds the member record and sends the communication. Every Yauga system sends its events straight to it from Yauga's server, with a secret key, so a follow-up can go the same day as a check-in, and each system is wired once, after which new emails are built in OnchainSuite with no further developer work.",
    },
    {
      kind: "table",
      head: ["System", "What it reports"],
      rows: [
        [
          "Yauga App and Haus OS",
          "A waitlist joined, a ticket booked, a check-in, a membership, a session or challenge, points earned and spent, and an order",
        ],
        [
          "Yauga Cult",
          "The ring paired, a streak reached and the ring inactive",
        ],
        [
          "Yauga HQ",
          "A member gone quiet and a referral made, worked out from Yauga's own data",
        ],
        [
          "Website",
          "Sign-ups, through an OnchainSuite form with double opt-in",
        ],
        [
          "Enterprise and connected products",
          "A source tag now, and their own events when they are ready",
        ],
        ["Back to HQ Control", "Unsubscribes and clicks, by webhook"],
      ],
    },
    {
      kind: "artifact",
      code: "04.10",
      title: "How it connects",
      diagram: {
        type: "flow",
        nodes: [
          { label: "Yauga systems", note: "the platform, Cult, HQ" },
          { label: "One record", note: "enriched as events arrive" },
          { label: "Loops and Letters", note: "decided in one place" },
          { label: "Email", note: "from Yauga's domain" },
          { label: "Back to HQ", note: "unsubscribes and clicks" },
        ],
      },
    },
    {
      kind: "p",
      text: 'One record per person is found by email first and Yauga member ID second, and tagged as events arrive with who they are, their city, their focus and pillar, the formats they use and their state. Tags keep a group such as "Vienna, sleep focus" current without anyone rebuilding it, and groups that depend on history are built as SQL segments from the event log.',
    },
    {
      kind: "table",
      head: ["What the platform does today", "So the plan"],
      rows: [
        [
          'A member enters a "joined a segment" flow once, ever',
          "Repeating moments start from fresh events",
        ],
        [
          "An automation cannot wait until two days before an event date",
          "Pre-event emails go as a campaign to the event's ticket tag",
        ],
        [
          "The segment builder reads tags, a score and a wallet",
          "Meaning goes into tags at the source, and history uses SQL segments",
        ],
        [
          "The engagement and churn scores are designed for wallets",
          '"Quiet" comes from Yauga as member_quiet',
        ],
        [
          "Date triggers run on one team time zone",
          "City sends are scheduled separately",
        ],
        [
          "Conversion figures in automation reports are estimates",
          "Outcomes are counted from Yauga's events",
        ],
      ],
    },
    {
      kind: "p",
      text: "Events are live, while nightly files arrive too late to start a flow and events older than seven days are refused, so an import is for Yauga's existing history only. The plan is sized to contacts, Launch at 2,500 and Growth at 25,000, and OnchainSuite brings the event list and tag scheme, the segments and automations built and tested, Yauga Letters structured by focus and city, reporting on the loop, and a team working on the whole strategy alongside Yauga's.",
    },
  ],
};

export const NEED: ChapterSection = {
  id: "need",
  title: "What we need from Yauga, and what we never send",
  blocks: [
    {
      kind: "p",
      text: "Six things before anything is wired:",
    },
    {
      kind: "list",
      items: [
        "The front door fields on the website and booking forms: name, email, city and focus, with phone optional",
        "A developer to connect the platform, the ring and HQ once",
        "An opt-in tick at booking and at app sign-up",
        "City and focus values sent the same way from every system",
        "A points balance in the app, with what earns and what spends set by Yauga",
        "HQ Control listening for unsubscribes, and the city leads' news sent to HQ, never out from the city",
      ],
    },
    {
      kind: "p",
      text: "Then, before anything goes out:",
    },
    {
      kind: "list",
      items: [
        "The event names confirmed by Asif, since they are a working draft",
        'The spelling of "Yauga Cult" confirmed with Kris',
        "The sending domain and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam",
        "Who approves each email, and whose voice it goes out in",
      ],
    },
    {
      kind: "callout",
      tone: "rules",
      title: "What we never send: the Yauga rules",
      items: [
        "Body readings, from sleep and heart rate to HRV, stress and SpO₂, never leave Yauga's systems and never earn points; OnchainSuite only hears that something happened",
        "No marketing to anyone who has not said yes: a ticket buyer gets their ticket, and every automation checks for the letters tag",
        "One broadcast a week, and since OnchainSuite has no built-in limit on how often one person is emailed, that rule is the limit",
        "Nothing that is not secular, and anything at 40 or above on the woo-woo scale is rewritten or cut",
        "City leads never send their own emails, and receipts stay in Haus OS, where they already work",
      ],
    },
    {
      kind: "p",
      text: "Everything we do send passes the Yauga Test, which asks whether it can be felt, practised and explained plainly, and comes from one sender with one standard in every city, while practitioners, city leads and partners sit on a separate list.",
    },
  ],
};
