"use client";

import { useMemo, useState } from "react";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell } from "./shared";
import {
  count,
  parseNum,
  RelatedTools,
  ToolCard,
  ToolField,
  ToolHero,
  WorksheetRow,
} from "./tool-kit";

interface Channel {
  key: string;
  label: string;
  worksheetLabel: string;
  weight: number;
  hint: string;
}

const CHANNELS: Channel[] = [
  {
    key: "email",
    label: "Verified email addresses",
    worksheetLabel: "Verified email addresses",
    weight: 1.0,
    hint: "Confirmed, not bounced. The only channel that survives a device change.",
  },
  {
    key: "inbox",
    label: "Wallet inbox enabled",
    worksheetLabel: "Wallet inbox enabled",
    weight: 0.8,
    hint: "Wallets that can receive an onchain-native message today.",
  },
  {
    key: "push",
    label: "Push tokens",
    worksheetLabel: "Push tokens",
    weight: 0.65,
    hint: "App or browser push, live in the last 90 days.",
  },
  {
    key: "social",
    label: "Linked socials",
    worksheetLabel: "Linked socials",
    weight: 0.35,
    hint: "Farcaster, Telegram or Discord handles you can DM.",
  },
];

const BANDS: { min: number; name: string; blurb: string; color: string }[] = [
  {
    min: 60,
    name: "Strong",
    blurb: "Collection is solved; spend your effort on segmentation.",
    color: "#128355",
  },
  {
    min: 40,
    name: "Workable",
    blurb: "Half your base is dark and it is usually the older half.",
    color: "var(--acc)",
  },
  {
    min: 20,
    name: "Thin",
    blurb: "Campaign metrics describe a minority of your users.",
    color: "#b53c0b",
  },
  {
    min: 0,
    name: "Blind",
    blurb: "Fix collection before spending anything on messaging.",
    color: "#c0392b",
  },
];

const SCORE_MESSAGE: Record<string, string> = {
  Strong:
    "Collection is largely solved. Your effort now pays off most in segmentation, not capture.",
  Workable:
    "You can run real campaigns, but roughly half your value is sitting in wallets you cannot speak to.",
  Thin: "Your campaign metrics describe a minority of your users. Channel capture is the constraint.",
  Blind:
    "Most of your base is dark. Fix collection before spending anything on messaging.",
};

const INSIGHTS: [string, string][] = [
  [
    "Ask at the moment of value, not the moment of exit",
    "Wallets that connect for the first time convert on a channel request two to three times better than wallets asked during an offboarding or win-back flow.",
  ],
  [
    "Overlap is higher than teams assume",
    "The same engaged wallet tends to opt into everything. If you have not measured overlap, 25 to 35 percent is the usual range, and pretending it is zero inflates your score badly.",
  ],
  [
    "Push decays without you noticing",
    "Push tokens go stale at roughly 4 percent a month through reinstalls and permission resets. Score push on tokens that delivered in the last 90 days, not on lifetime opt-ins.",
  ],
  [
    "Reachability is per segment, not per base",
    "Your whales are almost always more reachable than your long tail. A base score of 40 can hide a top-decile score of 80, which changes what you should build first.",
  ],
];

const WEIGHTS_DOC: [string, string, string][] = [
  [
    "Verified email",
    "1.00",
    "Portable, durable, and the only channel that survives a wallet or device change.",
  ],
  [
    "Wallet inbox",
    "0.80",
    "Native to the context, but depends on the user still opening that wallet.",
  ],
  [
    "Push token",
    "0.65",
    "High intent when fresh, but tokens expire quietly and silently stop delivering.",
  ],
  [
    "Linked social",
    "0.35",
    "Reachable in principle, rate-limited and unreliable in practice at any scale.",
  ],
];

const RELATED: [string, string, string][] = [
  [
    "Dormant wallet reactivation",
    "Revenue recoverable from wallets that stopped showing up.",
    "/tools/dormant-wallet-reactivation",
  ],
  [
    "Wallet churn rate",
    "Monthly and compounding annual churn from active cohorts.",
    "/tools/wallet-churn-rate",
  ],
  [
    "Cost per acquisition",
    "Blended and per-channel cost of one acquired wallet.",
    "/tools/cost-per-acquisition",
  ],
];

