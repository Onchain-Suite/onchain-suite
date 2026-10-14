/* Chapter 01: the perp DEX playbook.
   Evidence, checked 14 October 2026:
   - Perp DEX 30-day volume $644.7B, OI $13.6B; Hyperliquid 57.3% of OI:
     defillama.com/perps.
   - Arbitrum STIP explained 70% of Vertex volume and 43% of GMX; volume back
     to pre-programme levels by June 2024: ARDC, Arbitrum forum.
   - dYdX: 19.5% (S3) and 26% (S6) of traders traded on one day only; cutting
     bonuses cost 35% of volume in season 5: Chaos Labs reports.
   - Hyperliquid front-end traders lost $1.11B, of which $725M fees, and took
     96% of liquidation volume, 27 Mar 2025 to 30 Jun 2026: AFT 2026 paper.
   - After the Oct 2025 cascade, next-week volume +17% and daily liquidations
     +70%: The Block, 21 Oct 2025.
   - Trade.xyz: farmers 44% of wallets, 0.77% of volume: Arrakis, Mar 2026.
   - Hyperliquid streams fills, liquidations, funding, deposits per address
     on a public websocket; Android push covers fills only: Hyperliquid docs
     and announcements.
   - ESMA 24 Feb 2026: crypto perps likely CFDs; "get started now" emails to
     all clients non-compliant. FCA: volume-linked fee rebates and referral
     bonuses are banned incentives. CFTC: "add more money" pitches are red
     flags. */

