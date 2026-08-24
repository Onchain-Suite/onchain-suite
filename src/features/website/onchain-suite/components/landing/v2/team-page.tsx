"use client";

import Image from "next/image";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell, PARTNERS } from "./shared";

const FOUNDERS = [
  {
    initials: "OA",
    name: "Olusegun Aborode",
    role: "Co-founder & CEO",
    bio: "Leads product and company direction. Blockchain data engineer by background, focused on turning on-chain behaviour into something teams can act on.",
  },
  {
    initials: "JB",
    name: "Joshua Obafemi",
    role: "Co-founder & CTO",
    bio: "Leads engineering and the platform. Builds the indexing, identity and delivery layer that makes on-chain activity messageable.",
  },
  {
    initials: "JE",
    name: "Joel Obafemi",
    role: "Co-founder & Head of Analytics",
    bio: "Leads analytics and go-to-market. Turns wallet data into the segments and benchmarks that drive retention.",
  },
];

const FACTS: [string, string][] = [
  ["Company", "OnchainSuite Ltd"],
  ["Registered", "England & Wales · 17370357"],
  ["Based", "Birmingham, United Kingdom"],
  ["Stage", "Early access"],
];

export function TeamPage() {
  return (
    <PageShell>
      <section className="py-20 sm:py-28">
        <div className="wrap-fit">
          {/* Left-aligned hero, matching the demo /team layout. */}
          <Reveal>
            <span className="eyebrow">Team</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="mt-5 max-w-3xl font-semibold tracking-tight t-ink"
              style={{
                fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
                lineHeight: 1.05,
              }}
            >
              The people building <span className="grad">OnchainSuite.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-2xl text-[17px] leading-relaxed t-muted">
              A small team of blockchain data and growth people building the
              retention layer Web3 never had, so protocols can keep the users
              they work so hard to win.
            </p>
          </Reveal>

          <div className="mono mb-6 mt-16 text-[11px] uppercase tracking-[0.16em] t-muted2">
            Founders
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FOUNDERS.map((f) => (
              <Reveal key={f.name}>
                <div className="card h-full p-7 sm:p-8">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full text-[17px] font-bold"
                    style={{
                      background: "var(--acc-soft)",
                      color: "var(--acc)",
                    }}
                    aria-hidden="true"
                  >
                    {f.initials}
                  </div>
                  <div className="mt-5 text-[20px] font-semibold t-ink">
                    {f.name}
                  </div>
                  {/* <div className="mono mt-1 text-[12.5px] t-acc">{f.role}</div> */}
                  <p className="mt-4 text-[15px] leading-relaxed t-muted">
                    {f.bio}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Trusted-by: logo tile + name, left-aligned, like the demo. */}
          <div className="mono mb-6 mt-20 text-[11px] uppercase tracking-[0.16em] t-muted2">
            Trusted by teams building on-chain
          </div>
          <Reveal className="flex flex-wrap items-center gap-x-9 gap-y-5">
            {PARTNERS.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <div
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--line)" }}
                >
                  <Image
                    src={p.src}
                    alt={p.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <span className="text-[14.5px] font-medium t-ink2">
                  {p.name}
                </span>
              </div>
            ))}
          </Reveal>

          {/* Company facts: plain columns under a hairline, not a boxed grid. */}
          <div
            className="mt-16 grid grid-cols-2 gap-x-8 gap-y-8 border-t pt-10 sm:grid-cols-4"
            style={{ borderColor: "var(--line)" }}
          >
            {FACTS.map(([k, v]) => (
              <div key={k}>
                <div className="mono text-[10.5px] uppercase tracking-[0.14em] t-muted2">
                  {k}
                </div>
                <div className="mt-1.5 text-[15px] font-medium t-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default TeamPage;
