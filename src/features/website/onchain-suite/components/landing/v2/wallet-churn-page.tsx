"use client";

import { type ReactNode, useMemo, useState } from "react";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";
import {
  count,
  pct1,
  RelatedTools,
  Segmented,
  ToolCard,
  ToolExplainer,
  ToolField,
  ToolHero,
  usd0,
  usdCompact,
  WorksheetRow,
} from "./tool-kit";

const PERIODS = ["Weekly", "Monthly", "Quarterly"] as const;
type Period = (typeof PERIODS)[number];
/** How many of each period fit in a month (for normalising churn to monthly). */
const PER_MONTH: Record<Period, number> = {
  Weekly: 52 / 12,
  Monthly: 1,
  Quarterly: 1 / 3,
};
/** Singular noun for the selected period, for readable copy. */
const PERIOD_NOUN: Record<Period, string> = {
  Weekly: "week",
  Monthly: "month",
  Quarterly: "quarter",
};

const BENCHMARKS: [string, string][] = [
  ["DeFi, lending", "5.2%"],
  ["Perps, trading", "9.8%"],
  ["NFT, collectibles", "14.1%"],
  ["Airdrop-acquired", "19.4%"],
];

const EXPLAINER: [string, string][] = [
  [
    "Why wallet churn is not customer churn",
    "A customer cancels; a wallet just stops. There is no cancellation event to count, so churn has to be defined as an absence of activity over a window you choose, and that choice changes the number more than anything else on this page.\n\nPick the window from your natural usage cycle. If a healthy wallet transacts weekly, a 30-day silence is churn. If it stakes and waits, 30 days is nothing and you will scare yourself with a number that means very little.",
  ],
  [
    "The compounding is what hurts",
    "A 6 percent monthly churn rate sounds survivable. Compounded, it means half your active base is gone in eleven months and 53 percent is gone within a year.\n\nThat is why the annual figure sits next to the monthly one above. Teams that only look at the monthly rate consistently underestimate how much acquisition they need to hold flat.",
  ],
  [
    "Churn and value are not evenly distributed",
    "Wallet churn is usually worst in the long tail and mildest among your largest holders, which means a blended rate can look alarming while revenue barely moves, or look calm while your best cohort quietly leaves.\n\nRun this per cohort: by size, by acquisition channel, by first action. The cohort with the worst churn and the highest revenue per wallet is where retention work pays for itself first.",
  ],
];

const RELATED: [string, string, string][] = [
  [
    "Dormant wallet reactivation",
    "Revenue recoverable from the wallets this churn produced.",
    "/tools/dormant-wallet-reactivation",
  ],
  [
    "Wallet reachability score",
    "How much of your churned base you can still message.",
    "/tools/wallet-reachability-score",
  ],
  [
    "Cost per acquisition",
    "What replacing a churned wallet actually costs you.",
    "/tools/cost-per-acquisition",
  ],
];

