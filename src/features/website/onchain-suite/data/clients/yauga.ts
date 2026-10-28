/* The Yauga growth and retention strategy, for Yauga's team, on the shared
   structure: campaigns and the newsletter, Loops, lifecycle (capture points,
   the six stages, exit points) and retention triggers, then what we
   measure, the platform and what we need. Email is the only member channel.
   Source: the Yauga email marketing plan, October 2026, with the platform's
   capabilities checked against the OnchainSuite documentation. Event names
   are a working draft for Yauga's developers to confirm, and "Yauga Cult" is
   used throughout pending confirmation of the spelling.
   Trimmed in October 2026 to read as a book: every rule, number and decision
   is kept, and repeated prose became Loop cards and tables.
   This page is reached by its link only: it is not on the landing page. */

import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";

export const YAUGA: Chapter = {
  id: "yauga",
  number: "04",
  title: "Yauga growth and retention strategy",
  dek: "How communication follows a member from a city's waitlist to the Haus, the app and the ring, and brings them back when they go quiet.",
  tldr: [
    "Today Yauga's systems do not know each other: Haus emails go out from Haus OS and Yauga Letters from OnchainSuite, while the app, Yauga Cult, the shop, Run Club and Social Club send nothing at all, so ==a person who goes to a Haus and then joins the app is two strangers to the way Yauga communicates.==",
    "We propose one record per person, so every Yauga system reports what happened and communication follows the person rather than the product. The step that matters most is Attend to Join, because live experiences bring people in and email is how they find the app and the ring after they go home, so the first automations we build start on a check-in.",
    "The plan has four parts, campaigns and the newsletter, Loops, lifecycle and retention triggers, all carried by email from Yauga's own domain, with one broadcast a week and every email passing the Yauga Test.",
  ],
  intro: [
    {
      kind: "artifact",
      code: "04.06",
      title: "The Yauga ecosystem, and where OnchainSuite sits",
      diagram: {
        type: "hub",
        centre: { label: "One record per person", note: "OnchainSuite" },
        spokes: [
          {
            label: "Yauga Haus OS",
            note: "the Haus, Ritual Rooms, Run Club, Social Club and the shop",
          },
          {
            label: "Yauga App",
            note: "sign-up and focus, sessions, challenges, membership",
          },
          {
            label: "Yauga Cult",
            note: "the ring: paired, streaks, gone quiet",
          },
          { label: "Website", note: "Letters sign-up, confirmed by email" },
          {
            label: "Yauga HQ",
            note: "quiet members and referrals in; unsubscribes back",
            dir: "both",
          },
          {
            label: "Messages to members",
            note: "Loops, triggers, city news and Letters, from Yauga's domain",
            dir: "out",
          },
        ],
      },
    },
    {
      kind: "artifact",
      code: "04.07",
      title: "Yauga's participation funnel",
      diagram: {
        type: "funnel",
        stages: [
          {
            label: "Discover",
            note: "joins a waitlist, or takes Yauga Letters",
          },
          { label: "Attend", note: "books a ticket and checks in at a Haus" },
          {
            label: "Join",
            note: "an app account, the ring or a membership: the step that matters most",
            tone: "orange",
          },
          { label: "Practise", note: "sessions, streaks and challenges" },
          {
            label: "Connect",
            note: "repeat check-ins and their city's shared sits",
          },
          {
            label: "Return and refer",
            note: "back after a quiet spell, and brings someone",
          },
        ],
      },
    },
  ],
  sections: [
    {
      id: "says",
      title: "What we never send",
      blocks: [
        {
          kind: "p",
          text: 'Body data stays with Yauga. Sleep, heart rate, HRV, stress and SpO₂ readings never leave Yauga\'s systems, and OnchainSuite only hears that something happened, such as a seven-day streak, which matches "your data is yours" and keeps health data out of member communication altogether.',
        },
        {
          kind: "callout",
          tone: "rules",
          title: "The Yauga rules",
          items: [
            "Body data never leaves Yauga's systems; OnchainSuite only hears that something happened",
            "No marketing to anyone who has not said yes: a ticket buyer gets their ticket, and every automation checks for the letters tag",
            "One broadcast a week, and since OnchainSuite has no built-in limit on how often one person is emailed, that rule is the limit",
            "Nothing that is not secular, and anything at 40 or above on the woo-woo scale is rewritten or cut",
            "City leads never send their own emails, which would split the voice and the sending reputation, and receipts stay in Haus OS, where they already work",
          ],
        },
        {
          kind: "p",
          text: "Everything we do send passes the Yauga Test, which asks whether it can be felt, practised and explained plainly. Every moment has one owner, so nobody gets two emails about the same thing, every member email comes from one sender with one standard in every city, and practitioners, city leads and partners sit on a separate list, never mixed into member sends.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "Campaigns and the newsletter",
      blocks: [
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
          code: "04.04",
          title: "How communication grows a city",
          diagram: {
            type: "flow",
            nodes: [
              {
                label: "Local interest",
                note: "no email yet; the city lead's job",
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
          text: "Yauga Letters carries the member's pillar, whether that is sleep and Tranquility, stress and Stillness, attention and Attention, or movement and Energy, beside what is on in their city. Selling to employers, universities and studios stays outside OnchainSuite, because that is sales rather than member email, and members who join through them get a source tag.",
        },
      ],
    },
    {
      id: "loops",
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
              stopsWhen: "They create an account",
            },
            {
              name: "First practice",
              startsWhen: "An app account is created",
              sends:
                "A first practice for their pillar, then how to set up the ring",
              stopsWhen: "They complete a session or pair the ring",
            },
            {
              name: "Slipping",
              startsWhen:
                "Yauga sends member_quiet as the member moves to At risk",
              sends:
                "The next shared sit in their city, with the date, and nothing else",
              stopsWhen: "They check in or complete a session",
            },
            {
              name: "Bring someone",
              startsWhen: "A third check-in, when a member is a regular",
              sends: "One email inviting them to bring someone",
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
          code: "04.01",
          title: "From a check-in to a first practice",
          diagram: {
            type: "flow",
            nodes: [
              { label: "Checked in", note: "at a Haus, that evening" },
              { label: "One next step", note: "the app, for their focus" },
              { label: "Account created", note: "the Loop stops" },
              { label: "First practice", note: "branched by focus" },
              { label: "Ring paired", note: "Yauga Cult set up" },
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
    },
    {
      id: "lifecycle",
      title: "Lifecycle",
      blocks: [
        {
          kind: "p",
          text: "Every member sits in one of six stages, the same six on every strategy we run. The stage is worked out from what the member did across every Yauga system, never set by hand, and it is read by city and by focus; it moves on patterns, while retention triggers answer single events, and the two never overlap.",
        },
        {
          kind: "artifact",
          code: "04.02",
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
              {
                label: "Dormant",
                note: "60 days, nothing",
                tone: "grey",
              },
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
            [
              "Activated",
              "A first check-in at a Haus",
              "The after-the-Haus Loop",
            ],
            [
              "Engaged",
              "An app account, a paired ring, a membership or a second check-in",
              "No Loop: Letters and the city's campaigns",
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
          kind: "p",
          text: "Each capture point sets what we may send. The website forms, and an opt-in tick at a Haus OS checkout or at app sign-up, carry news consent confirmed by email, while a ticket bought without the tick carries service only, so that person gets their ticket and event follow-ups but never Letters, launches or city news. Where nobody can show what the people on Yauga's existing Haus list agreed to, the first email asks.",
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
        {
          kind: "p",
          text: "Take Ada, who joins the Vienna waitlist on the website and confirms with one click, and follow her from there.",
        },
        {
          kind: "artifact",
          code: "04.03",
          title: "Ada, from the Vienna waitlist to coming back",
          diagram: {
            type: "timeline",
            points: [
              { when: "Day 0", label: "Joins the waitlist, confirms" },
              { when: "Day 20", label: "Checks in at the Haus" },
              { when: "Day 22", label: "Creates an app account, sleep focus" },
              { when: "Day 29", label: "Pairs the ring" },
              { when: "Day 36", label: "Seven-day streak, one email" },
              { when: "Day 56", label: "Quiet; the next shared sit" },
            ],
          },
        },
      ],
    },
    {
      id: "retention-triggers",
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
              "Notices it and offers one small next practice; Yauga works out the streak and sends only the milestone",
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
            [
              "A refund",
              "Nothing from OnchainSuite, because Haus OS sends the receipt instantly",
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
              preview:
                "One practice for sleep, in the app, before you go to bed",
              body: [
                "You were at Yauga Haus Vienna tonight. Thank you for coming.",
                "What you felt in the room can be practised at home. The Yauga App has a first practice for sleep that takes eleven minutes, and it works best tonight, while the evening is still with you.",
                "Create your account with the same email and the practice is waiting for you.",
              ],
              action: "Open the app",
            },
          ],
        },
      ],
    },
    {
      id: "measure",
      title: "How we know it worked",
      blocks: [
        {
          kind: "p",
          text: "Bookings, check-ins, accounts and sessions are counted from Yauga's own events rather than from the estimates in OnchainSuite's automation reports, and every always-on Loop keeps a holdout, a small group left out on purpose, so we can show what the emails caused.",
        },
        {
          kind: "pull",
          text: "Opens are a health check. ==The goal is movement round the loop.==",
        },
        {
          kind: "p",
          text: "Every Monday a stage report shows how many members sit at each stage, by city and by focus, and the stage where most of them are stuck is where the next week's effort goes. Under it sit five numbers, with targets set once the first month gives us a baseline:",
        },
        {
          kind: "list",
          items: [
            "The share of a city's waitlist who book its first event",
            "The share of first-time attendees who create an app account",
            "The share of new app members who complete a first session",
            "Repeat bookings per member",
            "Unsubscribes and spam complaints, which should stay low and flat",
          ],
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every Yauga system sends its events straight to OnchainSuite from Yauga's server, with a secret key. An event arrives in seconds, so a follow-up can go the same day as a check-in, and each system is wired once, after which new emails are built in OnchainSuite with no further developer work.",
        },
        {
          kind: "table",
          head: ["System", "What it reports"],
          rows: [
            [
              "Haus OS",
              "A waitlist joined, a ticket booked, a check-in, a refund and an order",
            ],
            [
              "Yauga App",
              "An account created, a session or challenge completed, a membership started or cancelled",
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
              "Opt-ins, through an OnchainSuite form with double opt-in",
            ],
            ["Back to HQ Control", "Unsubscribes and clicks, by webhook"],
          ],
        },
        {
          kind: "artifact",
          code: "04.05",
          title: "How it connects",
          diagram: {
            type: "flow",
            nodes: [
              { label: "Yauga systems", note: "Haus OS, the app, Cult, HQ" },
              { label: "One record", note: "tagged as events arrive" },
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
          text: "We chose direct events because they are live and each system stands on its own. Haus OS could forward the app's and the ring's events if Yauga's developers prefer one pipe, at the cost of both depending on Haus OS, while nightly files arrive too late to start a flow and events older than seven days are refused, so an import is for existing history only.",
        },
        {
          kind: "p",
          text: "The plan is sized to contacts, Launch at 2,500 and Growth at 25,000, and OnchainSuite brings the event list and tag scheme, the segments and automations built and tested, Yauga Letters structured by focus and city, reporting on the loop, and a team running it alongside Yauga's.",
        },
      ],
    },
    {
      id: "need",
      title: "What we need from Yauga",
      blocks: [
        {
          kind: "p",
          text: "Six things before anything is wired:",
        },
        {
          kind: "list",
          items: [
            "One member ID shared by Haus OS and the app, because otherwise email is the only way to join a person's record together",
            "A developer to connect each system once",
            "An opt-in tick at checkout and at app sign-up",
            "City and focus values sent the same way from every system",
            "HQ Control listening for unsubscribes",
            "The city leads' local news sent to HQ, never out from the city",
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
          kind: "p",
          text: "This is the strategy, and copy and timing come after Yauga agrees the approach.",
        },
      ],
    },
  ],
};
