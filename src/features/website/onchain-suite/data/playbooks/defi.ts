/* The DeFi growth and retention strategy (lending, vaults, liquidity), on
   the shared structure: campaigns and the newsletter, Loops, lifecycle
   (capture points, the six stages, exit points) and retention triggers, then
   what we measure, the platform and what we need. Channels sit underneath.
   Evidence, checked 14 October 2026:
   - sUSDe staked TVL $6.16B at 7.5% (23 Sep 2025) to $1.21B at 4.9%
     (13 Oct 2026): DefiLlama yields API, computed.
   - One month after Arbitrum STIP ended, WOOFi TVL $12.6M to $5.9M; wallet
     activity back to pre-programme levels: ARDC and StableLab, Arbitrum forum.
   - aEthUSDT: top 50 holders 55.2% of supply, 23,862 holders: Blockscout,
     computed 14 Oct 2026 (includes wrapper contracts).
   - About 80% of Aave liquidation events off Ethereum, average $4K to $7K,
     vs above $50K on Ethereum: Aave Labs, 6 Feb 2026.
   - Most liquidatable volume taken within about 10 blocks in the Oct 2025
     crash week: Sentora, 14 Oct 2025.
   - Aave's help page points users to third-party alert tools: aave.com/help.
   - DeFi Saver protected 365 at-risk Aave V3 positions, Jan to Feb 2026:
     DeFi Saver blog (self-reported).
   - rsETH exploit: Aave -$8.45B deposits in two days, pools at 100%
     utilization: Galaxy Research, 22 Apr 2026.
   - 29.5% of tracked concentrated-liquidity capital out of range on average,
     H1 2026: 1inch research (commissioned). No significant edge for frequent
     rebalancers: arXiv 2111.09192.
   - UK: FCA PS23/6 incentive ban; FG23/3 rates not guaranteed and kept
     current. US: FTC v Celsius on "safe", "no risk" claims.
   - Gmail and Yahoo bulk-sender rules since Feb 2024: SPF, DKIM, DMARC,
     one-click unsubscribe, spam rate under 0.3%.
   - Apple Mail opens emails by itself (62.26% of opens, July 2026: Litmus).
   Section ids shared by every strategy page: says, campaigns, loops,
   lifecycle, retention-triggers, measure, platform, need. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const DEFI: PlaybookChapter = {
  id: "defi",
  number: "03",
  title: "DeFi growth and retention strategy",
  dek: "How email and in-app keep deposits in place, warn borrowers before liquidation, and bring capital back after it moves.",
  tldr: [
    "In DeFi, keeping a user means keeping their capital, and capital moves when the spread moves. As sUSDe's yield went from 7.5% to 4.9%, its staked deposits fell from $6.16B to $1.21B, by DefiLlama's numbers. One month after Arbitrum's incentive programme ended, WOOFi's TVL had gone from $12.6M to $5.9M.",
    "Capital is concentrated, too. On Aave V3 Ethereum, ==the 50 largest holders of USDT deposits hold 55% of the market==. The first deposit, a loan nearing liquidation, a position that stops earning and the week capital starts to move are where this strategy does its work.",
    "It has four parts: campaigns and the newsletter, Loops, lifecycle, and retention triggers. Email and in-app are the channels that carry them. Every message goes to a segment and carries one link, and promotion only reaches people who agreed to it.",
  ],
  sections: [
    {
      id: "says",
      title: "What we never send",
      blocks: [
        {
          kind: "p",
          text: "A deposit is someone's savings, and the rules treat it that way. In the UK, the FCA bans incentives such as referral bonuses in crypto promotions, and expects any rate to be shown as not guaranteed and kept current. In the US, the FTC's case against Celsius turned on calling deposits \"safe\" and free of risk. Even Aave Labs labels the rate in its own app as not guaranteed.",
        },
        {
          kind: "p",
          text: 'So we never call a yield guaranteed, risk-free or safe, or a protocol safer than a bank. No headline leads with "up to X% APY", nothing promises withdrawals anytime or instant liquidity, and nothing is called insured without the terms beside it. A rate never sits inside an automated send where it can go stale, and readers in the UK never get referral bonuses, free tokens or limited-time boosts.',
        },
        {
          kind: "p",
          text: 'What we do send is the record. Every rate carries its date and the word "currently". Health factor and liquidation price are given in numbers, with the asset behind them. We say what changed in a position before what to do about it, and the protocol\'s own risk terms are always one link away.',
        },
      ],
    },
    {
      id: "campaigns",
      title: "Campaigns and the newsletter",
      blocks: [
        {
          kind: "p",
          text: "Every campaign is built from on-chain segments, who holds the asset, who is in the market, who can vote, and only goes to people who agreed to news. A new market or vault goes to wallets that hold the asset it accepts and are not already in it, with the current rate and its date, and the risk terms. An incentive change goes to depositors in the affected market, with what changes, when, and what it means for their position. A governance vote goes to holders who can vote and depositors it affects, with the proposal in plain words and the dates of the vote.",
        },
        {
          kind: "p",
          text: "Timing matters most here. The date an incentive ends is the date churn starts: after Arbitrum's programme, wallet activity on the protocols in it fell back to where it was before. A message to the exact wallets a change affects, sent before the date, gives them the facts from you before they hear them elsewhere and move.",
        },
        {
          kind: "p",
          text: "The newsletter is one email every two weeks to depositors who opted in to news, because deposits do not move weekly: 350 to 450 words with one main button. It opens with their markets, covering rates, utilization and caps, with the date we checked. Then what changed, such as parameter changes and governance outcomes that affect depositors, one explainer on something like health factor or out-of-range liquidity, what is new with its risk terms, and the fixed dates coming up: unlocks, maturities and votes.",
        },
        {
          kind: "p",
          text: "Every rate carries its date, and nothing in it reads as a promise of yield. Depositors who understand their position tend to stay through volatility, and the calendar means no unlock or maturity arrives as a surprise.",
        },
      ],
    },
    {
      id: "loops",
      title: "Loops",
      blocks: [
        {
          kind: "p",
          text: "A Loop is a sequence of messages to one depositor. It starts from something their position did, or did not do, and it stops the moment they take the step it asks for, so nobody is chased for something they already did. There is one Loop for each move between stages, and they run in this order.",
        },
        {
          kind: "p",
          text: "The welcome Loop starts at capture, the moment a depositor gives an email address. One email confirms the address with a single click and says exactly what they agreed to receive: statements and position messages, or those plus news, depending on the form. Once they confirm, a second message shows them the one market that fits what their wallet already holds. It stops on confirmation, and nothing else goes to an address that has not confirmed. Those first sends also give a new sending domain its track record.",
        },
        {
          kind: "p",
          text: "The first-deposit Loop starts when a wallet has connected and deposited nothing, which usually means it has not seen a market that fits what it holds. In-app, we show it that one market, chosen from the assets in the wallet; if a day passes, one email does the same. It stops on the first deposit, and one message then explains what the position does and what to watch, whether that is a rate, a range or a health factor.",
        },
        {
          kind: "artifact",
          code: "03.01",
          title: "From a connected wallet to a monthly statement",
          diagram: {
            type: "flow",
            nodes: [
              { label: "Wallet connects", note: "nothing deposited" },
              { label: "One market", note: "fits what it holds" },
              {
                label: "First deposit",
                note: "supply, stake or add liquidity",
              },
              { label: "What to watch", note: "a rate, a range or health" },
              {
                label: "Monthly statement",
                note: "what it earned, in dollars",
              },
            ],
          },
        },
        {
          kind: "p",
          text: "From then on, active depositors get a statement on the first of each month with what their position earned last month, in dollars. It is the simplest reason to stay: a number they can check. The second-deposit Loop sends new markets for the assets they hold, and stops when they add funds again or open a loan.",
        },
        {
          kind: "p",
          text: "Some positions cost the user money quietly, and two Loops watch for that. A liquidity position out of range has stopped earning fees, and research published by 1inch found 29.5% of tracked concentrated-liquidity capital out of range on average in the first half of 2026. After 24 hours out of range, the user gets an email saying it stopped earning, what the position now holds, and how to adjust it, and it stops when the position is back in range. It never pushes constant rebalancing, since an academic study of concentrated liquidity found no significant edge for frequent rebalancers. When claimable rewards pass a set amount, the user gets the amount and one button to claim, until they claim.",
        },
        {
          kind: "p",
          text: "The slipping Loop starts when a depositor moves to At risk: their net deposit falls to half their own average, which usually means they withdrew more than half. They get one question on why. Fourteen days later, if nothing has come back, they hear what has changed since. It stops on a new deposit.",
        },
        {
          kind: "artifact",
          code: "03.03",
          title: "The slipping Loop after a large withdrawal",
          diagram: {
            type: "flow",
            nodes: [
              { label: "Withdraws half", note: "or more of the deposit" },
              { label: "One question", note: "what could we do better?" },
              { label: "14 days", note: "nothing back" },
              { label: "What changed", note: "since they left" },
              { label: "New deposit", note: "the Loop stops" },
            ],
          },
        },
        {
          kind: "p",
          text: "The last Loop is one message. After 60 days without a deposit or a loan, a Dormant wallet gets one good reason to come back. Then we leave it alone.",
        },
        {
          kind: "p",
          text: "Each message in a Loop has one owner channel and a fallback: in-app owns the moment a depositor is in the app, email owns the moment they are away from it, and a fallback only fires if the first went unread. A frequency cap counts every channel together. Retention triggers are the one exception, and always send.",
        },
      ],
    },
    {
      id: "lifecycle",
      title: "Lifecycle",
      blocks: [
        {
          kind: "p",
          text: "Every depositor sits in one of six stages, the same six on every strategy we run: New, Activated, Engaged, At risk, Dormant and Won back. The stage is worked out from what their wallet does, never set by hand, and it is read by capital as well as by count. Deposits are concentrated, so a few wallets decide the curve, and losing many small depositors calls for different messages from losing a few large ones. The lifecycle moves on patterns. Retention triggers, below, fire on single events, and the two never overlap.",
        },
        {
          kind: "p",
          text: "A lifecycle starts at a capture point, and each capture point sets what we are allowed to send. A wallet that connects is a contact with no email, reached in-app only, and most depositors start there. An email left on the app's capture form to get statements carries service consent: statements, the welcome Loop and messages about their own position. An email from the newsletter form, or a capture form whose consent line says so, carries news consent as well: campaigns and the letter. An embedded wallet sign-in through Privy or Magic gives both a wallet and an email, with whatever the sign-in page promised. A list the protocol already holds carries whatever those people originally agreed to, and where nobody can show what that was, the first message asks. Two tiers, service and news, and a depositor on service alone never sees a campaign.",
        },
        {
          kind: "artifact",
          code: "03.04",
          title: "The six stages of a depositor",
          diagram: {
            type: "ladder",
            steps: [
              { label: "New", note: "connected, nothing in" },
              { label: "Activated", note: "first deposit" },
              { label: "Engaged", note: "added funds again, or borrows" },
              {
                label: "At risk",
                note: "net deposit at half their own average",
                tone: "orange",
              },
              {
                label: "Dormant",
                note: "60 days, no deposit or loan",
                tone: "grey",
              },
              {
                label: "Won back",
                note: "deposited again, watched 30 days",
                tone: "navy",
              },
            ],
          },
        },
        {
          kind: "p",
          text: "New is a wallet connected with nothing in; the first-deposit Loop moves them on. Activated is the first deposit, supplied, staked or added as liquidity; the second-deposit Loop moves them on. Engaged is a depositor who added funds again or borrows against the deposit, and they get campaigns and the letter rather than a Loop. At risk is one rule on every strategy: activity at half the depositor's own 30-day average, which here means net deposit. It needs a baseline, so it applies from Engaged onward, and the slipping Loop answers it. Dormant is 60 days without a deposit or a loan, one message, then rest. Won back is a wallet that deposited again from At risk or Dormant. It is watched for 30 days, then placed as Engaged or At risk like anyone else, and it never goes back through the welcome.",
        },
        {
          kind: "p",
          text: "A lifecycle also has exit points, and the rule that keeps them straight is that marketing consent can be withdrawn while service messages about a position the depositor still holds continue until the position is gone. An unsubscribe stops campaigns, the letter and every Loop; a health alert still goes out while they have a loan. A spam complaint stops everything by email that day, and a hard bounce closes the email channel; both leave in-app, service only. A depositor in a restricted country never enters promotion. A wallet that withdraws everything is not an exit: it is At risk or Dormant, and gets the one message and the rest. Rest itself is a state we count, so Dormant never looks like a backlog to work. An account closed, or an erasure request, ends everything, the record included.",
        },
        {
          kind: "p",
          text: "Take Ada. She supplies USDC on Base, leaves her email on the app's capture form to get statements, and confirms it with one click. On day 12 an incentive on her market changes the following week, and she gets one email with the date and what it means for her deposit. On day 30 her first statement arrives: what her position earned, in dollars. On day 41 she borrows against it, so she is Engaged. ETH falls and her health drops to 1.2; the alert reaches her in the app and by email with her liquidation price, and she repays part of the loan. On day 70 she withdraws half, moves to At risk, and gets one question on why. Two weeks later she hears about the new vault for the asset she still holds.",
        },
        {
          kind: "artifact",
          code: "03.05",
          title: "Ada's first ten weeks",
          diagram: {
            type: "timeline",
            points: [
              { when: "Day 0", label: "Supplies USDC, confirms her email" },
              { when: "Day 12", label: "Told about an incentive change" },
              { when: "Day 30", label: "First monthly statement" },
              { when: "Day 41", label: "Borrows; health alert; repays" },
              { when: "Day 70", label: "Withdraws half; one question" },
              { when: "Day 84", label: "Hears about the new vault" },
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
          text: "A retention trigger is a single message sent the same day something happens to a depositor's position. It comes from the position, never from a calendar, it carries no offer, and it always sends, whatever the frequency cap and whether or not they take news. It explains, then stops.",
        },
        {
          kind: "p",
          text: "Liquidations fall hardest on the users least able to absorb them. Aave Labs found about 80% of its liquidation events happen outside Ethereum, at an average of $4,000 to $7,000, against more than $50,000 on Ethereum. Aave does not alert its own users: its help page points them to third-party tools, and DeFi Saver says it protected 365 at-risk Aave V3 positions in January and February 2026 alone.",
        },
        {
          kind: "p",
          text: "So when a borrower's health factor falls below the level you set for that collateral, in-app and email go out together with their current health, the price that would trigger liquidation, and how to add collateral or repay. Volatile collateral gets an earlier level, because waiting for 1.0 is too late: in the October 2025 crash, Sentora found most liquidatable volume was taken within about ten blocks, roughly two minutes. If a position is liquidated anyway, an email explains what happened in plain words, what was sold and what is left, with nothing promotional in it.",
        },
        {
          kind: "messages",
          messages: [
            {
              type: "Loan health alert, in-app and email",
              channels: "in-app-and-email",
              subject: "Your loan is close to liquidation",
              preview:
                "ETH at $2,410 would trigger it. Here is how to avoid it",
              body: [
                "Your loan health is 1.08. If ETH falls to $2,410, part of your collateral will be sold to repay the loan.",
                "You can raise your health by adding collateral or repaying part of the loan. Both take one step.",
              ],
              action: "Manage my loan",
            },
          ],
        },
        {
          kind: "artifact",
          code: "03.02",
          title: "A loan's health falling, and where the alert sits",
          diagram: {
            type: "ladder",
            steps: [
              { label: "Health 2.0", note: "comfortable" },
              { label: "Health 1.5", note: "the price is moving" },
              {
                label: "Your alert level",
                note: "set per collateral; in-app and email",
                tone: "orange",
              },
              {
                label: "Health 1.0",
                note: "liquidation, within about ten blocks",
                tone: "navy",
              },
            ],
          },
        },
        {
          kind: "p",
          text: "Seven days and again one day before a lock ends or a position matures, the depositor gets the date, the amount and their options, relocking included. And a crisis needs its own message. After the April 2026 rsETH exploit, Galaxy found Aave lost $8.45B of deposits in two days and its largest pools reached full utilization. When a market is fully utilized, its depositors get an email the same day saying withdrawals may be delayed, why, and where updates are posted. In a run the first hour matters, so who can approve that message is agreed in advance.",
        },
      ],
    },
    {
      id: "measure",
      title: "How we know it worked",
      blocks: [
        {
          kind: "p",
          text: "We count what depositors do. Opens stopped meaning much once Apple Mail began opening emails by itself, so a message is judged by the deposit, the repayment or the claim that follows it. Every always-on Loop keeps a holdout, a small group left out on purpose, so we can show what the messages caused.",
        },
        {
          kind: "p",
          text: "Every Monday, a stage report shows how many depositors sit at each stage, by count and by capital, and where most of them are stuck. That stage is where the next week's effort goes. Under it, the numbers we watch are deposits still in place 30 and 90 days after they arrive, new deposits from existing depositors each month, loans back above the health level within 24 hours of an alert, liquidations among alerted wallets against the holdout over 30 days, rewards claimed within 48 hours of a reminder, and out-of-range positions adjusted within 7 days of the email. Unsubscribes, complaints and bounces are checked on every send, with the complaint rate held under the 0.3% Gmail and Yahoo allow. Targets are set once the first month gives us a baseline.",
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every Loop and every trigger above starts from something a position did. OnchainSuite watches lending and liquidity contracts directly on Ethereum, Base, Arbitrum, Optimism and Polygon, with ready-made triggers for a borrow opened, a loan repaid, a liquidation, capital withdrawn and rewards claimed, plus a health factor trigger. On Solana, the same events come in through the Automation Trigger API. For in-app messages, your developer adds one short script. The stages are computed from the same events, and the stage report reads from the same data.",
        },
        {
          kind: "p",
          text: "A mainstream email tool could run the campaigns and the letter. It cannot see a health factor fall or a range go idle, so the Loops, the stages and the retention triggers would have to go.",
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
          text: "Seven answers before the first send. Where your email addresses come from and what people agreed to receive, which decides who is on service and who is on news from day one. Which markets and chains are in scope, with their contract addresses, so triggers watch the right contracts from day one. What health level should trigger an alert for each collateral, since volatile collateral needs an earlier warning.",
        },
        {
          kind: "p",
          text: "Then who can approve a crisis message, and how fast. Whether you market to users in the UK, where the rules ban referral bonuses and stale rates in crypto promotions. The domain the email sends from and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam. And who approves each message, and whose voice it goes out in.",
        },
      ],
    },
  ],
};
