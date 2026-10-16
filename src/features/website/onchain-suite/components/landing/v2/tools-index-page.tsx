"use client";

import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell, SIGNUP } from "./shared";

/** The featured "most used" tool + the inputs it collects (demo /tools). */
const FEATURED = {
  title: "Dormant wallet reactivation calculator",
  desc: "Put a number on the revenue sitting in wallets that stopped showing up, and see how much of it reachability is costing you.",
  href: "/tools/dormant-wallet-reactivation",
  asks: [
    ["Dormant wallets", "count"],
    ["Reachable share", "%"],
    ["Reactivation rate", "%"],
    ["Revenue per active wallet", "$/mo"],
    ["Months retained", "months"],
  ] as [string, string][],
};

const TOOLS: {
  cat: string;
  title: string;
  desc: string;
  href: string;
}[] = [
  {
    cat: "Acquisition",
    title: "Cost per acquisition calculator",
    desc: "Spend by channel against wallets that actually transacted, so a connect stops counting as an acquisition.",
    href: "/tools/cost-per-acquisition",
  },
  {
    cat: "Audience",
    title: "Wallet reachability score",
    desc: "Score how much of your base you can message across email, wallet inbox, push and socials, deduplicated.",
    href: "/tools/wallet-reachability-score",
  },
  {
    cat: "Retention",
    title: "Wallet churn rate calculator",
    desc: "One cohort, one period, then the compounding annual rate and the wallet lifespan it implies.",
    href: "/tools/wallet-churn-rate",
  },
];

const INFO: [string, string][] = [
  [
    "Why we publish the maths",
    "A calculator that hides its formula is a lead form. Every input, weight and benchmark on these pages is stated on the page so you can argue with it.",
  ],
  [
    "Where the benchmarks come from",
    "Aggregated, anonymised medians across protocols using OnchainSuite, refreshed quarterly. Directional guidance, never a projection of your results.",
  ],
  [
    "Nothing leaves your browser",
    "Inputs are calculated locally and never sent to us. Use real numbers.",
  ],
];

export function ToolsIndexPage() {
  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          {/* Left-aligned hero. */}
          <Reveal>
            <span className="eyebrow">Free tools</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="mt-5 max-w-3xl font-semibold tracking-tight t-ink"
              style={{
                fontSize: "clamp(2.1rem, 5vw, 3.5rem)",
                lineHeight: 1.05,
              }}
            >
              Calculators for teams who measure in wallets.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed t-muted">
              No signup, no email gate, no export wall. Every tool runs in the
              browser and every formula is written out on the page.
            </p>
          </Reveal>

          {/* Featured tool + "what it asks you for" panel. */}
          <Reveal className="mt-12">
            <div className="card p-6 sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-center">
                <div>
                  <div
                    className="mono text-[10.5px] uppercase tracking-[0.14em]"
                    style={{ color: "#ff6828" }}
                  >
                    Most used
                  </div>
                  <h2 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight t-ink sm:text-[28px]">
                    {FEATURED.title}
                  </h2>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed t-muted">
                    {FEATURED.desc}
                  </p>
                  <Link
                    href={FEATURED.href}
                    className="mono mt-6 inline-flex items-center gap-1.5 text-[12.5px] uppercase tracking-[0.1em] t-acc transition-opacity hover:opacity-80"
                  >
                    Open tool
                    <ArrowUpRightIcon
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="mono mb-2 text-[10px] uppercase tracking-[0.14em] t-muted2">
                    What it asks you for
                  </div>
                  <dl className="text-[13.5px]">
                    {FEATURED.asks.map(([k, u], i) => (
                      <div
                        key={k}
                        className={`flex items-center justify-between py-2 ${
                          i > 0 ? "border-t border-dashed" : ""
                        }`}
                        style={
                          i > 0 ? { borderColor: "var(--line)" } : undefined
                        }
                      >
                        <dt className="t-ink2">{k}</dt>
                        <dd className="mono t-muted2">{u}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-[12px] t-muted2">
                    Six inputs, one worksheet, no email gate.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Secondary tools. */}
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {TOOLS.map((t) => (
              <Reveal key={t.href}>
                <Link
                  href={t.href}
                  className="card group flex h-full flex-col p-6 transition-colors hover:border-[color:var(--acc)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                      {t.cat}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      style={{ color: "#128355", background: "#e7f4ee" }}
                    >
                      Live
                    </span>
                  </div>
                  <h3 className="mt-3 text-[17px] font-semibold t-ink">
                    {t.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed t-muted">
                    {t.desc}
                  </p>
                  <span className="mono mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em] t-acc">
                    Open tool
                    <ArrowUpRightIcon
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* Why we publish the maths. */}
          <div
            className="mt-16 grid gap-8 border-t pt-12 md:grid-cols-3"
            style={{ borderColor: "var(--line)" }}
          >
            {INFO.map(([h, b]) => (
              <Reveal key={h}>
                <h3 className="text-[15px] font-semibold t-ink">{h}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                  {b}
                </p>
              </Reveal>
            ))}
          </div>

          {/* Live-data CTA. */}
          <Reveal className="mt-8">
            <div className="card flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h3 className="text-[20px] font-semibold t-ink">
                  Want the same numbers on live data?
                </h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed t-muted">
                  Connect a contract and these calculators stop being estimates.
                  Free to five thousand wallets.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link href={SIGNUP} className="btn btn-primary">
                  Start free
                </Link>
                <Link href="/compare" className="btn btn-ghost">
                  Compare us first
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default ToolsIndexPage;
