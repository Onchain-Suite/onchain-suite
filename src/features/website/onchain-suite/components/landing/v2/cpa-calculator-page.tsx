"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useMemo, useState } from "react";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";

interface Channel {
  id: string;
  name: string;
  spend: number;
  connected: number;
  firstTx: number;
}

const SEED: Channel[] = [
  {
    id: "paid-social",
    name: "Paid social",
    spend: 18000,
    connected: 4200,
    firstTx: 610,
  },
  {
    id: "quests",
    name: "Quests and campaigns",
    spend: 26000,
    connected: 11500,
    firstTx: 1340,
  },
  {
    id: "kol",
    name: "KOL and partnerships",
    spend: 12000,
    connected: 1900,
    firstTx: 470,
  },
  {
    id: "organic",
    name: "Organic and referral",
    spend: 3500,
    connected: 2600,
    firstTx: 820,
  },
];

const BENCHMARKS: [string, string][] = [
  ["Organic and referral", "$4.20"],
  ["Quests and campaigns", "$19.40"],
  ["Paid social", "$29.50"],
  ["KOL and partnerships", "$54.90"],
];

const RELATED: [string, string, string][] = [
  [
    "Wallet churn rate",
    "How long the wallets you just bought actually last.",
    "/tools/wallet-churn-rate",
  ],
  [
    "Dormant wallet reactivation",
    "The cheaper alternative to buying a replacement wallet.",
    "/tools/dormant-wallet-reactivation",
  ],
  [
    "Wallet reachability score",
    "Whether you can message the wallets you paid for.",
    "/tools/wallet-reachability-score",
  ],
];

const usd2 = (n: number) => (Number.isFinite(n) ? `$${n.toFixed(2)}` : "-");
const usdCompact = (n: number) =>
  n >= 1000
    ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    : `$${n.toLocaleString()}`;
const pct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : "-");
const count = (n: number) => n.toLocaleString();

let nextId = 0;
const newChannelId = () => `ch-${(nextId += 1)}`;

