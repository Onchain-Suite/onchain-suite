/* The prediction market growth and retention strategy, written as prose:
   one short chapter per moment that decides whether a user comes back.
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
   - The Oracle newsletter, "over 90,000 subscribers": news.polymarket.com.
   - Apple Mail opens emails by itself (62.26% of opens, July 2026: Litmus).
   Section ids that existed before the rewrite (says, campaigns,
   retention-triggers, newsletter, measure, platform, need) are kept, so deep
   links already sent still land on the matching section. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const PREDICTION_MARKET: PlaybookChapter = {
  id: "prediction-market",
  number: "02",
  title: "Prediction market growth and retention strategy",
  dek: "How email and in-app keep a forecaster coming back after the market they came for has resolved.",
  tldr: [
    "Prediction markets win users around events and lose them in between. After the 2024 US election, Polymarket's open interest fell from $510M to $120M in a month, according to The Block, while its monthly traders kept rising. People stayed curious, and the money left.",
    "Whether someone comes back is decided by their first result, and the riskiest result is a loss. In Galaxy's study of 2.9 million retail accounts, ==15.2% stopped trading within 30 days of a loss, against 6.1% after a win==. So this strategy is built around four moments: the first position, the first result, a disputed market, and the gap between one event and the next.",
    "At each one, an email or an in-app message starts from what the user just did, and stops as soon as they act.",
  ],
  sections: [
    {
      id: "says",
      title: "What we never send",
      blocks: [
        {
          kind: "p",
          text: "A prediction market sits close to gambling rules, especially in the UK. In February 2026 the Gambling Commission set out how it sees prediction markets, and in April the ASA ruled against an ad that made light of betting again after a loss. So every message is written as if the regulator will read it.",
        },
        {
          kind: "p",
          text: 'We never say "win it back", "get even" or "you\'re due", and nothing nudges a user after a loss. We never call a market risk-free, guaranteed, free money or a big payout. Winnings that do not expire are never written as if they do, and there is no urgency such as "before the odds move". Readers in the UK never get skill-not-gambling framing, and nobody blocked or self-excluded gets a promotion.',
        },
        {
          kind: "p",
          text: "What we do send is the record: the result, the payout and the date, as the market settled them. A market's real close time is the only deadline we mention, dispute timelines come from the resolution source, and we say who can trade a market before inviting anyone in. Every message goes to a segment and carries one link, and promotion only reaches people who agreed to it.",
        },
      ],
    },
    {
      id: "first-position",
      title: "The first position",
      blocks: [
        {
          kind: "p",
          text: "Someone who deposits and does not pick a market within a day usually has not found one they care about yet. While they are in the app, we show them three open markets in topics they have browsed. If 24 hours pass with no position, one email explains how a market works, from position to payout. Both stop when they open a position.",
        },
      ],
    },
    {
      id: "retention-triggers",
      title: "The first result",
      blocks: [
        {
          kind: "p",
          text: "A market resolving is when a user finds out what this was like. If they won, they get the result and one button to claim, in-app if they are active and by email if it is still unread two hours later. If the winnings are unclaimed after 48 hours, a reminder gives the amount and says plainly that it does not expire, because on Polymarket it never does.",
        },
        {
          kind: "p",
          text: "If they lost, they get an email with the result and their balance, and a link to deposit limits and account tools. Nothing in it invites a new position. Users leave at two and a half times the rate after a loss, so this is the message that matters most, and the one a regulator would look at first. A clear, factual result keeps their trust without crossing that line.",
        },
        {
          kind: "p",
          text: "Take Ada. She signs up during a football final, deposits, and the next day takes one of the three football markets we showed her. On day three it resolves and she has lost. She gets the result, her balance and a link to deposit limits, and nothing else. A week later a new market opens in the league she traded, and she hears about it in one line.",
        },
      ],
    },
    {
      id: "disputed",
      title: "When a market is disputed",
      blocks: [
        {
          kind: "p",
          text: "On Polymarket, results settle through UMA. An undisputed result settles after a two-hour challenge window, and a disputed one takes four to six days. Without a message, a user holding a disputed market just sees their money stuck.",
        },
        {
          kind: "p",
          text: "So when a market they hold is disputed, they get one email: what a dispute is, how long reviews usually take, and where to follow it, with a banner on the market page as the fallback. The result follows the day it settles. When a market's rules are clarified, holders get the change in plain words.",
        },
      ],
    },
    {
      id: "quiet",
      title: "Between events",
      blocks: [
        {
          kind: "p",
          text: "Most users arrive for one event. When someone has held one position and done nothing for 14 days, we send the upcoming markets in the same topic, with their close dates, and stop when they open a new position. When a market opens in a topic they have traded, they hear about it in one line on why it matters, at most once a day.",
        },
        {
          kind: "p",
          text: "After 60 days quiet, a user gets one good reason to come back. Then we leave them alone.",
        },
        {
          kind: "p",
          text: "Retention has to be read by size as well as by count. Between January and June 2025, The Block found Polymarket's active traders fell 47.6% while the average position per account rose from $2.7K to $4.8K. Fewer people were putting in more each, and a single blended retention number would have hidden it.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "Events worth sending",
      blocks: [
        {
          kind: "p",
          text: "Campaigns follow the calendar, and only go to people who traded the topic or asked to hear about it. When an event opens, anyone who traded the topic in the last 90 days, or follows it, hears about the flagship market, its close time and how it resolves. In the week its markets resolve, holders hear when each one resolves, the resolution source, and what happens if it is disputed. Afterwards, everyone who traded the event gets a recap of their markets, their results and the next event in the same topic.",
        },
        {
          kind: "p",
          text: "The recap matters most, because attention fades fast. The day after the 2024 US election, DL News found Polymarket's volume fell 84% and its daily users 53%. A recap that names the next event, sent while the last one is fresh, is how a one-off visit becomes a habit.",
        },
      ],
    },
    {
      id: "newsletter",
      title: "The weekly letter",
      blocks: [
        {
          kind: "p",
          text: "Readers who confirmed their address and opted in to news get one email a week: 350 to 450 words with one main button. It opens with the week in a line, covering markets resolved, markets opening and the biggest moves, with the date we checked. Then three markets closing this week with their close times and how they resolve, three new markets in the topics this reader trades, one short explainer on how resolution works, and the fixed dates in the next four weeks.",
        },
        {
          kind: "p",
          text: "The blocks stay the same every week, so one person can build it in two hours, and it goes to engaged readers first. Polymarket's own newsletter has more than 90,000 subscribers, so readers clearly want the context around the odds. The explainer also answers the loudest complaint, how markets resolve, before it turns into a support ticket.",
        },
      ],
    },
    {
      id: "measure",
      title: "How we know it worked",
      blocks: [
        {
          kind: "p",
          text: "We count what users do. Opens stopped meaning much once Apple Mail began opening emails by itself, so a message is judged by the position, the claim or the return that follows it. Every always-on Loop keeps a holdout, a small group left out on purpose, so we can show what the messages caused.",
        },
        {
          kind: "p",
          text: "The numbers we watch are funded users who open a first position within 7 days, users who open a new position within 14 days of their first market resolving, the return rate after a first loss against the holdout over 30 days, winnings claimed within 48 hours of the reminder, and users active across two or more resolution cycles in 60 days. Unsubscribes, complaints and bounces are checked on every send. Targets are set once the first month gives us a baseline.",
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every message above starts from something a wallet did, or something that happened to a market it holds. On Polymarket, positions are ERC-1155 tokens on Polygon and results settle through UMA on-chain, so OnchainSuite watches both directly. On an off-chain venue, your backend sends the same events through the Automation Trigger API, and topic follows come from your app through the OnchainSuite SDK.",
        },
        {
          kind: "p",
          text: "Self-exclusion and deposit limits work the other way round: they never start a message, and they stop every promotional one the same day.",
        },
        {
          kind: "p",
          text: "A mainstream email tool could run the event campaigns and the weekly letter. It cannot see a market resolve or a dispute open, so the result, dispute and between-events messages would have to go.",
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
          text: "Six answers before the first send. Where your email addresses come from and what people agreed to receive, which decides who hears from us straight away and who is asked first. Which countries can trade, and how that is enforced at sign-up, so nothing reaches someone who cannot use the market. How you record self-exclusion and deposit limits, because they stop every promotional message the same day.",
        },
        {
          kind: "p",
          text: "Then whether settlement happens on-chain or your backend can send it, which decides whether we watch the chain or take events through the API. The domain the email sends from and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam. And who approves each message, and whose voice it goes out in.",
        },
      ],
    },
  ],
};