import {
  BASE_QUESTIONS,
  MEASURE_NOTE,
  platformSection,
  RULES_LINE,
} from "@/onchain-suite-website/data/playbooks/shared";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const PERP_DEX: PlaybookChapter = {
  id: "perp-dex",
  number: "01",
  kicker: "Chapter 01 · Perp DEXs",
  title: "The perp DEX playbook",
  dek: "How email and in-app bring traders back week after week, and keep their margin with you between trades.",
  tldr: [
    "Perp DEXs traded $644.7B in the 30 days to 14 October 2026, and much of that volume is rented. In Arbitrum's incentive programme, the subsidy explained 70% of Vertex's volume and 43% of GMX's, and volume was back to where it started within months of it ending.",
    "The traders who stay are decided early. On dYdX, ==a fifth to a quarter of traders traded on a single day== and never came back, and on Hyperliquid, people trading through its own web app took 96% of liquidation volume. The first trade, the second trade and the first liquidation are the moments that matter.",
    `This playbook sets out how email and in-app keep them, in five parts: campaigns, automation, lifecycle, retention triggers and the newsletter. ${RULES_LINE}`,
  ],
  sections: [
    {
      id: "says",
      title: "What email says, and what it never says",
      blocks: [
        {
          kind: "says",
          always: [
            "Fills, liquidations, funding and fees as the exchange recorded them, with the time",
            "What a tool does, such as a stop-loss or a maker order, before when to use it",
            "The full cost of a trade: fees, funding and slippage, not only the headline fee",
            "Who can trade, before anyone is invited in",
          ],
          never: [
            "Any nudge to add leverage, size or margin to win back a loss",
            '"Guaranteed", "risk-free", "safe", "easy" or "liquidation-proof"',
            "Deposit bonuses, matching, free credits, or trade-more-to-reach-a-tier rebates",
            "Countdowns and urgency that the product does not have",
            "PnL screenshots or leaderboard winners without a past-performance warning",
            "Any message to a restricted country, or a hint of using a VPN",
          ],
        },
        {
          kind: "note",
          text: "We never message a trader to take on more risk. Messages explain tools and share what is new.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "1. Campaigns",
      whw: {
        what: "A campaign is one message sent to a chosen segment at a set moment, because something is happening they should hear about. On a perp DEX that is a listing, a change to the rules, or a change to incentives.",
        how: [
          {
            kind: "table",
            head: ["Campaign", "Goes to", "Says", "One button"],
            rows: [
              [
                "New market",
                "Traders active in the closest markets in the last 90 days, in countries that can trade it",
                "The market, its leverage limits and fees, and when it opens",
                "See the market",
              ],
              [
                "Rules change",
                "Traders with open positions the change affects",
                "What changes, such as margin mode or deleveraging rules, when, and what it means for their positions",
                "See what changes",
              ],
              [
                "Incentive change",
                "Everyone earning points or rebates, by tier",
                "What changes and the date it changes, as published",
                "See my account",
              ],
            ],
          },
          {
            kind: "p",
            text: 'Nothing goes to the whole list. In February 2026, Europe\'s securities regulator named =="get started now" emails sent to all clients== as non-compliant for products it treats as CFDs, which is where it now places crypto perps.',
          },
        ],
        why: "Incentive volume leaves when the incentive does: after dYdX cut its trading bonuses, volume fell 35% in a season, and GMX's second incentive round added under 2% of volume. A message about a rules change or a new market, sent to the traders it affects, gives them a reason to stay that does not depend on the next season.",
      },
    },
    {
      id: "automation",
      title: "2. Automation",
      whw: {
        what: "An automated message sends itself to one trader when they do something, or stop doing something, and stops as soon as they take the step it asks for. In OnchainSuite these are Loops.",
        how: [
          {
            kind: "loops",
            loops: [
              {
                name: "First trade",
                startsWhen: "Margin deposited, no trade after 24 hours",
                sends:
                  "In-app walkthrough of placing an order, then one email with a short guide and the deposit mistakes to avoid",
                stopsWhen: "First trade",
              },
              {
                name: "Second trade",
                startsWhen: "First trade closed, nothing after 7 days",
                sends:
                  "How to set a stop-loss and size a position before the next one",
                stopsWhen: "Second trade",
              },
              {
                name: "After a liquidation",
                startsWhen: "Position liquidated",
                sends:
                  "Within hours: what happened, in plain words, and how stop-losses and position sizing work. No promotion",
                stopsWhen: "Single message",
              },
              {
                name: "Fee saver",
                startsWhen:
                  "Paid taker fees on most trades in the last 30 days",
                sends:
                  "What they paid in fees, and how maker orders and any discounts the venue offers lower it",
                stopsWhen: "Single message",
              },
              {
                name: "Slipping",
                startsWhen: "Weekly volume falls to half of their own average",
                sends: "A check-in about what changed and what is new",
                stopsWhen: "Volume returns",
              },
              {
                name: "Collateral out",
                startsWhen: "Withdrew more than half their collateral",
                sends:
                  "One question: what could we do better. Then, after 14 days, what has shipped since",
                stopsWhen: "New deposit",
              },
            ],
          },
          {
            kind: "p",
            text: "On an exchange whose contracts live on Ethereum, Base, Arbitrum, Optimism or Polygon, OnchainSuite watches deposits, positions and liquidations directly. On an app-chain such as Hyperliquid, or on Solana, the same events come in from your backend through the Automation Trigger API. Hyperliquid already streams fills, liquidations, funding and deposits for any address.",
          },
        ],
        why: "Fees, not liquidations, are where most retail money goes: of the $1.11B lost over 15 months by people trading through Hyperliquid's web app, $725M was fees. Teaching a trader to pay less keeps them trading without asking them to trade more, and every Loop stops on the action, so nobody gets chased for something they already did.",
      },
    },
    {
      id: "lifecycle",
      title: "3. Lifecycle",
      whw: {
        what: "Lifecycle is the path from first deposit to regular trader. We split it into stages and always know which stage each trader is in, worked out from what they did.",
        how: [
          {
            kind: "artifact",
            code: "01.01",
            title: "The trader lifecycle",
            diagram: {
              type: "ladder",
              steps: [
                { label: "Funded", note: "margin in, no trade yet" },
                { label: "First trade", note: "one position opened" },
                { label: "Second trade", note: "came back within 7 days" },
                { label: "Regular", note: "trades most weeks" },
                {
                  label: "Slipping",
                  note: "weekly volume halved",
                  tone: "orange",
                },
                { label: "Dormant", note: "60 days, no trade", tone: "grey" },
              ],
            },
          },
          {
            kind: "table",
            head: ["Stage", "What it means", "The message's job"],
            rows: [
              [
                "Funded",
                "Margin deposited, no trade yet",
                "Remove the blocker to the first order",
              ],
              [
                "First trade",
                "One position opened",
                "Show the tools that protect the next one",
              ],
              [
                "Second trade",
                "Came back within 7 days",
                "The markets they trade and what is new in them",
              ],
              [
                "Regular",
                "Trades most weeks",
                "Recognition, a direct line to the team, the newsletter",
              ],
              [
                "Slipping",
                "Weekly volume halved against their own average",
                "A check-in about what changed",
              ],
              [
                "Dormant",
                "60 days without a trade",
                "One good reason to return, then rest",
              ],
            ],
          },
          {
            kind: "path",
            name: "One trader's path: Ada",
            steps: [
              {
                when: "Day 0",
                what: "Ada deposits margin and gives her email to get trade receipts.",
              },
              {
                when: "Day 1",
                what: "No trade yet. The First trade Loop walks her through placing an order in-app. She opens a small ETH long.",
              },
              {
                when: "Day 6",
                what: "The position is liquidated. Within hours she gets a plain explanation and how stop-losses work. Nothing asks her to deposit again.",
              },
              {
                when: "Day 9",
                what: "She trades again, this time with a stop-loss set.",
              },
              {
                when: "Day 30",
                what: "Most of her fills were taker orders. The Fee saver message shows what she paid and how maker orders lower it.",
              },
              {
                when: "Day 52",
                what: "Her weekly volume halves. The Slipping Loop sends one check-in about what is new.",
              },
            ],
          },
          {
            kind: "note",
            text: "On Trade.xyz, airdrop farmers were 44% of wallets and 0.77% of volume. Segment them out before reading retention.",
          },
        ],
        why: "The first and second trades decide most of it: on dYdX, a fifth to a quarter of traders in a season traded on one day only. Stages make those moments visible, so the message lands while the trader is still deciding.",
      },
    },
    {
      id: "retention-triggers",
      title: "4. Retention triggers",
      whw: {
        what: "A retention trigger is a single message sent the same day something happens to a trader's account. These are service messages: no offer, no market call.",
        how: [
          {
            kind: "table",
            head: ["Moment", "What it says", "Channel"],
            rows: [
              [
                "Close to liquidation",
                "The position, its liquidation price and what reducing it or adding margin would change",
                "In-app and email at once",
              ],
              [
                "Liquidated",
                "What happened in plain words, and how stop-losses and position sizing work",
                "Email, in-app on next visit",
              ],
              [
                "Deleveraged",
                "Which position was reduced, why, and what it means for any hedge",
                "Email",
              ],
              [
                "Large funding paid",
                "What funding is, and what they paid on which position",
                "Email",
              ],
              [
                "Collateral withdrawn",
                "One question: what could we do better",
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
              "After a liquidation we explain and stop. We never prompt a trader to deposit again or size up.",
            ],
          },
          {
            kind: "note",
            text: "After the October 2025 cascade, daily liquidations rose 70% the next week. Liquidated traders came back and got liquidated again.",
          },
        ],
        why: "A liquidation is the moment a trader decides whether the venue is on their side, and the wrong follow-up does harm. No venue we checked documents its own liquidation warnings: Hyperliquid's push covers fills only, and traders rely on third-party bots. The venue that warns first, and explains after, is the one they come back to.",
      },
    },
    {
      id: "newsletter",
      title: "5. Newsletter",
      whw: {
        what: "One email a week to traders who opted in to news.",
        how: [
          {
            kind: "list",
            ordered: true,
            items: [
              "**The week in one line.** Volume, open interest and funding on your main markets, with the date we checked.",
              "**What is new.** Listings, product changes and fee changes.",
              "**One explainer.** Funding, liquidation price, cross and isolated margin, how deleveraging works.",
              "**Fix one mistake.** The support question of the week, such as deposits on the wrong network or a stop-loss that filled with slippage.",
              "**The calendar.** Fixed dates: listings, rule changes, season dates.",
            ],
          },
          {
            kind: "p",
            text: "300 to 400 words and one main button. No market calls, no price predictions, no PnL screenshots.",
          },
        ],
        why: "It keeps traders warm between sessions, so the next listing does not land on someone who has forgotten you. The explainer and the support block do the teaching that a liquidation notice has no room for, and they answer questions before they become tickets.",
      },
    },
    {
      id: "channels",
      title: "Email and in-app: one owner per step",
      blocks: [
        {
          kind: "table",
          head: ["Step", "Owner", "Fallback"],
          rows: [
            [
              "Close to liquidation",
              "In-app and email together",
              "None: this one goes on both",
            ],
            [
              "First trade",
              "In-app, while they are on the exchange",
              "Email after 24 hours",
            ],
            [
              "After a liquidation",
              "Email",
              "A notice in the app on their next visit",
            ],
            ["Fee saver", "Email", "None"],
            ["Slipping", "Email", "None"],
          ],
        },
        {
          kind: "p",
          text: "A frequency cap counts every channel together. Service messages, such as a liquidation notice, always send.",
        },
      ],
    },
    {
      id: "data",
      title: "The events we need",
      blocks: [
        {
          kind: "table",
          head: ["Event", "Where it comes from"],
          rows: [
            [
              "margin_deposited, margin_withdrawn",
              "Deposits and withdrawals on the exchange contract, bridge or ledger",
            ],
            [
              "position_opened, position_closed",
              "Position events, or fills from your backend",
            ],
            [
              "liquidation_risk",
              "Computed from the position, its margin and the mark price",
            ],
            [
              "liquidated, deleveraged",
              "The liquidation or deleveraging event, with the position and size",
            ],
            ["funding_paid", "Funding settlements per position"],
            ["vault_deposit, vault_withdrawal", "The vault contract or ledger"],
          ],
        },
        {
          kind: "note",
          text: "Points and XP usually live off-chain. Your backend sends them, or we leave them out.",
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
              type: "After a liquidation, email",
              channels: "email",
              subject: "What happened to your ETH position",
              preview: "A plain explanation, and two tools that help next time",
              body: [
                "Your ETH long was liquidated at 14:32 UTC when the price reached your liquidation level.",
                "Here is what that means: when losses on a position use up most of its margin, the position closes automatically so the loss cannot grow past what you put in.",
                "Two tools can help on your next trade. A stop-loss closes your position at a price you choose. The position size calculator shows how far the price can move before liquidation.",
              ],
              action: "See how stop-losses work",
            },
            {
              type: "Close to liquidation, in-app and email",
              channels: "in-app-and-email",
              subject: "Your BTC position is near liquidation",
              preview: "BTC at $58,900 would close it. Here are your options",
              body: [
                "Your BTC long is liquidated if the mark price reaches $58,900. It is $60,400 now.",
                "Reducing the position moves the liquidation price further away. Adding margin does the same, and puts more of your money in the position.",
              ],
              action: "Manage my position",
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
              what: "Funded traders who place a first trade",
              window: "7 days",
            },
            {
              what: "Traders who place a second trade after their first",
              window: "7 days",
            },
            {
              what: "Liquidations among warned traders, against the holdout",
              window: "30 days",
            },
            {
              what: "Share of fills placed as maker orders after the Fee saver message",
              window: "30 days",
            },
            {
              what: "Margin still deposited between trades",
              window: "30 days",
            },
            {
              what: "Traders still active after joining",
              window: "30, 60 and 90 days",
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
            "Which traders cut their volume by half this month?",
            "Which markets do our top traders use most?",
            "How many traders were liquidated twice within a week?",
          ],
        },
      ],
    },
    platformSection(
      "Everything above runs in it. The Loops start from deposit, position and liquidation events, the segments come from trading behaviour, and the results are read from the same data."
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
              "Which chain does the exchange run on, and can your backend send fills, liquidations and margin data?",
              "Decides whether triggers watch the chain or come through the API",
            ],
            [
              "Which countries are restricted in your terms, and how is that enforced?",
              "No message goes to someone who cannot trade",
            ],
            [
              "What liquidation distance should trigger a warning?",
              "Too early is noise, too late is useless",
            ],
            BASE_QUESTIONS[1],
            BASE_QUESTIONS[2],
          ],
        },
      ],
    },
  ],
};