export function CpaCalculatorPage() {
  const [channels, setChannels] = useState<Channel[]>(SEED);
  const [ltv, setLtv] = useState(210);

  const update = (id: string, patch: Partial<Channel>) =>
    setChannels((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  const addChannel = () =>
    setChannels((rows) => [
      ...rows,
      {
        id: newChannelId(),
        name: "New channel",
        spend: 0,
        connected: 0,
        firstTx: 0,
      },
    ]);
  const removeChannel = (id: string) =>
    setChannels((rows) => rows.filter((r) => r.id !== id));

  const totals = useMemo(() => {
    const spend = channels.reduce((s, c) => s + c.spend, 0);
    const connected = channels.reduce((s, c) => s + c.connected, 0);
    const firstTx = channels.reduce((s, c) => s + c.firstTx, 0);
    const blendedCpa = firstTx > 0 ? spend / firstTx : NaN;
    const cpaPerConnect = connected > 0 ? spend / connected : NaN;
    const activationRate = connected > 0 ? (firstTx / connected) * 100 : NaN;
    const ratio =
      Number.isFinite(blendedCpa) && blendedCpa > 0 ? ltv / blendedCpa : NaN;
    const grossMargin = Number.isFinite(blendedCpa) ? ltv - blendedCpa : NaN;
    return {
      spend,
      connected,
      firstTx,
      blendedCpa,
      cpaPerConnect,
      activationRate,
      ratio,
      grossMargin,
    };
  }, [channels, ltv]);

  const num = (v: string) => {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          <div className="mono mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] t-muted2">
            <Link href="/tools" className="hover:text-[color:var(--acc)]">
              Tools
            </Link>
            <span aria-hidden="true">/</span>
            <span className="t-muted">Cost per acquisition</span>
          </div>
          <h1 className="max-w-3xl text-[30px] font-semibold leading-tight tracking-tight t-ink sm:text-[38px]">
            Cost per acquisition calculator
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed t-muted">
            Cost per connect flatters every channel. Enter spend, connects and
            first transactions to see what a transacting wallet actually costs,
            per channel and blended.
          </p>

          {/* Channel table */}
          <Reveal className="mt-10">
            <div className="card overflow-x-auto p-2 sm:p-3">
              <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="mono text-left text-[10.5px] uppercase tracking-[0.12em] t-muted2">
                    <th className="px-3 py-2.5 font-medium">Channel</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Spend
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Connected
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      First tx
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">CPA</th>
                    <th className="px-3 py-2.5 text-right font-medium">
                      Activation
                    </th>
                    <th className="w-8 px-1 py-2.5" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {channels.map((c) => {
                    const cpa = c.firstTx > 0 ? c.spend / c.firstTx : NaN;
                    const act =
                      c.connected > 0 ? (c.firstTx / c.connected) * 100 : NaN;
                    return (
                      <tr
                        key={c.id}
                        className="border-t"
                        style={{ borderColor: "var(--line)" }}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            value={c.name}
                            onChange={(e) =>
                              update(c.id, { name: e.target.value })
                            }
                            aria-label="Channel name"
                            className="w-full min-w-[9rem] rounded-lg border bg-transparent px-2.5 py-1.5 text-[13.5px] t-ink outline-none focus:border-[color:var(--acc)]"
                            style={{ borderColor: "var(--line)" }}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <NumCell
                            value={c.spend}
                            prefix="$"
                            onChange={(v) => update(c.id, { spend: num(v) })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <NumCell
                            value={c.connected}
                            onChange={(v) =>
                              update(c.id, { connected: num(v) })
                            }
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <NumCell
                            value={c.firstTx}
                            onChange={(v) => update(c.id, { firstTx: num(v) })}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium tabular-nums t-ink">
                          {usd2(cpa)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums t-muted">
                          {pct(act)}
                        </td>
                        <td className="px-1 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeChannel(c.id)}
                            aria-label={`Remove ${c.name}`}
                            className="rounded-md p-1.5 t-muted2 transition-colors hover:text-[color:var(--acc)]"
                          >
                            <TrashIcon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <button
                type="button"
                onClick={addChannel}
                className="mono mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] uppercase tracking-[0.1em] t-muted transition-colors hover:text-[color:var(--acc)]"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Add channel
              </button>
            </div>
          </Reveal>

          {/* Worksheet + payback */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Reveal>
              <div className="card h-full p-6">
                <div className="mono mb-4 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                  Worksheet
                </div>
                <dl className="space-y-3">
                  <Row
                    k="Total spend across channels"
                    v={usdCompact(totals.spend)}
                  />
                  <Row k="Wallets connected" v={count(totals.connected)} />
                  <Row k="Made a first transaction" v={count(totals.firstTx)} />
                  <Row k="Activation rate" v={pct(totals.activationRate)} />
                  <Row
                    k="Blended CPA"
                    v={usd2(totals.blendedCpa)}
                    sub={`${usd2(totals.cpaPerConnect)} per connect`}
                    strong
                  />
                </dl>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="card h-full p-6">
                <div className="mono mb-4 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                  Payback check
                </div>
                <label className="block">
                  <span className="text-[13px] t-muted">
                    Lifetime value per wallet
                  </span>
                  <div
                    className="mt-1.5 flex items-center gap-1 rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span className="t-muted2">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={ltv}
                      onChange={(e) => setLtv(num(e.target.value))}
                      aria-label="Lifetime value per wallet"
                      className="w-full bg-transparent text-[15px] font-medium t-ink outline-none"
                    />
                  </div>
                </label>
                <dl className="mt-4 space-y-3">
                  <Row
                    k="LTV to CPA ratio"
                    v={
                      Number.isFinite(totals.ratio)
                        ? `${totals.ratio.toFixed(1)}:1`
                        : "-"
                    }
                    strong
                  />
                  <Row
                    k="Gross margin per wallet"
                    v={usd2(totals.grossMargin)}
                  />
                  <Row k="Wallets acquired" v={count(totals.firstTx)} />
                  <Row k="Total spend" v={usdCompact(totals.spend)} />
                </dl>
              </div>
            </Reveal>
          </div>

          {/* Benchmarks */}
          <Reveal className="mt-8">
            <div className="card p-6">
              <div className="mono mb-4 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                CPA benchmarks
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {BENCHMARKS.map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[22px] font-semibold tabular-nums t-ink">
                      {value}
                    </div>
                    <div className="mt-1 text-[13px] t-muted">{label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12.5px] t-muted2">
                Median cost per transacting wallet by channel.
              </p>
            </div>
          </Reveal>

          {/* Explainer */}
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {[
              {
                h: "A connected wallet is not an acquisition",
                b: "Most dashboards divide spend by wallets connected, which is why reported CPA in web3 looks impossibly good. Connecting is free, reversible and often incentivised; it tells you almost nothing about whether you bought a user. This tool asks for both numbers so you can see the two side by side.",
              },
              {
                h: "Cheap channels are usually cheap for a reason",
                b: "Quest platforms and airdrop campaigns reliably produce the lowest cost per connect and, very often, the highest cost per retained wallet. Compare CPA against a cohort's actual churn before you shift budget: a channel with double the CPA and half the churn is the cheaper channel.",
              },
              {
                h: "What to do with a bad ratio",
                b: "If your LTV to CPA ratio is under three, the instinct is to cut spend. Look at activation first: a channel converting 14 percent of connects into transactions has more headroom in onboarding than in bidding.",
              },
              {
                h: "Reactivation is the other lever",
                b: "A dormant wallet you already paid for costs a fraction of a new one, which is usually the fastest way to move a blended CPA that will not budge.",
              },
            ].map((item) => (
              <Reveal key={item.h}>
                <h3 className="text-[17px] font-semibold t-ink">{item.h}</h3>
                <p className="mt-2 text-[14px] leading-relaxed t-muted">
                  {item.b}
                </p>
              </Reveal>
            ))}
          </div>

          {/* Related tools */}
          <div className="mono mb-5 mt-16 text-[11px] uppercase tracking-[0.14em] t-muted2">
            Related tools
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {RELATED.map(([title, body, href]) => (
              <Link
                key={title}
                href={href}
                className="card block p-6 transition-colors hover:border-[color:var(--acc)]"
              >
                <div className="text-[15px] font-semibold t-ink">{title}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                  {body}
                </p>
                <span
                  className="mono mt-3 inline-block text-[12px] uppercase tracking-[0.1em]"
                  style={{ color: "var(--acc)" }}
                >
                  Open tool →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/** Right-aligned numeric input cell for the channel table. */
function NumCell({
  value,
  prefix,
  onChange,
}: {
  value: number;
  prefix?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex items-center justify-end gap-0.5 rounded-lg border px-2.5 py-1.5"
      style={{ borderColor: "var(--line)" }}
    >
      {prefix ? <span className="t-muted2">{prefix}</span> : null}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[4rem] bg-transparent text-right text-[13.5px] tabular-nums t-ink outline-none"
      />
    </div>
  );
}

/** A definition row with an optional strong style + subtitle. */
function Row({
  k,
  v,
  sub,
  strong,
}: {
  k: string;
  v: string;
  sub?: string;
  strong?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-t pt-3 first:border-0 first:pt-0"
      style={{ borderColor: "var(--line)" }}
    >
      <dt className="text-[13.5px] t-muted">{k}</dt>
      <dd className="text-right">
        <span
          className={
            strong
              ? "text-[18px] font-semibold tabular-nums t-ink"
              : "text-[14px] font-medium tabular-nums t-ink"
          }
        >
          {v}
        </span>
        {sub ? <span className="block text-[12px] t-muted2">{sub}</span> : null}
      </dd>
    </div>
  );
}

export default CpaCalculatorPage;
