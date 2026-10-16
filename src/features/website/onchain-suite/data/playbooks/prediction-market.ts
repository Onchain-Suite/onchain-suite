/* The prediction market growth and retention strategy, on the shared
   structure: campaigns and the newsletter, Loops, lifecycle (capture points,
   the six stages, exit points) and retention triggers, then what we measure,
   the platform and what we need. Channels sit underneath all four.
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
   - Gmail and Yahoo bulk-sender rules since Feb 2024: SPF, DKIM, DMARC,
     one-click unsubscribe, spam rate under 0.3%.
   - Apple Mail opens emails by itself (62.26% of opens, July 2026: Litmus).
   Section ids shared by every strategy page: says, campaigns, loops,
   lifecycle, retention-triggers, measure, platform, need. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const PREDICTION_MARKET: PlaybookChapter = {
  id: "prediction-market",
  number: "02",
  title: "Prediction market growth and retention strategy",
  dek: "How email and in-app keep a forecaster coming back after the market they came for has resolved.",
  tldr: [
    "Prediction markets win users around events and lose them in between. After the 2024 US election, Polymarket's open interest fell from $510M to $120M in a month, according to The Block, while its monthly traders kept rising. People stayed curious, and the money left.",
    "Whether someone comes back is decided by their first result, and the riskiest result is a loss. In Galaxy's study of 2.9 million retail accounts, ==15.2% stopped trading within 30 days of a loss, against 6.1% after a win==. The first position, the first result, a disputed market and the gap between events are where this strategy does its work.",
    "It has four parts: campaigns and the newsletter, Loops, lifecycle, and retention triggers. Email and in-app are the channels that carry them. Every message goes to a segment and carries one link, and promotion only reaches people who agreed to it.",
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
          text: "What we do send is the record: the result, the payout and the date, as the market settled them. A market's real close time is the only deadline we mention, dispute timelines come from the resolution source, and we say who can trade a market before inviting anyone in.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "Campaigns and the newsletter",
      blocks: [
        {
          kind: "p",
          text: "Campaigns follow the calendar, and only go to people who agreed to news and who traded the topic or asked to hear about it. When an event opens, anyone who traded the topic in the last 90 days, or follows it, hears about the flagship market, its close time and how it resolves. In the week its markets resolve, holders hear when each one resolves, the resolution source, and what happens if it is disputed. Afterwards, everyone who traded the event gets a recap of their markets, their results and the next event in the same topic.",
        },
        {
          kind: "p",
          text: "The recap matters most, because attention fades fast. The day after the 2024 US election, DL News found Polymarket's volume fell 84% and its daily users 53%. A recap that names the next event, sent while the last one is fresh, is how a one-off visit becomes a habit.",
        },
        {
          kind: "p",
          text: "The newsletter is one email a week to readers who confirmed their address and opted in to news: 350 to 450 words with one main button. It opens with the week in a line, covering markets resolved, markets opening and the biggest moves, with the date we checked. Then three markets closing this week with their close times and how they resolve, three new markets in the topics this reader trades, one short explainer on how resolution works, and the fixed dates in the next four weeks.",
        },
        {
          kind: "p",
          text: "The blocks stay the same every week, so one person can build it in two hours, and it goes to engaged readers first. Polymarket's own newsletter has more than 90,000 subscribers, so readers clearly want the context around the odds. The explainer also answers the loudest complaint, how markets resolve, before it turns into a support ticket.",
        },
      ],
    },
    {
      id: "loops",
      title: "Loops",
      blocks: [
        {
          kind: "p",
          text: "A Loop is a sequence of messages to one user. It starts from something they did, or did not do, and it stops the moment they take the step it asks for, so nobody is chased for something they already did. There is one Loop for each move between stages, and they run in this order.",
        },
        {
          kind: "p",
          text: "The welcome Loop starts at capture, the moment someone gives an email address. One email confirms the address with a single click and says exactly what they agreed to receive: results and account messages, or those plus news, depending on the form. Once they confirm, a second message shows them three open markets in topics they browsed. It stops on confirmation, and nothing else goes to an address that has not confirmed. Those first sends also give a new sending domain its track record.",
        },
        {
          kind: "p",
          text: "The first-position Loop starts when someone has deposited and not picked a market within a day, which usually means they have not found one they care about yet. While they are in the app, we show them three open markets in topics they have browsed. If 24 hours pass with no position, one email explains how a market works, from position to payout. Both stop when they open a position.",
        },
        {
          kind: "p",
          text: "The second-position Loop starts when someone has held one position and done nothing for 14 days, because most users arrive for one event. It sends the upcoming markets in the same topic, with their close dates, and stops when they open a new position. Alongside it, when a market opens in a topic they have traded, they hear about it in one line on why it matters, at most once a day.",
        },
        {
          kind: "p",
          text: "The slipping Loop starts when a user moves to At risk: the positions they open fall to half their own average. They get one check-in about the next dated event in a topic they traded, and it stops when they open a position.",
        },
        {
          kind: "p",
          text: "The last Loop is one message. After 60 days quiet, a Dormant user gets one good reason to come back. Then we leave them alone.",
        },
        {
          kind: "p",
          text: "Each message in a Loop has one owner channel and a fallback: in-app owns the moment a user is in the app, email owns the moment they are away from it, and a fallback only fires if the first went unread. A frequency cap counts every channel together. Retention triggers are the one exception, and always send.",
        },
      ],
    },
    {
      id: "lifecycle",
      title: "Lifecycle",
      blocks: [
        {
          kind: "p",
          text: "Every user sits in one of six stages, the same six on every strategy we run: New, Activated, Engaged, At risk, Dormant and Won back. The stage is worked out from what they do in the market, never set by hand, and it is read by size as well as by count. Between January and June 2025, The Block found Polymarket's active traders fell 47.6% while the average position per account rose from $2.7K to $4.8K: fewer people putting in more each, which a single blended number would have hidden. The lifecycle moves on patterns. Retention triggers, below, fire on single events, and the two never overlap.",
        },
        {
          kind: "p",
          text: "A lifecycle starts at a capture point, and each capture point sets what we are allowed to send. A wallet that connects is a contact with no email, reached in-app only. An email given at sign-up to get results carries service consent: results, the welcome Loop and messages about their own positions. An email from the newsletter form, or a sign-up whose consent line says so, carries news consent as well: campaigns and the letter. An embedded wallet sign-in through Privy or Magic gives both a wallet and an email, with whatever the sign-in page promised. A list the venue already holds carries whatever those people originally agreed to, and where nobody can show what that was, the first message asks. Two tiers, service and news, and a user on service alone never sees a campaign.",
        },
        {
          kind: "artifact",
          code: "02.03",
          title: "The six stages of a forecaster",
          diagram: {
            type: "ladder",
            steps: [
              { label: "New", note: "deposited, no position" },
              { label: "Activated", note: "first position" },
              { label: "Engaged", note: "positions across two or more cycles" },
              {
                label: "At risk",
                note: "positions at half their own average",
                tone: "orange",
              },
              { label: "Dormant", note: "60 days, no position", tone: "grey" },
              {
                label: "Won back",
                note: "a position again, watched 30 days",
                tone: "navy",
              },
            ],
          },
        },
        {
          kind: "p",
          text: "New is deposited and no position; the first-position Loop moves them on. Activated is the first position; the second-position Loop moves them on. Engaged is a user with positions across two or more resolution cycles, and they get campaigns and the letter rather than a Loop. At risk is one rule on every strategy: activity at half the user's own 30-day average, which here means the positions they open. It needs a baseline, so it applies from Engaged onward, and the slipping Loop answers it. Dormant is 60 days without a position, one message, then rest. Won back is a user who opened a position again from At risk or Dormant. They are watched for 30 days, then placed as Engaged or At risk like anyone else, and they never go back through the welcome.",
        },
        {
          kind: "p",
          text: "A lifecycle also has exit points, and the rule that keeps them straight is that marketing consent can be withdrawn while service messages about a position the user still holds continue until it settles. An unsubscribe stops campaigns, the letter and every Loop; the result of a market they hold still arrives. A spam complaint stops everything by email that day, and a hard bounce closes the email channel; both leave in-app, service only. Self-exclusion and a deposit limit stop every promotional message the same day and never start one; they come from your account system as a suppression signal. A user in a blocked country never enters promotion. A user whose last market has settled and who holds nothing is not an exit: they are At risk or Dormant, and get the one message and the rest. Rest itself is a state we count. An account closed, or an erasure request, ends everything, the record included.",
        },
        {
          kind: "p",
          text: "Take Ada. She signs up during a football final with her email, confirms it with one click, and the next day takes one of the three football markets we showed her. On day three it resolves and she has lost. She gets the result, her balance and a link to deposit limits, and nothing else. A week later a new market opens in the league she traded, and she hears about it in one line. By day 24 she has done nothing since, so the second-position Loop sends the next fixtures with their close dates. She takes a position, and she is Activated again on her way to Engaged.",
        },
        {
          kind: "artifact",
          code: "02.01",
          title: "Ada, from sign-up to coming back",
          diagram: {
            type: "timeline",
            points: [
              {
                when: "Day 0",
                label: "Signs up during a final, confirms her email",
              },
              { when: "Day 1", label: "Takes one football market" },
              {
                when: "Day 3",
                label: "Loses; gets the result and limits, nothing else",
              },
              {
                when: "Day 10",
                label: "Hears about a new market in her league",
              },
              { when: "Day 24", label: "Back with the next fixtures" },
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
          text: "A retention trigger is a single message sent the same day something happens to a user's positions. It comes from the market, never from a calendar, it carries no offer and no forecast, and it always sends, whatever the frequency cap and whether or not they take news. It explains, then stops.",
        },
        {
          kind: "p",
          text: "A market resolving is when a user finds out what this was like. If they won, they get the result and one button to claim, in-app if they are active and by email if it is still unread two hours later. If the winnings are unclaimed after 48 hours, a reminder gives the amount and says plainly that it does not expire, because on Polymarket it never does.",
        },
        {
          kind: "p",
          text: "If they lost, they get an email with the result and their balance, and a link to deposit limits and account tools. Nothing in it invites a new position. Users leave at two and a half times the rate after a loss, so this is the message that matters most, and the one a regulator would look at first. A clear, factual result keeps their trust without crossing that line.",
        },
        {
          kind: "messages",
          messages: [
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
          ],
        },
        {
          kind: "p",
          text: "On Polymarket, results settle through UMA. An undisputed result settles after a two-hour challenge window, and a disputed one takes four to six days. Without a message, a user holding a disputed market just sees their money stuck. So when a market they hold is disputed, they get one email: what a dispute is, how long reviews usually take, and where to follow it, with a banner on the market page as the fallback. The result follows the day it settles. When a market's rules are clarified, holders get the change in plain words.",
        },
        {
          kind: "artifact",
          code: "02.02",
          title: "How a disputed result settles on Polymarket",
          diagram: {
            type: "flow",
            nodes: [
              { label: "Market closes" },
              { label: "Result proposed", note: "through UMA" },
              { label: "Two-hour window", note: "anyone can challenge" },
              { label: "Under review", note: "4 to 6 days, one email" },
              { label: "Settles", note: "result the same day" },
            ],
          },
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
          text: "Every Monday, a stage report shows how many users sit at each stage, by count and by position size, and where most of them are stuck. That stage is where the next week's effort goes. Under it, the numbers we watch are funded users who open a first position within 7 days, users who open a new position within 14 days of their first market resolving, the return rate after a first loss against the holdout over 30 days, winnings claimed within 48 hours of the reminder, and users active across two or more resolution cycles in 60 days. Unsubscribes, complaints and bounces are checked on every send, with the complaint rate held under the 0.3% Gmail and Yahoo allow. Targets are set once the first month gives us a baseline.",
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every Loop and every trigger above starts from something a wallet did, or something that happened to a market it holds. On Polymarket, positions are ERC-1155 tokens on Polygon and results settle through UMA on-chain, so OnchainSuite watches both directly. On an off-chain venue, your backend sends the same events through the Automation Trigger API, and topic follows come from your app through the OnchainSuite SDK. The stages are computed from the same events, and the stage report reads from the same data.",
        },
        {
          kind: "p",
          text: "A mainstream email tool could run the event campaigns and the weekly letter. It cannot see a market resolve or a dispute open, so the Loops, the stages and the retention triggers would have to go.",
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
          text: "Six answers before the first send. Where your email addresses come from and what people agreed to receive, which decides who is on service and who is on news from day one. Which countries can trade, and how that is enforced at sign-up, so nothing reaches someone who cannot use the market. How you record self-exclusion and deposit limits, because they stop every promotional message the same day.",
        },
        {
          kind: "p",
          text: "Then whether settlement happens on-chain or your backend can send it, which decides whether we watch the chain or take events through the API. The domain the email sends from and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam. And who approves each message, and whose voice it goes out in.",
        },
      ],
    },
  ],
};
