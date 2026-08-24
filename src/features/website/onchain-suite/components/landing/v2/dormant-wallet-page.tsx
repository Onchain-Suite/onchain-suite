"use client";

import { useMemo, useState } from "react";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";
import {
  count,
  RelatedTools,
  ToolCard,
  ToolExplainer,
  ToolField,
  ToolHero,
  usdCompact,
  WorksheetRow,
} from "./tool-kit";

const BENCHMARKS: [string, string][] = [
  ["Reachable share", "31%"],
  ["Reactivation rate", "8.4%"],
  ["Retained 6 months on", "46%"],
];

const EXPLAINER: [string, string][] = [
  [
    "What counts as a dormant wallet?",
    "A wallet is dormant when it has interacted with your contracts at least once and then gone quiet for longer than your natural usage cycle. For a perps venue that might be 14 days. For a staking protocol it might be a quarter. Ninety days is a reasonable default if you have no cycle in mind.\n\nThe distinction that matters is dormant versus lost. A lost wallet has withdrawn its balance and moved on. A dormant wallet often still holds a position, which is exactly why it is worth a message.",
  ],
  [
    "Why reachability decides the number",
    "Teams tend to argue about reactivation rate. It is the wrong lever. Move the rate from 8% to 12% and the result shifts modestly; move reachability from 30% to 60% and it doubles.\n\nReachability is a collection problem, not a messaging problem. Every touchpoint where a wallet connects is an opportunity to ask for one durable channel, and the ones that ask early collect two to three times more than the ones that ask at churn.",
  ],
  [
    "Reactivation revenue is not one payment",
    "The mistake in most back-of-envelope versions of this maths is treating a reactivated wallet as a single transaction. It is a cohort that resumes contributing at roughly the rate of your existing active base, then decays again.\n\nThat is why the months-retained input exists. Set it to what your data says rather than to the number you would like. A reactivated wallet that stays seven months is worth more than four times one that stays one month and leaves.",
  ],
];

const MOVES: [string, string][] = [
  [
    "Ask for a channel at connect, not at churn",
    "The cheapest reachability gain is a single optional field at wallet connect. Wallets that give you an address at their first session are the ones still interested enough to answer.",
  ],
  [
    "Trigger on the drift, not the departure",
    "Dormancy is visible weeks before it is complete: fewer sessions, smaller positions, a bridge out. Fire on the leading signal and reactivation rates roughly double against a 90-day sweep.",
  ],
  [
    "Say what happened while they were gone",
    "The highest-performing reactivation message is specific and unflattering to send: what changed, what their position did, what they missed. Generic we-miss-you sends underperform by a wide margin.",
  ],
  [
    "Segment by why they left",
    "Wallets that left after a fee change need different copy from wallets that left after a failed transaction. One segment, one reason, one message.",
  ],
  [
    "Price the incentive against retained months",
    "An incentive that buys one transaction is a cost. One that buys seven months of activity is an investment. Model the incentive against the months-retained figure above before you set it.",
  ],
];

const RELATED: [string, string, string][] = [
  [
    "Wallet reachability score",
    "What share of your holders you can actually message today.",
    "/tools/wallet-reachability-score",
  ],
  [
    "Wallet churn rate",
    "The rate that produced these dormant wallets in the first place.",
    "/tools/wallet-churn-rate",
  ],
  [
    "Cost per acquisition",
    "What replacing a dormant wallet with a new one costs you.",
    "/tools/cost-per-acquisition",
  ],
];

