/* Communication, the third layer of the Yauga strategy, in its four parts:
   campaigns and newsletters, Loops, lifecycle and retention triggers. Email
   is the only member channel. Event names are a working draft for Yauga's
   developers to confirm. */

import type { ChapterSection } from "@/onchain-suite-website/types/retention-playbook";

export const CAMPAIGNS: ChapterSection = {
  id: "campaigns",
  parent: "strategy",
  title: "Campaigns and newsletters",
  blocks: [
    {
      kind: "p",
      text: "Communication has four parts, which the next pages take one at a time: campaigns and newsletters for what is happening in a city, Loops for one member's next step, lifecycle for where each member stands, and retention triggers for moments on a member's own account. All four go out by email, with one broadcast a week at most, and every email passes the Yauga Test.",
    },
    {
      kind: "p",
      text: "A campaign goes to a tag, because something is happening for the people who carry it, and since a city is only a tag, the same system runs every city from one workspace. A member who moves from Bournemouth to Barcelona stays one person with one history, and Chicago and Vienna get separate sends in their own time.",
    },
    {
      kind: "table",
      head: ["Send", "Goes to", "When and how"],
      rows: [
        [
          "City launch",
          "That city's waitlist",
          "One campaign, when the city opens",
        ],
        [
          "Before an event",
          "The event's ticket tag",
          "What to bring and how to arrive ready, unless Haus OS sends a reminder two days out",
        ],
        [
          "City news",
          "The city tag",
          "Written by the city lead and sent by HQ, from the same sender as everything else",
        ],
        [
          "Yauga Letters",
          "Everyone with the letters tag",
          "Once a week, one broadcast split by focus and city",
        ],
      ],
    },
    {
      kind: "artifact",
      code: "04.07",
      title: "How communication grows a city",
      diagram: {
        type: "flow",
        nodes: [
          {
            label: "Local interest",
            note: "creators, venues, the city lead",
          },
          { label: "Waitlist", note: "welcome, tagged by city" },
          { label: "Launch", note: "one campaign to that city's waitlist" },
          { label: "Repeat", note: "before and after each event" },
          { label: "Membership", note: "app and ring onboarding" },
          { label: "Flagship", note: "nothing new to set up" },
        ],
      },
    },
    {
      kind: "p",
      text: "Yauga Letters carries the member's pillar, whether that is sleep and Tranquility, stress and Stillness, attention and Attention, or movement and Energy, beside what is on in their city. Selling Yauga Enterprise to employers, universities and studios stays with Yauga's team, and the people who join through it get a source tag and the same welcome as everyone else.",
    },
  ],
};

export const LOOPS: ChapterSection = {
  id: "loops",
  parent: "strategy",
  title: "Loops",
  blocks: [
    {
      kind: "p",
      text: "A Loop is a short sequence of emails to one member. It starts from something they did, or did not do, and stops the moment they take the step it asks for, so nobody is chased for something they have already done.",
    },
    {
      kind: "loops",
      loops: [
        {
          name: "Welcome",
          startsWhen:
            "Someone joins a city's waitlist or Yauga Letters through an OnchainSuite form and confirms by email",
          sends:
            "One email on what they will get, pointing at their city's next event or their place on the waitlist",
          stopsWhen:
            "On confirmation, and nothing goes to an address that has not confirmed",
        },
        {
          name: "After the Haus",
          startsWhen: "A check-in at a Haus",
          sends:
            "That evening, one email pointing at the app with a first practice for their focus",
          stopsWhen: "They open the app and start a practice",
        },
        {
          name: "First practice",
          startsWhen: "A member joins in the app",
          sends:
            "A first practice for their pillar, then how to set up the ring and start a streak",
          stopsWhen: "They complete a session or pair the ring",
        },
        {
          name: "Slipping",
          startsWhen: "Yauga sends member_quiet as the member moves to At risk",
          sends:
            "The next shared sit in their city, with the date, and nothing else",
          stopsWhen: "They check in or complete a session",
        },
        {
          name: "Bring someone",
          startsWhen: "A third check-in, when a member is a regular",
          sends:
            "One email with a guest pass for someone they would like to bring",
          stopsWhen: "A referral is made",
        },
        {
          name: "Dormant",
          startsWhen: "60 days without a check-in, a session or a streak",
          sends: "One good reason to come back",
          stopsWhen: "After that one email, and then we leave them alone",
        },
      ],
    },
    {
      kind: "artifact",
      code: "04.08",
      title: "From a check-in to a first practice",
      diagram: {
        type: "flow",
        nodes: [
          { label: "Checked in", note: "at a Haus, that evening" },
          { label: "One next step", note: "the app, for their focus" },
          { label: "Practice started", note: "the Loop stops" },
          { label: "First practice", note: "branched by focus" },
          { label: "Ring paired", note: "the first streak begins" },
        ],
      },
    },
    {
      kind: "pull",
      text: "Live experiences bring people in. ==This is how they find the app after they go home.==",
    },
    {
      kind: "callout",
      tone: "rules",
      title: "How every Loop behaves",
      items: [
        'It starts from a fresh event each time, because on OnchainSuite a member enters a "joined a segment" flow only once, ever',
        "It stops the moment the member takes the step it asks for",
        "One owner per moment, so nobody gets two emails about the same thing",
        "Email is the only member channel: OnchainSuite's in-app messages and push need a wallet sign-in, which Yauga's members do not use, so the Yauga App keeps its own push",
        "One broadcast a week is the cap, and retention triggers are the exception",
      ],
    },
  ],
};