export function WalletChurnPage() {
  const [activeStart, setActiveStart] = useState(24000);
  const [wentInactive, setWentInactive] = useState(3120);
  const [newWallets, setNewWallets] = useState(4100);
  const [revenue, setRevenue] = useState(22);
  const [period, setPeriod] = useState<Period>("Monthly");

  const m = useMemo(() => {
    const periodChurn = activeStart > 0 ? wentInactive / activeStart : 0;
    const stillActive = Math.max(0, activeStart - wentInactive);
    const net = newWallets - wentInactive;
    const growth = activeStart > 0 ? (net / activeStart) * 100 : 0;
    const monthlyChurn = 1 - Math.pow(1 - periodChurn, PER_MONTH[period]);
    const annual = 1 - Math.pow(1 - monthlyChurn, 12);
    const lifespan = monthlyChurn > 0 ? 1 / monthlyChurn : Infinity;
    const ltv = monthlyChurn > 0 ? revenue / monthlyChurn : Infinity;
    const revenueLost = wentInactive * revenue;
    // 12-month retention curve at the monthly rate.
    const curve = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      share: Math.pow(1 - monthlyChurn, i + 1),
    }));
    return {
      periodChurn,
      stillActive,
      net,
      growth,
      monthlyChurn,
      annual,
      lifespan,
      ltv,
      revenueLost,
      curve,
    };
  }, [activeStart, wentInactive, newWallets, revenue, period]);

  const barColor = (share: number, isLast: boolean) =>
    isLast ? "var(--line)" : share >= 0.5 ? "#2f94ff" : "var(--acc)";

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          <ToolHero
            crumb="Wallet churn rate"
            title="Wallet churn rate calculator"
            sub="Churn measured on wallets, not accounts. Enter one period and see what it compounds to over a year, and how long a wallet lasts at that rate."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
            {/* Inputs + retention curve */}
            <Reveal>
              <ToolCard>
                <div className="text-[16px] font-semibold t-ink">
                  One cohort, one period
                </div>
                <p className="mt-1 text-[13px] t-muted">
                  Count a wallet as active if it transacted at least once in the
                  period.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ToolField
                    label="Active wallets at start"
                    value={activeStart}
                    onChange={setActiveStart}
                  />
                  <ToolField
                    label="Wallets that went inactive"
                    value={wentInactive}
                    onChange={setWentInactive}
                  />
                  <ToolField
                    label="New wallets acquired"
                    value={newWallets}
                    onChange={setNewWallets}
                  />
                  <ToolField
                    label="Monthly revenue per active wallet"
                    value={revenue}
                    onChange={setRevenue}
                    prefix="$"
                  />
                </div>
                <div className="mt-5">
                  <Segmented
                    label="Period length"
                    options={PERIODS}
                    value={period}
                    onChange={setPeriod}
                  />
                </div>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-[14px] font-semibold t-ink">
                      Retention curve at this rate
                    </div>
                    <div className="mono text-[10.5px] uppercase tracking-[0.12em] t-muted2">
                      12 months, no reactivation
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-12 gap-1.5">
                    {m.curve.map(({ month, share }) => (
                      <div key={month} className="flex flex-col items-center">
                        <div className="flex h-[120px] w-full items-end">
                          <div
                            className="w-full"
                            style={{
                              height: `${Math.max(share * 100, 1.5)}%`,
                              background: barColor(share, month === 12),
                              borderRadius: "2px 2px 0 0",
                            }}
                          />
                        </div>
                        <span className="mono mt-1.5 text-[10px] t-muted2">
                          {month}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[12.5px] leading-snug t-muted2">
                    Each bar is the share of today&apos;s active cohort still
                    active in that month, if nothing changes.
                  </p>
                </div>
              </ToolCard>
            </Reveal>

            {/* Worksheet + net movement */}
            <div className="grid gap-5">
              <Reveal>
                <ToolCard label="Worksheet">
                  <WorksheetRow k="Active at start" v={count(activeStart)} />
                  <WorksheetRow
                    k="Went inactive"
                    v={`(${count(wentInactive)})`}
                    muted
                  />
                  <WorksheetRow
                    k="Still active at end"
                    v={count(m.stillActive)}
                  />
                  <WorksheetRow
                    k="New wallets acquired"
                    v={`+${count(newWallets)}`}
                  />
                  <div
                    className="my-3 border-t border-dashed"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[15px] font-semibold t-ink">
                        {period} churn
                      </div>
                      <div className="text-[12px] t-muted2">
                        Wallets, not accounts
                      </div>
                    </div>
                    <span
                      className="mono pb-0.5 text-[26px] font-semibold tabular-nums t-ink"
                      style={{ borderBottom: "2px solid #ff6828" }}
                    >
                      {pct1(m.periodChurn * 100)}
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed t-muted">
                    Of the wallets active at the start of the{" "}
                    {PERIOD_NOUN[period]}, this share did not transact again.
                  </p>
                  <dl
                    className="mt-5 space-y-0 border-t pt-1"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <MetricRow
                      k="Normalised monthly churn"
                      v={pct1(m.monthlyChurn * 100)}
                    />
                    <MetricRow
                      k="Compounds to annually"
                      v={pct1(m.annual * 100)}
                      color="#b53c0b"
                    />
                    <MetricRow
                      k="Average wallet lifespan"
                      v={
                        Number.isFinite(m.lifespan)
                          ? `${m.lifespan.toFixed(1)} mo`
                          : "-"
                      }
                    />
                    <MetricRow k="Lifetime value per wallet" v={usd0(m.ltv)} />
                    <MetricRow
                      k="Revenue lost this period"
                      v={usdCompact(m.revenueLost)}
                    />
                  </dl>
                </ToolCard>
              </Reveal>

              <Reveal delay={0.06}>
                <ToolCard label="Net movement">
                  <p className="text-[14px] leading-relaxed t-muted">
                    {m.net >= 0 ? (
                      <>
                        You added{" "}
                        <span className="font-semibold t-ink">
                          {count(m.net)}
                        </span>{" "}
                        wallets net this period, growth of{" "}
                        <span className="font-semibold t-ink">
                          {pct1(m.growth)}
                        </span>{" "}
                        on the starting base.
                      </>
                    ) : (
                      <>
                        You lost{" "}
                        <span className="font-semibold t-ink">
                          {count(Math.abs(m.net))}
                        </span>{" "}
                        wallets net this period,{" "}
                        <span className="font-semibold t-ink">
                          {pct1(Math.abs(m.growth))}
                        </span>{" "}
                        of the starting base.
                      </>
                    )}{" "}
                    At this churn rate you must keep acquiring{" "}
                    <span className="font-semibold t-ink">
                      {count(wentInactive)}
                    </span>{" "}
                    wallets a period just to stand still.
                  </p>
                </ToolCard>
              </Reveal>
            </div>
          </div>

          {/* Formula + benchmarks */}
          <div className="mt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
            <Reveal>
              <ToolCard label="The formula">
                <div className="space-y-3">
                  <FormulaLine>
                    Churn = Wallets inactive ÷ Active wallets at start × 100
                  </FormulaLine>
                  <FormulaLine>
                    Annual = (1 − (1 − monthly churn)^12) × 100
                  </FormulaLine>
                </div>
              </ToolCard>
            </Reveal>
            <Reveal delay={0.06}>
              <ToolCard label="Monthly churn benchmarks">
                <div className="grid grid-cols-2 gap-4">
                  {BENCHMARKS.map(([label, value]) => (
                    <div key={label}>
                      <div className="text-[20px] font-semibold tabular-nums t-ink">
                        {value}
                      </div>
                      <div className="mt-0.5 text-[12.5px] t-muted">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[12px] t-muted2">
                  Median monthly wallet churn by category, rolling 90 days.
                </p>
              </ToolCard>
            </Reveal>
          </div>

          <ToolExplainer items={EXPLAINER} />
          <RelatedTools items={RELATED} />
        </div>
      </section>
    </PageShell>
  );
}

function MetricRow({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-t py-2.5 first:border-0"
      style={{ borderColor: "var(--line)" }}
    >
      <dt className="text-[13.5px] t-muted">{k}</dt>
      <dd
        className="mono text-[14px] font-medium tabular-nums t-ink"
        style={color ? { color } : undefined}
      >
        {v}
      </dd>
    </div>
  );
}

function FormulaLine({ children }: { children: ReactNode }) {
  return (
    <div
      className="mono rounded-lg border px-4 py-3 text-[13px] t-ink2"
      style={{ borderColor: "var(--line)", background: "var(--acc-soft)" }}
    >
      {children}
    </div>
  );
}

export default WalletChurnPage;