export function DormantWalletPage() {
  const [dormant, setDormant] = useState(42000);
  const [reachable, setReachable] = useState(34);
  const [reactivation, setReactivation] = useState(9);
  const [revenue, setRevenue] = useState(18);
  const [months, setMonths] = useState(7);
  const [campaignCost, setCampaignCost] = useState(4200);

  const m = useMemo(() => {
    const reached = dormant * (reachable / 100);
    const reactivated = reached * (reactivation / 100);
    const gross = reactivated * revenue * months;
    const net = gross - campaignCost;
    const unreachable = Math.max(0, dormant - reached);
    const reachedNotReact = Math.max(0, reached - reactivated);
    return { reached, reactivated, gross, net, unreachable, reachedNotReact };
  }, [dormant, reachable, reactivation, revenue, months, campaignCost]);

  const pctOf = (n: number) => (dormant > 0 ? (n / dormant) * 100 : 0);

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          <ToolHero
            crumb="Dormant wallet reactivation"
            title="Dormant wallet reactivation calculator"
            sub="Most protocols hold more value in the wallets that stopped showing up than in the ones they are still acquiring. This puts a number on that."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
            {/* Inputs */}
            <Reveal>
              <ToolCard>
                <div className="text-[16px] font-semibold t-ink">
                  Your numbers
                </div>
                <p className="mt-1 text-[13px] t-muted">
                  Defaults are the median across the protocols we onboarded last
                  quarter. Overwrite anything you know.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ToolField
                    label="Dormant wallets"
                    value={dormant}
                    onChange={setDormant}
                    hint="Wallets that transacted with you once but not in the last 90 days."
                  />
                  <ToolField
                    label="Reachable share"
                    value={reachable}
                    onChange={setReachable}
                    suffix="%"
                    hint="Share you hold an email, push token or wallet inbox for. This is usually the binding constraint."
                  />
                  <ToolField
                    label="Reactivation rate"
                    value={reactivation}
                    onChange={setReactivation}
                    suffix="%"
                    hint="Of those reached, the share that transacts again within 30 days of the campaign."
                  />
                  <ToolField
                    label="Monthly revenue per active wallet"
                    value={revenue}
                    onChange={setRevenue}
                    prefix="$"
                    hint="Fees, spread or subscription attributable to one active wallet per month."
                  />
                  <ToolField
                    label="Months retained after reactivation"
                    value={months}
                    onChange={setMonths}
                    suffix="mo"
                    hint="How long a reactivated wallet stays active before going quiet again."
                  />
                  <ToolField
                    label="Campaign cost"
                    value={campaignCost}
                    onChange={setCampaignCost}
                    prefix="$"
                    hint="Incentives, creative and sending cost for the whole reactivation programme."
                  />
                </div>
              </ToolCard>
            </Reveal>

            {/* Worksheet + leak */}
            <div className="grid gap-5">
              <Reveal>
                <ToolCard label="Worksheet">
                  <WorksheetRow k="Dormant wallets" v={count(dormant)} />
                  <WorksheetRow
                    k={`× reachable ${Math.round(reachable)}%`}
                    v={count(m.reached)}
                  />
                  <WorksheetRow
                    k={`× reactivated ${Math.round(reactivation)}%`}
                    v={count(m.reactivated)}
                  />
                  <WorksheetRow
                    k={`× $${count(revenue)} × ${count(months)} months`}
                    v={usdCompact(m.gross)}
                  />
                  <WorksheetRow
                    k="− campaign cost"
                    v={usdCompact(-campaignCost)}
                    muted
                  />
                  <div
                    className="mt-4 flex items-end justify-between gap-4 border-t pt-4"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <div>
                      <div className="text-[15px] font-semibold t-ink">
                        Recoverable, net
                      </div>
                      <div className="text-[12px] t-muted2">Over 12 months</div>
                    </div>
                    <span
                      className="mono text-[30px] font-semibold leading-none tabular-nums"
                      style={{ color: m.net >= 0 ? "var(--acc)" : "#c0392b" }}
                    >
                      {usdCompact(m.net)}
                    </span>
                  </div>
                </ToolCard>
              </Reveal>

              <Reveal delay={0.06}>
                <ToolCard label="Where it leaks">
                  <div
                    className="flex h-3 w-full overflow-hidden rounded-full"
                    style={{ background: "var(--line-2)" }}
                  >
                    <div
                      style={{
                        width: `${pctOf(m.unreachable)}%`,
                        background: "var(--muted-2)",
                      }}
                    />
                    <div
                      style={{
                        width: `${pctOf(m.reachedNotReact)}%`,
                        background: "#9db2f7",
                      }}
                    />
                    <div
                      style={{
                        width: `${pctOf(m.reactivated)}%`,
                        background: "var(--acc)",
                      }}
                    />
                  </div>
                  <ul className="mt-4 space-y-2 text-[13px]">
                    <LeakRow
                      color="var(--muted-2)"
                      label="Unreachable"
                      value={count(m.unreachable)}
                    />
                    <LeakRow
                      color="#9db2f7"
                      label="Reached, not reactivated"
                      value={count(m.reachedNotReact)}
                    />
                    <LeakRow
                      color="var(--acc)"
                      label="Build this segment"
                      value={count(m.reactivated)}
                      strong
                    />
                  </ul>
                </ToolCard>
              </Reveal>
            </div>
          </div>

          {/* Benchmarks */}
          <Reveal className="mt-8">
            <ToolCard label="Reactivation benchmarks">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {BENCHMARKS.map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[22px] font-semibold tabular-nums t-ink">
                      {value}
                    </div>
                    <div className="mt-1 text-[13px] t-muted">{label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] t-muted2">
                Median across protocols onboarded last quarter.
              </p>
            </ToolCard>
          </Reveal>

          <ToolExplainer items={EXPLAINER} />

          {/* Five ways to move the number */}
          <div className="mono mb-5 mt-16 text-[11px] uppercase tracking-[0.14em] t-muted2">
            Five ways to move the number
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MOVES.map(([h, b], i) => (
              <Reveal key={h}>
                <div className="card h-full p-6">
                  <div className="mono text-[12px] font-semibold t-acc">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-2 text-[15px] font-semibold t-ink">{h}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                    {b}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <RelatedTools items={RELATED} />
        </div>
      </section>
    </PageShell>
  );
}

function LeakRow({
  color,
  label,
  value,
  strong,
}: {
  color: string;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className={strong ? "font-medium t-ink" : "t-muted"}>{label}</span>
      <span className="mono ml-auto tabular-nums t-ink2">{value}</span>
    </li>
  );
}

export default DormantWalletPage;
