"use client";

import { ArrowRightIcon, CheckIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import "./landing-v2.css";
import {
  CAPABILITIES,
  type Comparison,
  SWITCH_STEPS,
  WHY_CARDS,
} from "./compare-data";
import { Reveal } from "./primitives";
import { Heading, PageShell, SIGNUP } from "./shared";

/** One comparison-table cell: Yes -> check, No -> dash, anything else -> text. */
function Cell({ value, strong }: { value: string; strong?: boolean }) {
  if (value === "Yes") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium"
        style={{ color: strong ? "var(--acc)" : "var(--ink-2)" }}
      >
        <CheckIcon className="h-4 w-4" aria-hidden="true" />
        Yes
      </span>
    );
  }
  if (value === "No") {
    return <span className="text-[13.5px] t-muted2">—</span>;
  }
  return <span className="text-[13.5px] t-muted">{value}</span>;
}

export function ComparePage({ data }: { data: Comparison }) {
  const { name } = data;
  return (
    <PageShell>
      {/* Hero */}
      <section className="pt-16 pb-8 sm:pt-24">
        <div className="wrap-fit">
          <div className="max-w-3xl">
            <Reveal>
              <span className="eyebrow">{data.eyebrow}</span>
            </Reveal>
            <Reveal delay={0.05}>
              <h1
                className="mt-4 font-semibold tracking-tight t-ink"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.08 }}
              >
                OnchainSuite vs <span className="grad">{name}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-[17px] leading-relaxed t-muted">
                {data.intro}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={SIGNUP} className="btn btn-primary">
                  Connect with sales
                </Link>
                <Link
                  href="/tools/wallet-churn-rate"
                  className="btn btn-ghost inline-flex items-center gap-1.5"
                >
                  Size up churn cost
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Why OnchainSuite */}
      <section className="py-14">
        <div className="wrap-fit">
          <Reveal>
            <h2 className="max-w-2xl text-[24px] font-semibold tracking-tight t-ink sm:text-[28px]">
              Why teams pick OnchainSuite over {name}
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed t-muted">
              {data.whyBody}
            </p>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {WHY_CARDS.map((c) => (
              <Reveal key={c.title}>
                <div className="card h-full p-5">
                  <div className="text-[15px] font-semibold t-ink">
                    {c.title}
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                    {c.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Feature table */}
      <section className="py-14">
        <div className="wrap-fit">
          <Heading
            eyebrow="Feature by feature"
            title={
              <>
                OnchainSuite vs <span className="grad">{name}</span>, line by
                line
              </>
            }
          />
          <Reveal className="mt-10">
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[14px]">
                <thead>
                  <tr>
                    <th className="mono px-5 py-3.5 text-left text-[10.5px] uppercase tracking-[0.12em] t-muted2">
                      Capability
                    </th>
                    <th
                      className="px-5 py-3.5 text-left text-[13px] font-semibold"
                      style={{ color: "var(--acc)" }}
                    >
                      OnchainSuite
                    </th>
                    <th className="px-5 py-3.5 text-left text-[13px] font-semibold t-ink">
                      {name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITIES.map((row, i) => (
                    <tr
                      key={row.label}
                      className="border-t"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <td className="px-5 py-3 t-ink2">{row.label}</td>
                      <td
                        className="px-5 py-3"
                        style={{
                          background:
                            "color-mix(in oklab, var(--acc) 4%, transparent)",
                        }}
                      >
                        <Cell value={row.ocs} strong />
                      </td>
                      <td className="px-5 py-3">
                        <Cell value={data.comp[i] ?? "—"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Where competitor is strong + when it's the better call */}
      <section className="py-14">
        <div className="wrap-fit grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="card h-full p-6">
              <div className="mono mb-4 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                Where {name} is strong
              </div>
              <ul className="space-y-3">
                {data.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <CheckIcon
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "var(--acc)" }}
                      aria-hidden="true"
                    />
                    <span className="text-[14px] t-muted">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <div className="grid gap-8">
            <Reveal>
              <div>
                <div className="mono mb-2 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                  When {name} is the better call
                </div>
                <p className="text-[15.5px] leading-relaxed t-ink2">
                  {data.betterCall}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div>
                <div className="mono mb-2 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                  Running both
                </div>
                <p className="text-[15.5px] leading-relaxed t-ink2">
                  {data.runningBoth}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Switching over */}
      <section className="py-14">
        <div className="wrap-fit">
          <Heading eyebrow="Switching over" title="Live in an afternoon" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {SWITCH_STEPS.map((step) => (
              <Reveal key={step.n}>
                <div className="card h-full p-6">
                  <div
                    className="mono text-[13px] font-semibold"
                    style={{ color: "var(--acc)" }}
                  >
                    {step.n}
                  </div>
                  <div className="mt-2 text-[16px] font-semibold t-ink">
                    {step.title}
                  </div>
                  <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Link href={SIGNUP} className="btn btn-primary">
              Connect with sales
            </Link>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default ComparePage;
