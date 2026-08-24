"use client";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { Heading, PageShell, PartnerLogos } from "./shared";

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
          <Heading
            eyebrow="Team"
            title={
              <>
                The people building <span className="grad">OnchainSuite.</span>
              </>
            }
            sub="A small team of blockchain data and growth people building the retention layer Web3 never had, so protocols can keep the users they work so hard to win."
          />

          <div className="mono mb-6 mt-16 text-[11px] uppercase tracking-[0.16em] t-muted2">
            Founders
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FOUNDERS.map((f) => (
              <Reveal key={f.name}>
                <div className="card h-full p-6">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-[15px] font-semibold text-white"
                    style={{ background: "var(--acc)" }}
                    aria-hidden="true"
                  >
                    {f.initials}
                  </div>
                  <div className="mt-4 text-[17px] font-semibold t-ink">
                    {f.name}
                  </div>
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: "var(--acc)" }}
                  >
                    {f.role}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed t-muted">
                    {f.bio}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-20 text-center">
            <p className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
              Trusted by teams building on-chain
            </p>
            <div className="mt-6">
              <PartnerLogos />
            </div>
          </Reveal>

          <div
            className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border md:grid-cols-4"
            style={{ borderColor: "var(--line)", background: "var(--line)" }}
          >
            {FACTS.map(([k, v]) => (
              <div
                key={k}
                className="bg-[color:var(--surface)] px-5 py-5"
                style={{ background: "var(--surface, #fff)" }}
              >
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
