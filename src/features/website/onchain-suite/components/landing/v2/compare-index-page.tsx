"use client";

import { ArrowRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import "./landing-v2.css";
import { COMPARISON_SLUGS, COMPARISONS } from "./compare-data";
import { Reveal } from "./primitives";
import { Heading, PageShell } from "./shared";

export function CompareIndexPage() {
  return (
    <PageShell>
      <section className="py-20 sm:py-28">
        <div className="wrap">
          <Heading
            eyebrow="Compare"
            title={
              <>
                OnchainSuite vs <span className="grad">the rest</span>
              </>
            }
            sub="How OnchainSuite stacks up against the messaging, analytics and growth tools Web3 teams evaluate. Every comparison is drawn from public product docs."
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COMPARISON_SLUGS.map((slug) => {
              const c = COMPARISONS[slug];
              return (
                <Reveal key={slug}>
                  <Link
                    href={`/compare/${slug}`}
                    className="card group flex h-full flex-col p-6 transition-colors hover:border-[color:var(--acc)]"
                  >
                    <div className="mono text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                      {c.eyebrow.replace(/^Compare · /, "")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold t-ink">
                      OnchainSuite vs {c.name}
                    </div>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13.5px] leading-relaxed t-muted">
                      {c.intro}
                    </p>
                    <span
                      className="mono mt-4 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em]"
                      style={{ color: "var(--acc)" }}
                    >
                      See comparison
                      <ArrowRightIcon
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default CompareIndexPage;
