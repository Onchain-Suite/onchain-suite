/* The perp DEX growth and retention strategy, on the shared structure:
   campaigns and the newsletter, Loops, lifecycle (capture points, the six
   stages, exit points) and retention triggers, then what we measure, the
   platform and what we need. Channels sit underneath all four.
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
     flags.
   - Gmail and Yahoo bulk-sender rules since Feb 2024: SPF, DKIM, DMARC,
     one-click unsubscribe, spam rate under 0.3%.
   - Apple Mail opens emails by itself (62.26% of opens, July 2026: Litmus).
   Section ids shared by every strategy page: says, campaigns, loops,
   lifecycle, retention-triggers, measure, platform, need. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const PERP_DEX: PlaybookChapter = {
  id: "perp-dex",
  number: "01",
  title: "Perp DEX growth and retention strategy",
  dek: "How email and in-app bring traders back week after week, and keep their margin with you between trades.",
  tldr: [
    "Perp DEXs traded $644.7B in the 30 days to 14 October 2026, by DefiLlama's count, and a good share of that volume was rented. During Arbitrum's incentive programme, the subsidy explained 70% of Vertex's volume and 43% of GMX's, and by June 2024 volume was back where it started.",
    "Whether a trader stays is settled early. In dYdX's third and sixth seasons, ==between a fifth and a quarter of traders traded on a single day== and never came back, according to Chaos Labs. The first trade, the second, the first liquidation and the week a trader goes quiet are where this strategy does its work.",
    "It has four parts: campaigns and the newsletter, Loops, lifecycle, and retention triggers. Email and in-app are the channels that carry them. Every message goes to a segment and carries one link, and promotion only reaches people who agreed to it.",
  ],
  sections: [
    {
      id: "says",
      title: "What we never send",
      blocks: [
        {
          kind: "p",
          text: 'A perp DEX sells leverage, so every message is written as if a regulator will read it. In February 2026, Europe\'s securities regulator said crypto perps are likely CFDs and named "get started now" emails sent to every client as non-compliant. The FCA bans fee rebates tied to volume and referral bonuses, and the CFTC treats "add more money" pitches as a red flag.',
        },
        {
          kind: "p",
          text: "So we never nudge a trader to add leverage, size or margin, least of all to win back a loss. We never call anything guaranteed, risk-free, safe, easy or liquidation-proof. There are no deposit bonuses, matched deposits, free credits or rebates for trading more, no countdowns the product does not have, and no PnL screenshots or leaderboards without a past-performance warning. Nothing goes to a restricted country, and nothing hints at a VPN.",
        },
        {
          kind: "p",
          text: "What we do send is the record: fills, liquidations, funding and fees as the exchange logged them, with the time. We explain what a tool does before suggesting when to use it, show the full cost of a trade including funding and slippage, and say who can trade before inviting anyone in.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "Campaigns and the newsletter",
      blocks: [
        {
          kind: "p",
          text: "A campaign is one message to a segment because something changed, and it only goes to people who agreed to news. A new market goes to traders who traded the closest markets in the last 90 days, in countries that can trade it, with its leverage limits, fees and opening time. A rules change, such as to margin modes or deleveraging, goes to the traders whose open positions it affects. An incentive change goes to everyone earning points or rebates, by tier, with the date as published.",
        },
        {
          kind: "p",
          text: "These are the messages that hold traders when incentives fade. After dYdX cut its trading bonuses, Chaos Labs found volume fell 35% in season five, and GMX's second incentive round added under 2% of volume. A trader who hears about a new market, or a rule that touches their position, has a reason to stay that outlasts the season.",
        },
        {
          kind: "p",
          text: "The newsletter is one email a week to traders who opted in to news: 300 to 400 words with one main button. It opens with the week in a line, covering volume, open interest and funding on the main markets, with the date we checked. Then what is new, one explainer on something like funding or cross and isolated margin, and the support question of the week, such as deposits sent on the wrong network. It closes with the dates coming up: listings, rule changes and season dates.",
        },
        {
          kind: "p",
          text: "There are no market calls, price predictions or PnL screenshots. The letter keeps traders warm between sessions, so the next listing lands with someone who remembers you, and it answers questions before they turn into support tickets.",
        },
      ],
    },
    {
      id: "loops",
      title: "Loops",
      blocks: [
        {
          kind: "p",
          text: "A Loop is a sequence of messages to one trader. It starts from something they did, or did not do, and it stops the moment they take the step it asks for, so nobody is chased for something they already did. There is one Loop for each move between stages, and they run in this order.",
        },
        {
          kind: "p",
          text: "The welcome Loop starts at capture, the moment a trader gives an email address. One email confirms the address with a single click and says exactly what they agreed to receive: trade receipts and account messages, or those plus news, depending on the form. Once they confirm, a second message points them at one next action. It stops on confirmation, and nothing else goes to an address that has not confirmed. Those first sends also give a new sending domain its track record.",
        },
        {
          kind: "p",
          text: "The first-trade Loop starts when a trader has deposited margin and not traded within a day. They are usually stuck on something small: the order form, margin modes, or which network to deposit on. While they are still in the app, an in-app walkthrough shows them how to place an order. If 24 hours pass with no trade, one email follows with a short guide and the deposit mistakes we see most often. Both stop the moment they trade.",
        },
        {
          kind: "artifact",
          code: "01.01",
          title: "The first-trade Loop, from deposit to first trade",
          diagram: {
            type: "flow",
            nodes: [
              { label: "Margin in", note: "deposited, no trade" },
              { label: "A day passes", note: "still no order" },
              { label: "Walkthrough", note: "in-app, how to place an order" },
              { label: "One email", note: "short guide, deposit mistakes" },
              { label: "First trade", note: "the Loop stops" },
            ],
          },
        },
        {
          kind: "p",
          text: "The second-trade Loop starts when a week passes after a first position closes, because the second trade is the first time a trader chose to come back. It sends one message on setting a stop-loss and sizing a position before the next trade, and stops when they trade again.",
        },
        {
          kind: "p",
          text: "Fees are the next lesson. A 2026 study presented at the AFT conference followed people trading through Hyperliquid's own web app from March 2025 to June 2026: they lost $1.11B, and $725M of it was fees. When a trader has paid taker fees on most of their trades for a month, one message shows them what they paid and how maker orders, and any discounts the venue offers, bring it down. Paying less keeps them trading without asking them to trade more.",
        },
        {
          kind: "p",
          text: "The slipping Loop starts when a trader moves to At risk: their weekly volume falls to half their own average. They get one check-in about what is new, and it stops when their volume returns. When someone withdraws more than half their collateral, they get one question, what could we do better, and fourteen days later, if they have not deposited again, what has shipped since. It stops on a new deposit.",
        },
        {
          kind: "p",
          text: "The last Loop is one message. After 60 days without a trade, a Dormant trader gets one good reason to come back. Then we leave them alone.",
        },
        {
          kind: "p",
          text: "Each message in a Loop has one owner channel and a fallback: in-app owns the moment a trader is on the exchange, email owns the moment they are away from it, and a fallback only fires if the first went unread. A frequency cap counts every channel together, so a busy week in one does not add a busy week in the other. Retention triggers are the one exception, and always send.",
        },
      ],
    },
    {
      id: "lifecycle",
      title: "Lifecycle",
      blocks: [
        {
          kind: "p",
          text: "Every trader sits in one of six stages, the same six on every strategy we run: New, Activated, Engaged, At risk, Dormant and Won back. The stage is worked out from what they do on the exchange, never set by hand, and it is read by capital as well as by count, because a few wallets decide most of the curve. The lifecycle moves on patterns in what a trader does. Retention triggers, below, fire on single events, and the two never overlap.",
        },
        {
          kind: "p",
          text: "A lifecycle starts at a capture point, and each capture point sets what we are allowed to send. A wallet that connects is a contact with no email, reached in-app only. An email given to get trade receipts carries service consent: receipts, the welcome Loop and messages about their own account. An email from the newsletter form, or a campaign form whose consent line says so, carries news consent as well: campaigns and the letter. An embedded wallet sign-in through Privy or Magic gives both a wallet and an email, with whatever the sign-in page promised. A list the venue already holds carries whatever those people originally agreed to, and where nobody can show what that was, the first message asks. Two tiers, service and news, and a trader on service alone never sees a campaign.",
        },
        {
          kind: "artifact",
          code: "01.03",
          title: "The six stages of a trader",
          diagram: {
            type: "ladder",
            steps: [
              { label: "New", note: "margin in, no trade" },
              { label: "Activated", note: "first trade" },
              { label: "Engaged", note: "trades most weeks" },
              {
                label: "At risk",
                note: "weekly volume at half their own average",
                tone: "orange",
              },
              { label: "Dormant", note: "60 days, no trade", tone: "grey" },
              {
                label: "Won back",
                note: "traded again, watched 30 days",
                tone: "navy",
              },
            ],
          },
        },
        {
          kind: "p",
          text: "New is margin in and no trade; the first-trade Loop moves them on. Activated is the first trade; the second-trade Loop moves them on. Engaged is a trader who trades most weeks, and they get campaigns and the letter rather than a Loop. At risk is one rule on every strategy: activity at half the trader's own 30-day average, which here means weekly volume. It needs a baseline, so it applies from Engaged onward, and the slipping Loop answers it. Dormant is 60 days without a trade, one message, then rest. Won back is a trader who traded again from At risk or Dormant. They are watched for 30 days, then placed as Engaged or At risk like anyone else, and they never go back through the welcome.",
        },
        {
          kind: "p",
          text: "A lifecycle also has exit points, and the rule that keeps them straight is that marketing consent can be withdrawn while service messages about a position the trader still holds continue until the position is gone. An unsubscribe stops campaigns, the letter and every Loop; a liquidation warning still goes out while they have margin on the exchange. A spam complaint stops everything by email that day, and a hard bounce closes the email channel; both leave in-app, service only. A trader in a restricted country never enters promotion. A trader who withdraws everything is not an exit: they are At risk or Dormant, and get the one message and the rest. Rest itself is a state we count, so Dormant never looks like a backlog to work. An account closed, or an erasure request, ends everything, the record included.",
        },
        {
          kind: "p",
          text: "Take Ada. She deposits and gives her email to get trade receipts, confirms it with one click, and opens a small ETH long on her first day. On day six she is liquidated. That afternoon she gets the explanation and nothing else. On day nine she trades again, this time with a stop-loss set. By day 30 most of her fills were taker orders, so she sees what she paid in fees and how maker orders lower it. On day 52 her weekly volume halves, she moves to At risk, and the slipping Loop sends one check-in about what is new.",
        },
        {
          kind: "artifact",
          code: "01.02",
          title: "Ada's first two months",
          diagram: {
            type: "timeline",
            points: [
              { when: "Day 0", label: "Deposits margin, confirms her email" },
              { when: "Day 1", label: "Opens a small ETH long" },
              {
                when: "Day 6",
                label: "Liquidated; gets the explanation, nothing else",
              },
              { when: "Day 9", label: "Trades again with a stop-loss" },
              { when: "Day 30", label: "Sees what she paid in fees" },
              { when: "Day 52", label: "Volume halves; one check-in" },
            ],
          },
        },
        {
          kind: "p",
          text: "Before any of this is read as retention, airdrop farmers come out of the numbers. On Trade.xyz, Arrakis found farmers were 44% of wallets and 0.77% of volume. Left in, they make every stage look wrong from the first day.",
        },
      ],
    },
    {
      id: "retention-triggers",
      title: "Retention triggers",
      blocks: [
        {
          kind: "p",
          text: "A retention trigger is a single message sent the same day something happens to a trader's account. It comes from the position, never from a calendar, it carries no offer, and it always sends, whatever the frequency cap and whether or not they take news. It explains, then stops.",
        },
        {
          kind: "p",
          text: "A liquidation is when a trader decides whether the venue is on their side. The AFT study found that web-app traders took 96% of Hyperliquid's liquidation volume, and no venue we checked documents its own liquidation warnings. Hyperliquid's Android push covers fills only, so traders lean on third-party bots.",
        },
        {
          kind: "p",
          text: "So the warning comes first. When a position nears its liquidation price, in-app and email go out together with the position, the price that would close it, and what reducing the position or adding margin would change.",
        },
        {
          kind: "p",
          text: "If the position is liquidated, an email follows within hours. It says what happened in plain words and how stop-losses and position sizing work, and it never asks the trader to deposit again or size up. After the October 2025 cascade, The Block found daily liquidations up 70% the following week: traders who had just been liquidated came back and were liquidated again. This message exists to slow that down.",
        },
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
          ],
        },
        {
          kind: "p",
          text: "Deleveraging and a large funding payment get the same treatment: one message that day, saying which position and why, with no offer attached.",
        },
      ],
    },
    {
      id: "measure",
      title: "How we know it worked",
      blocks: [
        {
          kind: "p",
          text: "We count what traders do. Opens stopped meaning much once Apple Mail began opening emails by itself, so a message is judged by the trade, the deposit or the stop-loss that follows it. Every always-on Loop keeps a holdout, a small group left out on purpose, so we can show what the messages caused.",
        },
        {
          kind: "p",
          text: "Every Monday, a stage report shows how many traders sit at each stage, by count and by margin, and where most of them are stuck. That stage is where the next week's effort goes. Under it, the numbers we watch are funded traders who place a first trade within 7 days, traders who place a second within 7 days of the first, liquidations among warned traders against the holdout over 30 days, the share of fills placed as maker orders after the fee message, margin still deposited between trades, and traders still active at 30, 60 and 90 days. Unsubscribes, complaints and bounces are checked on every send, with the complaint rate held under the 0.3% Gmail and Yahoo allow. Targets are set once the first month gives us a baseline.",
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every Loop and every trigger above starts from something a wallet did: a deposit, a position, a liquidation. If the exchange's contracts live on Ethereum, Base, Arbitrum, Optimism or Polygon, OnchainSuite watches them directly. On an app-chain such as Hyperliquid, or on Solana, your backend sends the same events through the Automation Trigger API, and Hyperliquid already streams fills, liquidations, funding and deposits for any address. Points and XP usually live off-chain, so your backend sends them or we leave them out. The stages are computed from the same events, and the stage report reads from the same data.",
        },
        {
          kind: "p",
          text: "A mainstream email tool could run the campaigns and the weekly letter. It cannot see a position close or a liquidation land, so the Loops, the stages and the retention triggers would have to go.",
        },
        { kind: "p", text: DISCLOSURE },
      ],
    },
    {
      id: "need",
      title: "What we need from you",
      blocks: [
        {
          kind: "p",
          text: "Six answers before the first send. Where your email addresses come from and what people agreed to receive, which decides who is on service and who is on news from day one. Which chain the exchange runs on, and whether your backend can send fills, liquidations and margin data. Which countries your terms restrict and how that is enforced, so nothing reaches someone who cannot trade.",
        },
        {
          kind: "p",
          text: "Then the liquidation distance that should trigger a warning, since too early is noise and too late is useless. The domain the email sends from and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam. And who approves each message, and whose voice it goes out in.",
        },
      ],
    },
  ],
};