const bandFor = (score: number) =>
  BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];

export function WalletReachabilityPage() {
  const [total, setTotal] = useState(60000);
  const [counts, setCounts] = useState<Record<string, number>>({
    email: 14000,
    inbox: 21000,
    push: 9000,
    social: 4000,
  });
  const [overlap, setOverlap] = useState(26);

  const setCount = (key: string, v: number) =>
    setCounts((c) => ({ ...c, [key]: v }));

  const m = useMemo(() => {
    const weighted = CHANNELS.map((c) => ({
      ...c,
      raw: counts[c.key] ?? 0,
      value: (counts[c.key] ?? 0) * c.weight,
    }));
    const sumWeighted = weighted.reduce((s, c) => s + c.value, 0);
    const overlapFrac = Math.min(Math.max(overlap, 0), 100) / 100;
    const overlapDeduction = sumWeighted * overlapFrac;
    const reachable = Math.max(0, sumWeighted - overlapDeduction);
    const score = total > 0 ? Math.round((reachable / total) * 100) : 0;
    // Biggest single gain: channel with the largest weighted headroom; closing a
    // quarter of it, net of overlap, lifts the score by this many points.
    const gains = weighted.map((c) => {
      const headroom = Math.max(0, total - c.raw);
      const lift =
        total > 0
          ? ((0.25 * headroom * c.weight * (1 - overlapFrac)) / total) * 100
          : 0;
      return { label: c.label, lift };
    });
    const best = gains.reduce(
      (a, b) => (b.lift > a.lift ? b : a),
      gains[0] ?? { label: "", lift: 0 }
    );
    return { weighted, sumWeighted, overlapDeduction, reachable, score, best };
  }, [counts, overlap, total]);

  const band = bandFor(m.score);

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          <ToolHero
            crumb="Wallet reachability"
            title="Wallet reachability score"
            sub="You cannot retain a wallet you cannot reach. Score how much of your base is addressable today, weighted by how durable each channel really is."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
            {/* Channels */}
            <Reveal>
              <ToolCard>
                <div className="text-[16px] font-semibold t-ink">
                  Your channels
                </div>
                <p className="mt-1 text-[13px] t-muted">
                  Enter how many wallets you can reach on each channel. Weights
                  reflect how durable each one is.
                </p>
                <div className="mt-5">
                  <ToolField
                    label="Total wallets"
                    value={total}
                    onChange={setTotal}
                  />
                </div>
                <div className="mt-4 space-y-4">
                  {CHANNELS.map((c) => (
                    <div key={c.key}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-[13px] font-medium t-ink2">
                          {c.label}
                        </span>
                        <span
                          className="mono rounded-md px-1.5 py-0.5 text-[10.5px] font-medium t-acc"
                          style={{ background: "var(--acc-soft)" }}
                        >
                          ×{c.weight.toFixed(2)}
                        </span>
                      </div>
                      <div
                        className="flex items-center rounded-lg border px-3 py-2"
                        style={{ borderColor: "var(--line)" }}
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          value={counts[c.key] ?? 0}
                          onChange={(e) =>
                            setCount(c.key, parseNum(e.target.value))
                          }
                          aria-label={c.label}
                          className="w-full min-w-0 bg-transparent text-[15px] font-medium tabular-nums t-ink outline-none"
                        />
                      </div>
                      <span className="mt-1.5 block text-[12px] leading-snug t-muted2">
                        {c.hint}
                      </span>
                    </div>
                  ))}
                  <ToolField
                    label="Channel overlap"
                    value={overlap}
                    onChange={setOverlap}
                    suffix="%"
                    hint="Share of reachable wallets addressable on more than one channel."
                  />
                </div>

                <div className="mt-7">
                  <div className="mono mb-3 text-[10px] uppercase tracking-[0.14em] t-muted2">
                    Coverage of total base
                  </div>
                  <div className="space-y-2.5">
                    {m.weighted.map((c) => {
                      const cov = total > 0 ? (c.raw / total) * 100 : 0;
                      return (
                        <div key={c.key} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-[12.5px] t-muted">
                            {c.label.split(" ")[0]}
                          </span>
                          <div
                            className="h-2 flex-1 overflow-hidden rounded-full"
                            style={{ background: "var(--line-2)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(cov, 100)}%`,
                                background: "var(--acc)",
                              }}
                            />
                          </div>
                          <span className="mono w-10 shrink-0 text-right text-[12px] tabular-nums t-muted2">
                            {Math.round(cov)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ToolCard>
            </Reveal>

            {/* Worksheet + score */}
            <div className="grid gap-5">
              <Reveal>
                <ToolCard label="Worksheet">
                  {m.weighted.map((c) => (
                    <WorksheetRow
                      key={c.key}
                      k={`${c.worksheetLabel} × ${c.weight.toFixed(2)}`}
                      v={count(c.value)}
                    />
                  ))}
                  <WorksheetRow
                    k={`− overlap ${Math.round(overlap)}%`}
                    v={`(${count(m.overlapDeduction)})`}
                    muted
                  />
                  <div
                    className="my-3 border-t border-dashed"
                    style={{ borderColor: "var(--line)" }}
                  />
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[13px] font-medium t-ink">
                      Reachable wallets of {count(total)}
                    </span>
                    <span className="mono text-[15px] font-semibold tabular-nums t-ink">
                      {count(m.reachable)}
                    </span>
                  </div>

                  <div
                    className="mt-5 flex items-end justify-between gap-4 border-t pt-4"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <div>
                      <div className="text-[13px] t-muted">
                        Reachability score
                      </div>
                      <div
                        className="mt-0.5 text-[15px] font-semibold"
                        style={{ color: band.color }}
                      >
                        {band.name}
                      </div>
                    </div>
                    <span
                      className="mono text-[34px] font-semibold leading-none tabular-nums"
                      style={{ color: band.color }}
                    >
                      {m.score}
                    </span>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed t-muted">
                    {SCORE_MESSAGE[band.name]}
                  </p>
                </ToolCard>
              </Reveal>

              <Reveal delay={0.06}>
                <ToolCard label="Biggest single gain">
                  <p className="text-[14px] leading-relaxed t-muted">
                    Closing a quarter of the gap on{" "}
                    <span className="font-semibold t-ink">
                      {m.best.label.toLowerCase()}
                    </span>{" "}
                    would lift your score by roughly{" "}
                    <span className="font-semibold t-ink">
                      {Math.round(m.best.lift)} points
                    </span>
                    . It is the largest weighted headroom in your base right
                    now.
                  </p>
                </ToolCard>
              </Reveal>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {INSIGHTS.map(([h, b], i) => (
              <Reveal key={h}>
                <div className="card h-full p-6">
                  <div
                    className="mono text-[12px] font-semibold t-acc"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-2 text-[15.5px] font-semibold t-ink">
                    {h}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                    {b}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Channel weights + score bands */}
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Reveal>
              <ToolCard label="Channel weights">
                <div className="space-y-4">
                  {WEIGHTS_DOC.map(([name, w, desc]) => (
                    <div key={name} className="flex items-start gap-4">
                      <span className="mono w-12 shrink-0 text-[18px] font-semibold tabular-nums t-acc">
                        {w}
                      </span>
                      <div>
                        <div className="text-[14px] font-semibold t-ink">
                          {name}
                        </div>
                        <p className="mt-0.5 text-[13px] leading-relaxed t-muted">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ToolCard>
            </Reveal>
            <Reveal delay={0.06}>
              <ToolCard label="Score bands">
                <div className="space-y-3">
                  {BANDS.map((b) => (
                    <div key={b.name} className="flex items-start gap-4">
                      <span
                        className="mono w-16 shrink-0 text-[12.5px] font-medium tabular-nums"
                        style={{ color: b.color }}
                      >
                        {b.min}-{b.min === 60 ? 100 : b.min + 19}
                      </span>
                      <p className="text-[13.5px] leading-relaxed t-muted">
                        <span className="font-semibold t-ink">{b.name}.</span>{" "}
                        {b.blurb}
                      </p>
                    </div>
                  ))}
                </div>
              </ToolCard>
            </Reveal>
          </div>

          <RelatedTools items={RELATED} />
        </div>
      </section>
    </PageShell>
  );
}

export default WalletReachabilityPage;
