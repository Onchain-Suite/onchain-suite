/* The DeFi growth and retention strategy (lending, vaults, liquidity),
   written as prose: one short chapter per moment that decides whether a
   depositor's capital stays.
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
   - Apple Mail opens emails by itself (62.26% of opens, July 2026: Litmus).
   Section ids that existed before the rewrite (says, campaigns,
   retention-triggers, newsletter, measure, platform, need) are kept, so deep
   links already sent still land on the matching section. */

import { DISCLOSURE } from "@/onchain-suite-website/data/retention-playbook";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const DEFI: PlaybookChapter = {
  id: "defi",
  number: "03",
  title: "DeFi growth and retention strategy",
  dek: "How email and in-app keep deposits in place, warn borrowers before liquidation, and bring capital back after it moves.",
  tldr: [
    "In DeFi, keeping a user means keeping their capital, and capital moves when the spread moves. As sUSDe's yield went from 7.5% to 4.9%, its staked deposits fell from $6.16B to $1.21B, by DefiLlama's numbers. One month after Arbitrum's incentive programme ended, WOOFi's TVL had gone from $12.6M to $5.9M.",
    "Capital is concentrated, too. On Aave V3 Ethereum, ==the 50 largest holders of USDT deposits hold 55% of the market==. So this strategy is built around four moments: the first deposit, a loan nearing liquidation, a position that stops earning, and the week capital starts to move.",
    "At each one, an email or an in-app message starts from what the position just did, and stops as soon as the depositor acts.",
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
          text: 'What we do send is the record. Every rate carries its date and the word "currently". Health factor and liquidation price are given in numbers, with the asset behind them. We say what changed in a position before what to do about it, and the protocol\'s own risk terms are always one link away. Every message goes to a segment and carries one link, and promotion only reaches people who agreed to it.',
        },
      ],
    },
    {
      id: "first-deposit",
      title: "The first deposit",
      blocks: [
        {
          kind: "p",
          text: "A wallet that connects and deposits nothing has usually not seen a market that fits what it already holds. We show it that one market, chosen from the assets in the wallet. After the first deposit, one message explains what the position does and what to watch, whether that is a rate, a range or a health factor.",
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
          text: "From then on, active depositors get a statement on the first of each month with what their position earned last month, in dollars. It is the simplest reason to stay: a number they can check.",
        },
      ],
    },
    {
      id: "retention-triggers",
      title: "Before a liquidation",
      blocks: [
        {
          kind: "p",
          text: "Liquidations fall hardest on the users least able to absorb them. Aave Labs found about 80% of its liquidation events happen outside Ethereum, at an average of $4,000 to $7,000, against more than $50,000 on Ethereum. Aave does not alert its own users: its help page points them to third-party tools, and DeFi Saver says it protected 365 at-risk Aave V3 positions in January and February 2026 alone.",
        },
        {
          kind: "p",
          text: "So the alert comes from the position, never from a calendar. When a borrower's health factor falls below the level you set for that collateral, in-app and email go out together with their current health, the price that would trigger liquidation, and how to add collateral or repay. It stops when health is back above the level, and it always sends, whatever the frequency cap.",
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
          text: "Volatile collateral gets an earlier level, because waiting for 1.0 is too late. In the October 2025 crash, Sentora found most liquidatable volume was taken within about ten blocks, roughly two minutes. If a position is liquidated anyway, an email explains what happened in plain words, what was sold and what is left, with nothing promotional in it.",
        },
        {
          kind: "p",
          text: "Take Ada. She supplies USDC on Base, and six weeks later borrows against it. ETH falls and her health drops to 1.2. The alert reaches her in the app and by email with her liquidation price, and she repays part of the loan.",
        },
      ],
    },
    {
      id: "idle",
      title: "When a position stops earning",
      blocks: [
        {
          kind: "p",
          text: "Some positions cost the user money quietly. A liquidity position out of range has stopped earning fees, and research published by 1inch found 29.5% of tracked concentrated-liquidity capital out of range on average in the first half of 2026. After 24 hours out of range, the user gets an email saying it stopped earning, what the position now holds, and how to adjust it, and it stops when the position is back in range. It never pushes constant rebalancing, since an academic study of concentrated liquidity found no significant edge for frequent rebalancers.",
        },
        {
          kind: "p",
          text: "Rewards work the same way. When claimable rewards pass a set amount, the user gets the amount and one button to claim, until they claim. Seven days and again one day before a lock ends or a position matures, they get the date, the amount and their options, relocking included.",
        },
      ],
    },
    {
      id: "quiet",
      title: "When capital starts to move",
      blocks: [
        {
          kind: "p",
          text: "When someone withdraws more than half their deposit, they get one question on why. Fourteen days later, if nothing has come back, they hear what has changed since. A wallet that withdraws everything gets the same question and the same follow-up, and then we leave it alone.",
        },
        {
          kind: "artifact",
          code: "03.03",
          title: "The Loop after a large withdrawal",
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
          text: "Read this by wallet and by capital. Deposits are concentrated, so a few wallets decide the curve, and losing many small depositors calls for different messages from losing a few large ones.",
        },
        {
          kind: "p",
          text: "A crisis needs its own message. After the April 2026 rsETH exploit, Galaxy found Aave lost $8.45B of deposits in two days and its largest pools reached full utilization. When a market is fully utilized, its depositors get an email the same day saying withdrawals may be delayed, why, and where updates are posted. In a run the first hour matters, so who can approve that message is agreed in advance.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "News worth sending",
      blocks: [
        {
          kind: "p",
          text: "Every campaign is built from on-chain segments: who holds the asset, who is in the market, who can vote. A new market or vault goes to wallets that hold the asset it accepts and are not already in it, with the current rate and its date, and the risk terms. An incentive change goes to depositors in the affected market, with what changes, when, and what it means for their position. A governance vote goes to holders who can vote and depositors it affects, with the proposal in plain words and the dates of the vote.",
        },
        {
          kind: "p",
          text: "Timing matters most here. The date an incentive ends is the date churn starts: after Arbitrum's programme, wallet activity on the protocols in it fell back to where it was before. A message to the exact wallets a change affects, sent before the date, gives them the facts from you before they hear them elsewhere and move.",
        },
      ],
    },
    {
      id: "newsletter",
      title: "The fortnightly letter",
      blocks: [
        {
          kind: "p",
          text: "Depositors who opt in to news get one email every two weeks: 350 to 450 words with one main button. It opens with their markets, covering rates, utilization and caps, with the date we checked. Then what changed, such as parameter changes and governance outcomes that affect depositors, one explainer on something like health factor or out-of-range liquidity, what is new with its risk terms, and the fixed dates coming up: unlocks, maturities and votes.",
        },
        {
          kind: "p",
          text: "Every rate carries its date, and nothing in it reads as a promise of yield. Depositors who understand their position tend to stay through volatility, and the calendar means no unlock or maturity arrives as a surprise.",
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
          text: "The numbers we watch are deposits still in place 30 and 90 days after they arrive, new deposits from existing depositors each month, loans back above the health level within 24 hours of an alert, liquidations among alerted wallets against the holdout over 30 days, rewards claimed within 48 hours of a reminder, and out-of-range positions adjusted within 7 days of the email. Unsubscribes, complaints and bounces are checked on every send. Targets are set once the first month gives us a baseline.",
        },
      ],
    },
    {
      id: "platform",
      title: "Running it on OnchainSuite",
      blocks: [
        {
          kind: "p",
          text: "Every message above starts from something a position did. OnchainSuite watches lending and liquidity contracts directly on Ethereum, Base, Arbitrum, Optimism and Polygon, with ready-made triggers for a borrow opened, a loan repaid, a liquidation, capital withdrawn and rewards claimed, plus a health factor trigger. On Solana, the same events come in through the Automation Trigger API. For in-app messages, your developer adds one short script.",
        },
        {
          kind: "p",
          text: "A mainstream email tool could run the news and the letter. It cannot see a health factor fall or a range go idle, so the alerts, the statements and the messages about moving capital would have to go.",
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
          text: "Seven answers before the first send. Where your email addresses come from and what people agreed to receive, which decides who hears from us straight away and who is asked first. Which markets and chains are in scope, with their contract addresses, so triggers watch the right contracts from day one. What health level should trigger an alert for each collateral, since volatile collateral needs an earlier warning.",
        },
        {
          kind: "p",
          text: "Then who can approve a crisis message, and how fast. Whether you market to users in the UK, where the rules ban referral bonuses and stale rates in crypto promotions. The domain the email sends from and who manages its DNS, because SPF, DKIM and DMARC decide between inbox and spam. And who approves each message, and whose voice it goes out in.",
        },
      ],
    },
  ],
};
