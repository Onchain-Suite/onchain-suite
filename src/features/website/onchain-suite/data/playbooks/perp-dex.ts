/* The perp DEX growth and retention strategy, written as prose: one short
   chapter per moment that decides whether a trader stays.
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
   - Apple Mail opens emails by itself (62.26% of opens, July 2026: Litmus).
   Section ids that existed before the rewrite (says, campaigns,
   retention-triggers, newsletter, measure, platform, need) are kept, so deep
   links already sent still land on the matching section. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const PERP_DEX: PlaybookChapter = {
  id: "perp-dex",
  number: "01",
  title: "Perp DEX growth and retention strategy",
  dek: "How email and in-app bring traders back week after week, and keep their margin with you between trades.",
  tldr: [
    "Perp DEXs traded $644.7B in the 30 days to 14 October 2026, by DefiLlama's count, and a good share of that volume was rented. During Arbitrum's incentive programme, the subsidy explained 70% of Vertex's volume and 43% of GMX's, and by June 2024 volume was back where it started.",
    "Whether a trader stays is settled early. In dYdX's third and sixth seasons, ==between a fifth and a quarter of traders traded on a single day== and never came back, according to Chaos Labs. So this strategy is built around four moments: the first trade, the second, the first liquidation, and the week a trader goes quiet.",
    "At each one, an email or an in-app message starts from what the trader just did, and stops as soon as they act.",
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
          text: "What we do send is the record: fills, liquidations, funding and fees as the exchange logged them, with the time. We explain what a tool does before suggesting when to use it, show the full cost of a trade including funding and slippage, and say who can trade before inviting anyone in. Every message goes to a segment and carries one link, and promotion only reaches people who agreed to it.",
        },
      ],
    },
    {
      id: "first-trade",
      title: "The first trade",
      blocks: [
        {
          kind: "p",
          text: "A trader who deposits margin and does not trade within a day is usually stuck on something small: the order form, margin modes, or which network to deposit on.",
        },
        {
          kind: "p",
          text: "While they are still in the app, an in-app walkthrough shows them how to place an order. If 24 hours pass with no trade, one email follows with a short guide and the deposit mistakes we see most often. Both stop the moment they trade.",
        },
      ],
    },
    {
      id: "second-trade",
      title: "The second trade",
      blocks: [
        {
          kind: "p",
          text: "The second trade tells you more than the first, because it is the first time a trader chose to come back. If a week passes after their first position closes, we send one message on setting a stop-loss and sizing a position before the next trade. It stops when they trade again.",
        },
        {
          kind: "p",
          text: "Fees are the next lesson. A 2026 study presented at the AFT conference followed people trading through Hyperliquid's own web app from March 2025 to June 2026: they lost $1.11B, and $725M of it was fees. When a trader has paid taker fees on most of their trades for a month, we show them what they paid and how maker orders, and any discounts the venue offers, bring it down. Paying less keeps them trading without asking them to trade more.",
        },
      ],
    },
    {
      id: "retention-triggers",
      title: "After a liquidation",
      blocks: [
        {
          kind: "p",
          text: "A liquidation is when a trader decides whether the venue is on their side. The same study found that web-app traders took 96% of Hyperliquid's liquidation volume, and no venue we checked documents its own liquidation warnings. Hyperliquid's Android push covers fills only, so traders lean on third-party bots.",
        },
        {
          kind: "p",
          text: "So the warning comes first. When a position nears its liquidation price, in-app and email go out together with the position, the price that would close it, and what reducing the position or adding margin would change. This message always sends, whatever the frequency cap.",
        },
        {
          kind: "p",
          text: "If the position is liquidated, an email follows within hours. It says what happened in plain words and how stop-losses and position sizing work, and it never asks the trader to deposit again or size up. After the October 2025 cascade, The Block found daily liquidations up 70% the following week: traders who had just been liquidated came back and were liquidated again. This email exists to slow that down.",
        },
        {
          kind: "p",
          text: "Take Ada. She deposits, opens a small ETH long on her first day, and is liquidated on day six. That afternoon she gets the explanation and nothing else. On day nine she trades again, this time with a stop-loss set.",
        },
        {
          kind: "p",
          text: "Deleveraging and a large funding payment get the same treatment: one message that day, saying which position and why, with no offer attached.",
        },
      ],
    },
    {
      id: "quiet",
      title: "When a trader goes quiet",
      blocks: [
        {
          kind: "p",
          text: "We measure each trader against their own habits. When their weekly volume falls to half their usual level, they get one check-in about what is new, and it stops when their volume returns. When someone withdraws more than half their collateral, they get one question: what could we do better? Fourteen days later, if they have not deposited again, they hear what has shipped since.",
        },
        {
          kind: "p",
          text: "After 60 days without a trade, a trader gets one good reason to come back. Then we leave them alone.",
        },
        {
          kind: "p",
          text: "Before any of this is read as retention, airdrop farmers come out of the numbers. On Trade.xyz, Arrakis found farmers were 44% of wallets and 0.77% of volume. Left in, they make every Loop look as if it is failing.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "News worth sending",
      blocks: [
        {
          kind: "p",
          text: "Some messages go to many traders at once because something changed. A new market goes to people who traded the closest markets in the last 90 days, in countries that can trade it, with its leverage limits, fees and opening time. A rules change, such as to margin modes or deleveraging, goes to the traders whose open positions it affects. An incentive change goes to everyone earning points or rebates, by tier, with the date as published.",
        },
        {
          kind: "p",
          text: "These are the messages that hold traders when incentives fade. After dYdX cut its trading bonuses, Chaos Labs found volume fell 35% in season five, and GMX's second incentive round added under 2% of volume. A trader who hears about a new market, or a rule that touches their position, has a reason to stay that outlasts the season.",
        },
      ],
    },
    {
      id: "newsletter",
      title: "The weekly letter",
      blocks: [
        {
          kind: "p",
          text: "Traders who opt in to news get one email a week: 300 to 400 words with one main button. It opens with the week in a line, covering volume, open interest and funding on the main markets, with the date we checked. Then what is new, one explainer on something like funding or cross and isolated margin, and the support question of the week, such as deposits sent on the wrong network. It closes with the dates coming up: listings, rule changes and season dates.",
        },
        {
          kind: "p",
          text: "There are no market calls, price predictions or PnL screenshots. The letter keeps traders warm between sessions, so the next listing lands with someone who remembers you, and it answers questions before they turn into support tickets.",
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
          text: "The numbers we watch are funded traders who place a first trade within 7 days, traders who place a second within 7 days of the first, liquidations among warned traders against the holdout over 30 days, the share of fills placed as maker orders after the fee message, margin still deposited between trades, and traders still active at 30, 60 and 90 days. Unsubscribes, complaints and bounces are checked on every send. Targets are set once the first month gives us a baseline.",
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every message above starts from something a wallet did: a deposit, a position, a liquidation. If the exchange's contracts live on Ethereum, Base, Arbitrum, Optimism or Polygon, OnchainSuite watches them directly. On an app-chain such as Hyperliquid, or on Solana, your backend sends the same events through the Automation Trigger API, and Hyperliquid already streams fills, liquidations, funding and deposits for any address. Points and XP usually live off-chain, so your backend sends them or we leave them out.",
        },
        {
          kind: "p",
          text: "A mainstream email tool could run the news and the weekly letter. It cannot see a position close or a liquidation land, so the first-trade, liquidation and quiet-trader messages would have to go.",
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
          text: "Six answers before the first send. Where your email addresses come from and what people agreed to receive, which decides who hears from us straight away and who is asked first. Which chain the exchange runs on, and whether your backend can send fills, liquidations and margin data. Which countries your terms restrict and how that is enforced, so nothing reaches someone who cannot trade.",
        },
        {
          kind: "p",
          text: "Then the liquidation distance that should trigger a warning, since too early is noise and too late is useless. The domain the email sends from and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam. And who approves each message, and whose voice it goes out in.",
        },
      ],
    },
  ],
};
