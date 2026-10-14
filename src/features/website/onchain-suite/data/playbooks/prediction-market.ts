/* Chapter 02: the prediction market playbook.
   Evidence, checked 14 October 2026:
   - Polymarket open interest $510M (Nov 2024) to $120M (Dec 2024); monthly
     traders kept rising: The Block, 3 Jan and 6 Feb 2025.
   - Day after the 2024 election: volume -84%, daily users -53%: DL News.
   - Traders -47.6% Jan to Jun 2025 while average notional per account rose
     $2.7K to $4.8K: The Block, 10 Jul 2025.
   - 15.2% stop within 30 days of a loss vs 6.1% after a win, 2.9M retail
     accounts: Galaxy Research, 1 Oct 2026.
   - Positions are ERC-1155 on Polygon; UMA resolution, 2h challenge, 4 to 6
     days when disputed; redemption has no deadline: docs.polymarket.com.
   - ASA ruling against an ad that trivialised betting again after a loss,
     8 Apr 2026; CAP Code s.16; UKGC on prediction markets, 4 Feb 2026.
   - The Oracle newsletter, "over 90,000 subscribers": news.polymarket.com. */

import {
  BASE_QUESTIONS,
  MEASURE_NOTE,
  platformSection,
  RULES_LINE,
} from "@/onchain-suite-website/data/playbooks/shared";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const PREDICTION_MARKET: PlaybookChapter = {
  id: "prediction-market",
  number: "02",
  kicker: "Chapter 02 · Prediction markets",
  title: "The prediction market playbook",
  dek: "How email and in-app keep a forecaster coming back after the market they came for has resolved.",
  tldr: [
    "Prediction markets win users around events and lose them between events. After the 2024 US election, Polymarket's open interest fell from $510M to $120M in a month, while its monthly traders kept rising. The users stayed curious. The capital left.",
    "The moment that decides whether a user returns is their first result, and the riskiest is their first loss. In Galaxy's study of 2.9 million retail accounts, ==15.2% stopped trading within 30 days of a loss, against 6.1% after a win==.",
    `This playbook sets out how email and in-app change that, in five parts: campaigns, automation, lifecycle, retention triggers and the newsletter. ${RULES_LINE}`,
  ],
  sections: [
    {
      id: "says",
      title: "What email says, and what it never says",
      blocks: [
        {
          kind: "says",
          always: [
            "The result, the payout and the date, as the market settled them",
            "A market's real close time as the only deadline",
            "Dispute timelines as the resolution source publishes them",
            "Who can trade a market, before anyone is invited into it",
          ],
          never: [
            '"Win it back", "get even", "you\'re due", or any nudge after a loss',
            '"Risk-free", "guaranteed", "free money" or "big payout"',
            "Expiry language on winnings that do not expire",
            'Urgency such as "before the odds move"',
            "Skill-not-gambling framing to readers in the UK",
            "Any promotion to a blocked or self-excluded user",
          ],
        },
        {
          kind: "note",
          text: "After a loss, the message is the result and the tools. Nothing else.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "1. Campaigns",
      whw: {
        what: "A campaign is one message sent to a chosen segment at a set moment, because something is happening they should hear about. For a prediction market, that moment is almost always an event on the calendar.",
        how: [
          {
            kind: "p",
            text: "We run campaigns around events with a fixed date, and only to people who traded that topic or asked to hear about it.",
          },
          {
            kind: "table",
            head: ["Campaign", "Goes to", "Says", "One button"],
            rows: [
              [
                "Event opener",
                "Anyone who traded the topic in the last 90 days, or follows it",
                "The flagship market for the event, its close time and how it resolves",
                "See the market",
              ],
              [
                "Resolution week",
                "Holders of positions in the event's markets",
                "When each market resolves, the resolution source, and what happens if it is disputed",
                "See my positions",
              ],
              [
                "Event recap",
                "Everyone who traded the event",
                "Their markets, their results and the next event in the same topic",
                "Follow the topic",
              ],
            ],
          },
        ],
        why: "Event attention fades fast. The day after the 2024 US election, Polymarket's volume fell 84% and its daily users 53%. A recap that names the next event in the same topic, sent while the last one is fresh, turns a one-off visit into a habit.",
      },
    },
    {
      id: "automation",
      title: "2. Automation",
      whw: {
        what: "An automated message sends itself to one person when they do something, or stop doing something, and stops as soon as they take the step it asks for. In OnchainSuite these are Loops.",
        how: [
          {
            kind: "loops",
            loops: [
              {
                name: "First position",
                startsWhen: "Deposited, no position after 24 hours",
                sends:
                  "In-app: three open markets in topics they browsed. Email: how a market works, from position to payout",
                stopsWhen: "First position",
              },
              {
                name: "Market resolved",
                startsWhen: "A market they hold resolves",
                sends:
                  "The result and, if they won, one button to claim. No offer attached",
                stopsWhen: "Single message",
              },
              {
                name: "Unclaimed winnings",
                startsWhen:
                  "Winnings still unclaimed 48 hours after resolution",
                sends:
                  "A reminder with the amount, and that it does not expire",
                stopsWhen: "Claimed",
              },
              {
                name: "Under review",
                startsWhen: "A market they hold is disputed",
                sends:
                  "What a dispute is, the usual timeline, and where to follow it",
                stopsWhen: "The market settles",
              },
              {
                name: "Your topics",
                startsWhen: "A new market opens in a topic they traded",
                sends:
                  "The new market and one line on why it matters. At most one a day",
                stopsWhen: "Single message",
              },
              {
                name: "One-event users",
                startsWhen: "One position, then nothing for 14 days",
                sends:
                  "Upcoming markets in the same topic, with their close dates",
                stopsWhen: "New position",
              },
            ],
          },
          {
            kind: "p",
            text: "On Polymarket, positions are ERC-1155 tokens on Polygon and resolution runs through UMA on-chain, so OnchainSuite can watch both directly. On an off-chain venue, the same events come in from your backend through the Automation Trigger API.",
          },
        ],
        why: "Thousands of people sit at different points at once, and nobody can message each one at the right moment by hand. Automation does it, and because each Loop stops on the action, nobody gets chased for something they already did.",
      },
    },
    {
      id: "lifecycle",
      title: "3. Lifecycle",
      whw: {
        what: "Lifecycle is the path from first visit to regular forecaster. We split it into stages and always know which stage each person is in, worked out from what they did, never set by hand.",
        how: [
          {
            kind: "artifact",
            code: "02.01",
            title: "The forecaster lifecycle",
            diagram: {
              type: "ladder",
              steps: [
                { label: "Funded", note: "deposited, no position yet" },
                { label: "First position", note: "holds one market" },
                { label: "First result", note: "a market they held resolved" },
                {
                  label: "Regular",
                  note: "positions across 2+ resolution cycles",
                },
                {
                  label: "Between events",
                  note: "no new position in 14 days",
                  tone: "orange",
                },
                { label: "Dormant", note: "60 days quiet", tone: "grey" },
              ],
            },
          },
          {
            kind: "table",
            head: ["Stage", "What it means", "The message's job"],
            rows: [
              [
                "Funded",
                "Deposited, no position yet",
                "Show three markets they would care about",
              ],
              [
                "First position",
                "Holds one market",
                "Explain how it resolves and when",
              ],
              [
                "First result",
                "A market they held has resolved",
                "Deliver the result cleanly, win or lose",
              ],
              [
                "Regular",
                "Positions across two or more resolution cycles",
                "New markets in their topics, and the newsletter",
              ],
              [
                "Between events",
                "No new position in 14 days",
                "The next dated event in a topic they traded",
              ],
              [
                "Dormant",
                "60 days quiet",
                "One good reason to return, then rest",
              ],
            ],
          },
          {
            kind: "path",
            name: "One user's path: Ada",
            steps: [
              {
                when: "Day 0",
                what: "Ada signs up with her email during a football final and deposits.",
              },
              {
                when: "Day 1",
                what: "No position yet. The First position Loop shows her three open football markets in-app. She takes one.",
              },
              {
                when: "Day 3",
                what: "Her market resolves and she lost. She gets the result, her balance and a link to deposit limits. Nothing invites a new position.",
              },
              {
                when: "Day 10",
                what: "A new market opens in the league she traded. One email, one line on why it matters.",
              },
              {
                when: "Day 24",
                what: "Nothing since. The One-event users Loop sends the next fixtures with their close dates. She opens a position and is a Regular again.",
              },
            ],
          },
        ],
        why: "One blended retention number hides what is happening. Between January and June 2025, Polymarket's active traders fell 47.6% while the average position per account rose from $2.7K to $4.8K: fewer people, bigger positions. Stages, read by size, show which of the two you are looking at.",
      },
    },
    {
      id: "retention-triggers",
      title: "4. Retention triggers",
      whw: {
        what: "A retention trigger is a single message sent the same day something happens to a user's positions. These are service messages: no offer, no forecast.",
        how: [
          {
            kind: "table",
            head: ["Moment", "What it says", "Channel"],
            rows: [
              [
                "Market resolved, user won",
                "The result, the payout and one button to claim",
                "In-app if they are active, email otherwise",
              ],
              [
                "Market resolved, user lost",
                "The result and their balance, with a link to limits and tools. Nothing that invites a new position",
                "Email",
              ],
              [
                "Market disputed",
                "That it is under review, how long reviews usually take, and where to follow it",
                "Email",
              ],
              [
                "Winnings unclaimed",
                "The amount waiting, and that it does not expire",
                "In-app, then email after 48 hours",
              ],
              [
                "Rules clarified",
                "What changed in a market they hold, in plain words",
                "Email",
              ],
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Two rules we never bend",
            items: [
              "A service message never carries an offer.",
              "After a loss we share the result and nothing else. We never use win-it-back language.",
            ],
          },
          {
            kind: "note",
            text: "15.2% churn after a loss, 6.1% after a win. This is the message that matters most.",
          },
        ],
        why: "The first loss is where users leave, at 2.5 times the rate after a win. It is also where regulators look hardest: in April 2026 the UK's ASA banned an ad for making light of betting again after a loss. A clear, factual result keeps trust without crossing that line. Disputes need their own message too: a disputed market on Polymarket takes four to six days to settle, against about two hours when nobody disputes it.",
      },
    },
    {
      id: "newsletter",
      title: "5. Newsletter",
      whw: {
        what: "One email a week to everyone who confirmed their address and opted in to news.",
        how: [
          {
            kind: "list",
            ordered: true,
            items: [
              "**The week in one line.** Markets resolved, markets opening and the biggest moves, with the date we checked.",
              "**Three markets closing this week.** The question, the close time and how it resolves.",
              "**Three new markets** in the topics this reader trades.",
              "**How resolution works.** One short explainer: a dispute, a rules change, an oracle.",
              "**The calendar.** Fixed dates in the next four weeks.",
            ],
          },
          {
            kind: "p",
            text: "350 to 450 words, one main button, and the same blocks every week, so one person can build it in two hours. It goes to engaged readers first.",
          },
          {
            kind: "note",
            text: "Polymarket's own newsletter has over 90,000 subscribers. Readers want the context, not only the odds.",
          },
        ],
        why: "It keeps people warm between events, so the next one does not land on someone who has forgotten you. The explainer block answers the loudest complaint, how markets resolve, before it becomes a support ticket.",
      },
    },
    {
      id: "channels",
      title: "Email and in-app: one owner per step",
      blocks: [
        {
          kind: "p",
          text: "Each step has one channel that owns it. The other is a fallback that fires only if the first went unread, never a duplicate.",
        },
        {
          kind: "table",
          head: ["Step", "Owner", "Fallback"],
          rows: [
            [
              "First position",
              "In-app, while they are in the app",
              "Email after 24 hours",
            ],
            [
              "Result, user won",
              "In-app if they are active",
              "Email if unread after 2 hours",
            ],
            ["Result, user lost", "Email", "None"],
            ["Market under review", "Email", "A banner on the market page"],
            ["Your topics", "Email", "None"],
          ],
        },
        {
          kind: "p",
          text: "A frequency cap counts every channel together. Service messages, such as a result, always send.",
        },
      ],
    },
    {
      id: "data",
      title: "The events we need",
      blocks: [
        {
          kind: "p",
          text: "Few events, defined precisely. On-chain venues give us most of them directly. Off-chain venues send them from their backend.",
        },
        {
          kind: "table",
          head: ["Event", "Where it comes from"],
          rows: [
            [
              "deposit_made",
              "Collateral arriving in the user's wallet, or your backend",
            ],
            ["position_opened", "The position token received by the wallet"],
            [
              "market_resolved",
              "The oracle's settlement on-chain, or your settlement job",
            ],
            [
              "market_disputed",
              "The dispute raised on the oracle, or your review queue",
            ],
            ["winnings_redeemed", "The redemption transaction"],
            ["topic_followed", "Your app, through the OnchainSuite SDK"],
            [
              "self_excluded",
              "Your account system: a suppression signal, never a trigger",
            ],
          ],
        },
        {
          kind: "note",
          text: "Self-exclusion and deposit limits suppress every promotional message, the same day.",
        },
      ],
    },
    {
      id: "messages",
      title: "Example messages",
      blocks: [
        {
          kind: "messages",
          messages: [
            {
              type: "Market resolved, user won, in-app and email",
              channels: "in-app-and-email",
              subject: "Your market resolved: you won $240",
              preview: "Your winnings are ready to claim in one step",
              body: [
                'The market "Will the Fed cut rates in December?" resolved YES.',
                "Your position paid out $240. It is ready to claim now.",
              ],
              action: "Claim $240",
            },
            {
              type: "Market resolved, user lost, email",
              channels: "email",
              subject: "Your market resolved",
              preview: "The result, your balance, and your account tools",
              body: [
                'The market "Will the Fed cut rates in December?" resolved NO.',
                "Your position in it has closed. Your balance is $180.",
                "If you want to, you can set a deposit limit or take a break from your account settings at any time.",
              ],
              action: "See my account",
            },
            {
              type: "Market under review, email",
              channels: "email",
              subject: "Your market is under review",
              preview: "What a dispute means, and when to expect the result",
              body: [
                'The result of "Will the Fed cut rates in December?" has been disputed, so it is being reviewed before it settles.',
                "Reviews usually take four to six days. Your position stays as it is until then, and we will email you the result the same day it settles.",
              ],
              action: "Follow the review",
            },
          ],
        },
      ],
    },
    {
      id: "measure",
      title: "What we measure",
      blocks: [
        {
          kind: "kpis",
          rows: [
            {
              what: "Funded users who open a first position",
              window: "7 days",
            },
            {
              what: "Users who open a new position after their first market resolves",
              window: "14 days",
            },
            {
              what: "Return rate after a first loss, against the holdout",
              window: "30 days",
            },
            {
              what: "Winnings claimed after the unclaimed reminder",
              window: "48 hours",
            },
            {
              what: "Users active across two or more resolution cycles",
              window: "60 days",
            },
            {
              what: "Unsubscribes, complaints and bounces",
              window: "Every send",
            },
          ],
        },
        { kind: "p", text: MEASURE_NOTE },
        {
          kind: "callout",
          tone: "note",
          title: "Questions your team can ask your data",
          items: [
            "Which users opened a position on one election market and nothing since?",
            "Which topics bring users back most often?",
            "How long after a first loss do returning users come back?",
          ],
        },
      ],
    },
    platformSection(
      "Everything above runs in it. The Loops start from position and settlement events, the segments come from positions and topics, and the results are read from the same data."
    ),
    {
      id: "need",
      title: "What we need from you",
      blocks: [
        {
          kind: "table",
          head: ["Question", "Why it matters"],
          rows: [
            BASE_QUESTIONS[0],
            [
              "Which countries can trade, and how is that enforced at sign-up?",
              "No message goes to someone who cannot use the market",
            ],
            [
              "How do you record self-exclusion and deposit limits?",
              "They suppress every promotional message, the same day",
            ],
            [
              "Is settlement on-chain, or can your backend send it to us?",
              "Decides whether triggers watch the chain or come through the API",
            ],
            BASE_QUESTIONS[1],
            BASE_QUESTIONS[2],
          ],
        },
      ],
    },
  ],
};
