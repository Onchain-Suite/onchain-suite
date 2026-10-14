/* Chapter 03: the DeFi playbook (lending, vaults, liquidity).
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
     current. US: FTC v Celsius on "safe", "no risk" claims. */

import {
  BASE_QUESTIONS,
  MEASURE_NOTE,
  platformSection,
  RULES_LINE,
} from "@/onchain-suite-website/data/playbooks/shared";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";

export const DEFI: PlaybookChapter = {
  id: "defi",
  number: "03",
  kicker: "Chapter 03 · DeFi: lending, vaults, liquidity",
  title: "The DeFi playbook",
  dek: "How email and in-app keep deposits in place, warn borrowers before liquidation, and bring capital back after it moves.",
  tldr: [
    "In DeFi, keeping a user means keeping their capital, and capital moves when the spread moves. sUSDe's staked deposits fell from $6.16B to $1.21B as its yield went from 7.5% to 4.9%. One month after Arbitrum's STIP incentives ended, WOOFi had lost more than half its TVL.",
    "It is also concentrated. On Aave V3 Ethereum, ==the 50 largest holders of USDT deposits hold 55% of the market==. Retention starts with knowing who those depositors are and talking to them before they move.",
    `This playbook sets out how email and in-app do that, in five parts: campaigns, automation, lifecycle, retention triggers and the newsletter. ${RULES_LINE}`,
  ],
  sections: [
    {
      id: "says",
      title: "What email says, and what it never says",
      blocks: [
        {
          kind: "says",
          always: [
            'Every rate with its date and the word "currently"',
            "Health factor and liquidation price in numbers, with the asset behind them",
            "What changed in a position, before what to do about it",
            "The protocol's own risk terms, one link away",
          ],
          never: [
            '"Guaranteed", "risk-free", "safe yield" or "safer than a bank"',
            '"Up to X% APY" as a headline',
            '"Withdraw anytime" or "instant liquidity"',
            '"Insured" without the terms',
            "A rate that can go stale inside an automated send",
            "Referral bonuses, free tokens or limited-time boosts to readers in the UK",
          ],
        },
        {
          kind: "note",
          text: "Even Aave Labs labels the rate in its own app as not guaranteed.",
        },
      ],
    },
    {
      id: "campaigns",
      title: "1. Campaigns",
      whw: {
        what: "A campaign is one message sent to a chosen segment at a set moment, because something is happening they should hear about. In DeFi, the moments are launches, parameter changes and votes.",
        how: [
          {
            kind: "table",
            head: ["Campaign", "Goes to", "Says", "One button"],
            rows: [
              [
                "New market or vault",
                "Wallets holding the asset it accepts, not already in it",
                "What it accepts, the current rate with its date, and the risk terms",
                "See the vault",
              ],
              [
                "Incentive change",
                "Depositors in the affected market",
                "What changes, the date it changes, and what it means for their position",
                "See my position",
              ],
              [
                "Governance vote",
                "Holders who can vote, and depositors it affects",
                "The proposal in plain words and the dates of the vote",
                "Read the proposal",
              ],
            ],
          },
          {
            kind: "p",
            text: "Every campaign is built from on-chain segments: who holds the asset, who is in the market, who can vote. Nobody gets a launch for an asset they do not hold.",
          },
        ],
        why: "Most teams learn about a migration when it shows up in TVL. The date an incentive ends is the date churn starts: after Arbitrum's STIP programme, wallet activity on participating protocols fell back to where it was before it. A message to the exact wallets a change affects, sent before the date, is the difference between explaining a change and losing the deposit to it.",
      },
    },
    {
      id: "automation",
      title: "2. Automation",
      whw: {
        what: "An automated message sends itself to one person when their position changes, and stops as soon as they take the step it asks for. In OnchainSuite these are Loops.",
        how: [
          {
            kind: "loops",
            loops: [
              {
                name: "Loan health alert",
                startsWhen:
                  "Health factor falls below a level you set for that collateral",
                sends:
                  "In-app and email at once: current health, the price that triggers liquidation, how to add collateral or repay",
                stopsWhen: "Health back above the level",
              },
              {
                name: "Out of range",
                startsWhen:
                  "A liquidity position has been out of range for 24 hours",
                sends:
                  "That it has stopped earning fees, what it now holds, and how to adjust it",
                stopsWhen: "Back in range",
              },
              {
                name: "Unclaimed rewards",
                startsWhen: "Claimable rewards pass a set amount",
                sends: "The amount and one button to claim",
                stopsWhen: "Claimed",
              },
              {
                name: "Unlock coming up",
                startsWhen:
                  "7 days, then 1 day, before a lock ends or a position matures",
                sends:
                  "The date, the amount and their options, including relocking",
                stopsWhen: "The date passes",
              },
              {
                name: "Big withdrawal",
                startsWhen: "Withdrew more than half their deposit",
                sends:
                  "One question on why. Then, after 14 days, what has changed since",
                stopsWhen: "New deposit",
              },
              {
                name: "Monthly statement",
                startsWhen: "First day of each month, for active depositors",
                sends: "What their position earned last month, in dollars",
                stopsWhen: "Single message",
              },
            ],
          },
          {
            kind: "p",
            text: "OnchainSuite watches lending and liquidity contracts directly on Ethereum, Base, Arbitrum, Optimism and Polygon, with ready-made triggers for borrow opened, loan repaid, liquidation detected, capital withdrawn and rewards claimed, and a health factor trigger. On Solana, the same events come in through the Automation Trigger API.",
          },
        ],
        why: "Each of these moments costs the user money if nobody tells them: a loan drifting toward liquidation, a range that stopped earning, rewards left unclaimed. A protocol that tells them first is the one they trust with the next deposit.",
      },
    },
    {
      id: "lifecycle",
      title: "3. Lifecycle",
      whw: {
        what: "Lifecycle is the path from first deposit to depositor who adds more over time. We follow wallets and capital separately, because they move differently.",
        how: [
          {
            kind: "artifact",
            code: "03.01",
            title: "The depositor lifecycle",
            diagram: {
              type: "ladder",
              steps: [
                { label: "Connected", note: "wallet connected, nothing in" },
                {
                  label: "First deposit",
                  note: "supplied, staked or added liquidity",
                },
                { label: "Repeat", note: "added funds a second time" },
                { label: "Borrower", note: "opened a loan against it" },
                {
                  label: "At risk",
                  note: "health falling, or half withdrawn",
                  tone: "orange",
                },
                { label: "Exited", note: "withdrew everything", tone: "grey" },
              ],
            },
          },
          {
            kind: "table",
            head: ["Stage", "What it means", "The message's job"],
            rows: [
              [
                "Connected",
                "Wallet connected, nothing deposited",
                "Show the one market that fits what the wallet already holds",
              ],
              [
                "First deposit",
                "Supplied, staked or added liquidity",
                "Explain what the position does and what to watch",
              ],
              [
                "Repeat",
                "Added funds a second time",
                "Monthly statement and new markets for assets they hold",
              ],
              [
                "Borrower",
                "Opened a loan against the deposit",
                "Health alerts from the first day",
              ],
              [
                "At risk",
                "Health falling, or withdrew half",
                "Catch it early, with numbers",
              ],
              [
                "Exited",
                "Withdrew everything",
                "One question, then what changed. Then rest",
              ],
            ],
          },
          {
            kind: "path",
            name: "One depositor's path: Ada",
            steps: [
              {
                when: "Day 0",
                what: "Ada supplies USDC on Base and leaves her email on your app's capture form.",
              },
              {
                when: "Day 12",
                what: "An incentive on her market changes next week. She gets one email with the date and what it means for her deposit.",
              },
              {
                when: "Day 30",
                what: "Her first monthly statement: what her position earned, in dollars.",
              },
              {
                when: "Day 41",
                what: "She borrows against it. ETH falls and her health drops to 1.2. The alert reaches her in-app and by email with her liquidation price. She repays part of the loan.",
              },
              {
                when: "Day 70",
                what: "She withdraws half. One question on why. Two weeks later, the new vault for the asset she still holds.",
              },
            ],
          },
        ],
        why: "Deposits are concentrated, so a few wallets decide the curve. Reading stages by wallet and by capital shows whether you are losing many small depositors or a few large ones, and those are different problems with different messages.",
      },
    },
    {
      id: "retention-triggers",
      title: "4. Retention triggers",
      whw: {
        what: "A retention trigger is a single message sent the same day something happens to a user's position. These are service messages: no offer, no forecast.",
        how: [
          {
            kind: "table",
            head: ["Moment", "What it says", "Channel"],
            rows: [
              [
                "Health factor falling",
                "Current health, the liquidation price, how to add collateral or repay",
                "In-app and email at once",
              ],
              [
                "Liquidated",
                "What happened in plain words, what was sold and what is left. No promotion",
                "Email",
              ],
              [
                "Out of range",
                "That the position stopped earning fees, and what it now holds",
                "Email",
              ],
              [
                "Rewards claimable",
                "The amount and one button",
                "In-app, then email",
              ],
              [
                "Lock or maturity ends",
                "The date and the options",
                "Email, 7 days and 1 day before",
              ],
              [
                "Market at full utilization",
                "That withdrawals may be delayed, why, and where updates are posted",
                "Email to depositors in that market",
              ],
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "Two rules we never bend",
            items: [
              "A risk alert fires from the position, never from a calendar.",
              "A service message never carries an offer.",
            ],
          },
          {
            kind: "note",
            text: "In the October 2025 crash, most liquidatable volume went within about two minutes. An alert at 1.0 is too late.",
          },
        ],
        why: "Liquidations fall hardest on the users least able to protect themselves: about 80% of Aave liquidation events happen outside Ethereum, at an average of $4,000 to $7,000, against more than $50,000 on Ethereum. Aave does not alert its own users; its help page points them to third-party tools. And when a crisis hits, the first message matters: after the April 2026 rsETH exploit, Aave lost $8.45B of deposits in two days and its largest pools reached full utilization.",
      },
    },
    {
      id: "newsletter",
      title: "5. Newsletter",
      whw: {
        what: "One email every two weeks to depositors who opted in to news.",
        how: [
          {
            kind: "list",
            ordered: true,
            items: [
              "**Your markets.** Rates, utilization and caps for the markets this reader is in, with the date we checked.",
              "**What changed.** Parameter changes and governance outcomes that affect depositors.",
              "**One explainer.** Health factor, out-of-range liquidity, how a maturity works.",
              "**What is new.** New markets and vaults, each with its risk terms.",
              "**The calendar.** Fixed dates: unlocks, maturities and votes.",
            ],
          },
          {
            kind: "p",
            text: "350 to 450 words and one main button. Every rate carries its date, and nothing in it reads as a promise of yield.",
          },
        ],
        why: "Depositors who understand their position stay through volatility, and the ones who do not leave at the first scare. The explainer does the teaching that alerts have no room for, and the calendar means no maturity or unlock comes as a surprise.",
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
              "Loan health alert",
              "In-app and email together",
              "None: this one goes on both",
            ],
            ["Liquidated", "Email", "A notice in the app on their next visit"],
            ["Out of range", "Email", "In-app on the position page"],
            [
              "Rewards claimable",
              "In-app",
              "Email if unclaimed after 48 hours",
            ],
            ["Monthly statement", "Email", "None"],
          ],
        },
        {
          kind: "p",
          text: "The health alert is the one exception to one channel per step, because the cost of a missed message is a liquidation. Everything else has one owner and a fallback that fires only if the first went unread.",
        },
      ],
    },
    {
      id: "data",
      title: "The events we need",
      blocks: [
        {
          kind: "p",
          text: "Lending and liquidity protocols already emit most of what we need on-chain. We read it; your developer adds one script for in-app.",
        },
        {
          kind: "table",
          head: ["Event", "Where it comes from"],
          rows: [
            [
              "deposit_made, withdrawal_made",
              "Supply and Withdraw events on the pool",
            ],
            ["borrow_opened, loan_repaid", "Borrow and Repay events"],
            [
              "health_factor_changed",
              "The pool's account data for each borrower, read on a schedule and on price moves",
            ],
            [
              "liquidation_detected",
              "The liquidation event, with what was sold",
            ],
            [
              "position_out_of_range",
              "The pool price against the position's range",
            ],
            [
              "rewards_claimable, rewards_claimed",
              "Your incentives contract or distributor",
            ],
            ["lock_ending", "The lock or maturity date held on-chain"],
            ["vault_created", "Your factory contract's creation event"],
          ],
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
            {
              type: "Out of range, email",
              channels: "email",
              subject: "Your position stopped earning fees",
              preview: "The price left your range. Here is what you hold now",
              body: [
                "The ETH/USDC price moved outside the range you set, so your position has not earned fees since Tuesday.",
                "It now holds only USDC. You can leave it as it is, or adjust the range to where the price is trading.",
              ],
              action: "See my position",
            },
            {
              type: "Monthly statement, email",
              channels: "email",
              subject: "Your September statement",
              preview: "What your deposit earned last month, in dollars",
              body: [
                "Your USDC deposit earned $41.20 in September, at a rate that averaged 4.1% over the month.",
                "Rates change with the market. You can see today's rate and your full history on your position page.",
              ],
              action: "See my position",
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
              what: "Deposits still in place",
              window: "30 and 90 days after they arrive",
            },
            {
              what: "New deposits from existing depositors",
              window: "Monthly",
            },
            {
              what: "Loans back above the health level after an alert",
              window: "24 hours",
            },
            {
              what: "Liquidations among alerted wallets, against the holdout",
              window: "30 days",
            },
            { what: "Rewards claimed after a reminder", window: "48 hours" },
            {
              what: "Out-of-range positions adjusted after an email",
              window: "7 days",
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
            "Which depositors withdrew over $50,000 in the last 7 days?",
            "Which vault keeps deposits longest?",
            "Which borrowers sit between health 1.0 and 1.2 right now?",
          ],
        },
      ],
    },
    platformSection(
      "Everything above runs in it. The Loops start from supply, borrow, liquidation and reward events, the segments come from positions and holdings, and the results are read from the same data."
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
              "Which markets and chains are in scope, and what are the contract addresses?",
              "Triggers watch the right contracts from day one",
            ],
            [
              "What health level should trigger an alert for each collateral?",
              "Volatile collateral needs an earlier warning",
            ],
            [
              "Who can approve a crisis message, and how fast?",
              "In a run, the first hour matters",
            ],
            [
              "Do you market to users in the UK?",
              "UK rules ban referral bonuses and stale rates in crypto promotions",
            ],
            BASE_QUESTIONS[1],
            BASE_QUESTIONS[2],
          ],
        },
      ],
    },
  ],
};