export const LIFECYCLE: ChapterSection = {
  id: "lifecycle",
  parent: "strategy",
  title: "Lifecycle",
  blocks: [
    {
      kind: "p",
      text: "Every member sits in one of six stages, the same six on every strategy we run. The stage is worked out from what the member did across every Yauga product, never set by hand, and it is read by city and by focus; it moves on patterns, while retention triggers answer single events, and the two never overlap.",
    },
    {
      kind: "artifact",
      code: "04.09",
      title: "The six stages of a member",
      diagram: {
        type: "ladder",
        steps: [
          { label: "New", note: "on a waitlist, or took Letters" },
          { label: "Activated", note: "first check-in at a Haus" },
          { label: "Engaged", note: "the app, the ring, or back again" },
          {
            label: "At risk",
            note: "activity at half their own average",
            tone: "orange",
          },
          { label: "Dormant", note: "60 days, nothing", tone: "grey" },
          {
            label: "Won back",
            note: "back at a Haus or in the app, watched 30 days",
            tone: "navy",
          },
        ],
      },
    },
    {
      kind: "table",
      head: ["Stage", "What it means", "What moves them on"],
      rows: [
        [
          "New",
          "On a waitlist or taking Letters, with no check-in yet",
          "The launch campaign and the welcome Loop",
        ],
        ["Activated", "A first check-in at a Haus", "The after-the-Haus Loop"],
        [
          "Engaged",
          "Practising in the app, a paired ring, a membership or a second check-in",
          "No Loop: streaks, points, Letters and the city's campaigns",
        ],
        [
          "At risk",
          "Activity at half their own 30-day average",
          "The slipping Loop",
        ],
        ["Dormant", "60 days with nothing", "One email, then rest"],
        [
          "Won back",
          "Back at a Haus or in the app from At risk or Dormant",
          "Watched for 30 days, then Engaged or At risk, never back through the welcome",
        ],
      ],
    },
    {
      kind: "callout",
      tone: "rules",
      title: "The one rule for At risk",
      text: "Activity at half the member's own 30-day average, counted across check-ins, sessions and streaks. OnchainSuite's built-in scores are designed for wallets, so Yauga works it out from its own data and sends it as member_quiet.",
    },
    {
      kind: "callout",
      tone: "note",
      title: "Exit points",
      items: [
        "An unsubscribe stops Letters, launches, city news and every Loop, and reaches HQ Control by webhook the same day; tickets and receipts still come from Haus OS",
        "A spam complaint stops everything that day, and a hard bounce closes the address",
        "A cancelled membership is a retention trigger, not an exit",
        "An account deleted, or an erasure request, ends everything, the record included",
      ],
    },
  ],
};

export const RETENTION_TRIGGERS: ChapterSection = {
  id: "retention-triggers",
  parent: "strategy",
  title: "Retention triggers",
  blocks: [
    {
      kind: "p",
      text: "A retention trigger is one email, sent the same day something happens to a member's own account. It comes from the event rather than a calendar, carries no offer, and goes to anyone the event belongs to, with or without the letters tag, because it is about something they did.",
    },
    {
      kind: "table",
      head: ["Moment", "The email"],
      rows: [
        [
          "A streak reached or a challenge completed",
          "Notices it, says what it earned and offers one small next practice; Yauga works out the streak and sends only the milestone",
        ],
        [
          "Points within reach of a reward",
          "Says how close they are, with the next Haus in their city",
        ],
        [
          "The ring gone quiet",
          "Says it has stopped syncing, and how to get it going again",
        ],
        [
          "A membership cancelled",
          "What changes, what stays and how to come back, with no offer",
        ],
        [
          "Two days before an event",
          "Only if Haus OS sends reminder_due; otherwise the ticket campaign carries it",
        ],
      ],
    },
    {
      kind: "p",
      text: "Here is the after-the-Haus email, the one every other automation depends on, written to pass the Yauga Test.",
    },
    {
      kind: "messages",
      messages: [
        {
          type: "After a first check-in, email",
          channels: "email",
          subject: "What to do with tonight",
          preview: "One practice for sleep, in the app, before you go to bed",
          body: [
            "You were at Yauga Haus Vienna tonight. Thank you for coming.",
            "What you felt in the room can be practised at home. The Yauga App has a first practice for sleep that takes eleven minutes, and it works best tonight, while the evening is still with you.",
            "Sign in with the same email and the practice is waiting for you, along with the first day of your streak.",
          ],
          action: "Open the app",
        },
      ],
    },
  ],
};
