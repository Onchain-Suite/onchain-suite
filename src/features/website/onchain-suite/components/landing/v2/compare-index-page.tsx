"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import "./landing-v2.css";
import { BrandLogo } from "./brand-logo";
import {
  AT_A_GLANCE,
  COMPARE_CARDS,
  COMPARE_FILTERS,
  COMPARE_INDEX,
  COMPARE_INDEX_CTA,
} from "./compare-data";
import { Reveal } from "./primitives";
import { PageShell, SIGNUP } from "./shared";

export function CompareIndexPage() {
  const [filter, setFilter] = useState<string>("All");

  const cards = useMemo(
    () =>
      filter === "All"
        ? COMPARE_CARDS
        : COMPARE_CARDS.filter((c) => c.group === filter),
    [filter]
  );

  return (
    <PageShell>
      <section className="py-16 sm:py-24">
        <div className="wrap-fit">
          {/* Hero */}
          <Reveal>
            <span className="eyebrow">{COMPARE_INDEX.eyebrow}</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="mt-5 max-w-3xl font-semibold tracking-tight t-ink"
              style={{
                fontSize: "clamp(2.1rem, 5vw, 3.5rem)",
                lineHeight: 1.05,
              }}
            >
              {COMPARE_INDEX.title}
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed t-muted">
              {COMPARE_INDEX.sub}
            </p>
          </Reveal>

          {/* Meta row */}
          <div className="mono mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.12em] t-muted2">
            {COMPARE_INDEX.meta.map((x, i) => (
              <Fragment key={x}>
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                <span>{x}</span>
              </Fragment>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="mt-8 flex flex-wrap gap-2">
            {COMPARE_FILTERS.map((f) => {
              const active = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={active}
                  className="rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors"
                  style={{
                    background: active ? "var(--ink)" : "var(--surface)",
                    color: active ? "#fff" : "var(--muted)",
                    borderColor: active ? "var(--ink)" : "var(--line)",
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Cards */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Reveal key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="card group flex h-full flex-col p-6 transition-colors hover:border-[color:var(--acc)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <BrandLogo
                      slug={c.slug}
                      name={c.name}
                      height={26}
                      maxW={128}
                    />
                    <span
                      className="shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-medium t-muted"
                      style={{ borderColor: "var(--line)" }}
                    >
                      {c.badge}
                    </span>
                  </div>
                  <div className="mono mt-4 text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                    {c.category}
                  </div>
                  <div className="mt-2 text-[18px] font-semibold t-ink">
                    OnchainSuite vs {c.name}
                  </div>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed t-muted">
                    {c.blurb}
                  </p>
                  <span
                    className="mono mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em]"
                    style={{ color: "var(--acc)" }}
                  >
                    Read the comparison
                    <ArrowRightIcon
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* At a glance */}
          <div className="mt-20">
            <Reveal>
              <h2 className="text-[24px] font-semibold tracking-tight t-ink sm:text-[28px]">
                {AT_A_GLANCE.title}
              </h2>
              <p className="mt-2 text-[15px] t-muted">{AT_A_GLANCE.sub}</p>
            </Reveal>
            <Reveal className="mt-6">
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-[13.5px]">
                  <thead>
                    <tr className="mono text-left text-[10.5px] uppercase tracking-[0.12em] t-muted2">
                      {AT_A_GLANCE.cols.map((col) => (
                        <th key={col} className="px-5 py-3.5 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {AT_A_GLANCE.rows.map((row, ri) => {
                      const highlight = ri === 0;
                      return (
                        <tr
                          key={row[0]}
                          className="border-t"
                          style={{
                            borderColor: "var(--line)",
                            background: highlight
                              ? "var(--acc-soft)"
                              : "transparent",
                          }}
                        >
                          {row.map((cell, ci) => (
                            <td
                              key={AT_A_GLANCE.cols[ci]}
                              className={`px-5 py-3.5 ${
                                ci === 0
                                  ? "font-semibold t-ink"
                                  : highlight
                                    ? "font-medium t-ink"
                                    : "t-muted"
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Reveal>
            <p className="mt-4 text-[12.5px] leading-relaxed t-muted2">
              {AT_A_GLANCE.note}
            </p>
          </div>

          {/* CTA */}
          <Reveal className="mt-8">
            <div className="card flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h3 className="text-[20px] font-semibold t-ink">
                  {COMPARE_INDEX_CTA.title}
                </h3>
                <p className="mt-2 max-w-lg text-[14px] leading-relaxed t-muted">
                  {COMPARE_INDEX_CTA.body}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <Link href={SIGNUP} className="btn btn-primary">
                  Book a walkthrough
                </Link>
                <Link href="/tools" className="btn btn-ghost">
                  Try a calculator
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default CompareIndexPage;
