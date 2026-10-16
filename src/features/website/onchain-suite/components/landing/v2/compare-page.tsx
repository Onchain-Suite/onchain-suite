"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";

import "./landing-v2.css";
import { BrandLogo } from "./brand-logo";
import {
  CAPABILITIES,
  COMPARE_BRAND,
  COMPARE_CTA,
  COMPARE_LOGOS,
  type Comparison,
  COMPARISON_FAQS,
  COMPARISON_SLUGS,
  COMPARISONS,
  SWITCH_STEPS,
  WHY_CARDS,
} from "./compare-data";
import { Reveal } from "./primitives";
import { Heading, PageShell, SIGNUP } from "./shared";

/** Light (reversed) OnchainSuite wordmark, for the dark card panel. */
const ONCHAIN_LIGHT_LOGO =
  "https://res.cloudinary.com/dwnkqkx8q/image/upload/v1761095267/full_logo_horizontal_coloured_light_kl0irx.png";

// Per-brand logo box (height in px, width as a % of the panel). Some assets have
// heavy internal whitespace or are landscape/icon shaped, so they need a bigger
// box to read at a comparable size in the "More comparisons" cards.
const LOGO_BOX: Record<string, { h: number; w: string }> = {
  "customer-io": { h: 52, w: "94%" },
  emailoctopus: { h: 52, w: "98%" },
  addressable: { h: 56, w: "74%" },
  galxe: { h: 48, w: "64%" },
  dotdigital: { h: 46, w: "90%" },
  sendgrid: { h: 46, w: "88%" },
};
const DEFAULT_LOGO_BOX = { h: 40, w: "84%" };

const monogram = (name: string) =>
  name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();

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
  const faqs = COMPARISON_FAQS[data.slug] ?? [];
  const others = COMPARISON_SLUGS.filter((slug) => slug !== data.slug).map(
    (slug) => COMPARISONS[slug]
  );
  return (
    <PageShell>
      {/* Hero */}
      <section className="pt-16 pb-8 sm:pt-24">
        <div className="wrap-compare">
          <div className="max-w-3xl">
            <Reveal>
              <span className="eyebrow">{data.eyebrow}</span>
            </Reveal>
            <Reveal delay={0.04} className="mt-5">
              <BrandLogo slug={data.slug} name={name} height={34} maxW={180} />
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
        <div className="wrap-compare">
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
        <div className="wrap-compare">
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
        <div className="wrap-compare grid gap-8 lg:grid-cols-2">
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
        <div className="wrap-compare">
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
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 ? (
        <section className="py-14">
          <div className="wrap-compare">
            <Heading
              eyebrow="FAQ"
              title={
                <>
                  OnchainSuite vs {name}, <span className="grad">answered</span>
                </>
              }
            />
            <div
              className="mt-10 divide-y divide-border overflow-hidden rounded-2xl border"
              style={{ borderColor: "var(--line)" }}
            >
              {faqs.map((f) => (
                <details key={f.q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-medium t-ink">
                    {f.q}
                    <ChevronDownIcon
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-4 text-[14px] leading-relaxed t-muted">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* More comparisons - a wider container than the reading column so the
          split-panel logos render at a comfortable size. */}
      <section className="py-14">
        <div className="wrap-fit">
          <Heading
            eyebrow="More comparisons"
            title="Compare OnchainSuite to more tools"
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((c) => {
              const brand = COMPARE_BRAND[c.slug] ?? "var(--acc)";
              const box = LOGO_BOX[c.slug] ?? DEFAULT_LOGO_BOX;
              return (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="card group block p-5 transition-colors hover:border-[color:var(--acc)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug t-ink">
                      OnchainSuite vs {c.name}
                    </span>
                    <span className="w-[36%] shrink-0 pt-0.5 text-right text-[11px] leading-snug t-muted2">
                      {c.eyebrow.replace(/^Compare · /, "")}
                    </span>
                  </div>
                  <div
                    className="mt-4 grid grid-cols-2 overflow-hidden rounded-xl border"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <div
                      className="flex h-[132px] items-center justify-center px-4"
                      style={{ background: "#0b1533" }}
                    >
                      <Image
                        src={ONCHAIN_LIGHT_LOGO}
                        alt="OnchainSuite"
                        width={240}
                        height={44}
                        className="h-11 w-auto max-w-full object-contain"
                      />
                    </div>
                    <div
                      className="flex h-[132px] items-center justify-center px-4"
                      style={{
                        background: `color-mix(in oklab, ${brand} 8%, var(--surface))`,
                      }}
                    >
                      {COMPARE_LOGOS[c.slug] ? (
                        <span
                          className="relative block"
                          style={{ height: box.h, width: box.w }}
                        >
                          <Image
                            src={COMPARE_LOGOS[c.slug]}
                            alt={`${c.name} logo`}
                            fill
                            sizes="200px"
                            className="object-contain"
                          />
                        </span>
                      ) : (
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[16px] font-bold text-white"
                          style={{ background: brand }}
                          aria-hidden="true"
                        >
                          {monogram(c.name)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-16">
        <div className="wrap-compare">
          <Reveal>
            <div className="card p-8 text-center sm:p-12">
              <h2 className="mx-auto max-w-xl text-[26px] font-semibold leading-tight tracking-tight t-ink sm:text-[30px]">
                {COMPARE_CTA.title}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed t-muted">
                {COMPARE_CTA.body}
              </p>
              <div className="mt-6">
                <Link href={SIGNUP} className="btn btn-primary">
                  Connect with sales
                </Link>
              </div>
              <p className="mono mt-4 text-[12px] t-muted2">
                {COMPARE_CTA.note}
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export default ComparePage;
