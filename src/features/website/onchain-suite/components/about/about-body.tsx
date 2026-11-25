import Link from "next/link";

import { CloseCta } from "@/onchain-suite-website/components/site/site-bundle";
import { ABOUT_FAQ } from "@/onchain-suite-website/data/about-faq";
import {
  ABOUT_STATS,
  ABOUT_UPDATED,
  COMPANY,
  FOUNDERS,
  NAME,
  OFFICIAL_ACCOUNTS,
  SITE_URL,
} from "@/onchain-suite-website/data/brand-facts";

const PAGE_URL = `${SITE_URL}/about`;

const ENGINE: ReadonlyArray<{ k: string; t: string; d: string }> = [
  {
    k: "LCIE",
    t: "Lifecycle Intelligence Engine",
    d: "One record per customer across email, app account and wallet.",
  },
  {
    k: "CNS + PNS",
    t: "Chain and Protocol Normalisation",
    d: "Raw chain data turned into business actions: deposits, withdrawals, memberships.",
  },
  {
    k: "MCP + Loops",
    t: "Intelligence MCP and Loops",
    d: "Questions in plain English. Campaigns and automated journeys by email and in-app.",
  },
];

const MILESTONES: ReadonlyArray<{ y: string; t: string; d: string }> = [
  {
    y: "2022",
    t: "Problem found",
    d: "Our founder leads growth for 14+ blockchain clients at Rocket3. Retention runs by hand.",
  },
  {
    y: "2024",
    t: "Founded",
    d: "Research and development begins. OnchainSuite starts in November.",
  },
  {
    y: "2025",
    t: "Rebuilt",
    d: "Soft launch, then a rebuild for simplicity based on user feedback.",
  },
  {
    y: "2026",
    t: "Commercial",
    d: `First paying clients in July. ${NAME.legal} incorporated on ${COMPANY.incorporated}. Stripe startup programme in October. 100,000+ messages sent by November.`,
  },
  {
    y: "Next",
    t: "Public beta",
    d: "Wider chain coverage and a UK team in Birmingham.",
  },
];

// Paying clients that the site already shows in its logo row.
const CLIENTS: ReadonlyArray<{
  name: string;
  logo: string;
  href: string;
  d: string;
}> = [
  {
    name: "ADI PredictStreet",
    logo: "/site/logos/predict-street.png",
    href: "https://adipredictstreet.com/",
    d: "FIFA's Official Prediction Market Partner, 2026 World Cup",
  },
  {
    name: "TraderComps",
    logo: "/site/logos/tradercomps.svg",
    href: "https://tradercomps.com/",
    d: "Exchange trading competitions, Abu Dhabi",
  },
  {
    name: "Sovren",
    logo: "/site/logos/sovren.png",
    href: "https://www.sovrentech.io/",
    d: "Decentralised network for verified work",
  },
  {
    name: "Surgence Labs",
    logo: "/site/logos/surgence.jpg",
    href: "https://surgence.io/",
    d: "Blockchain marketing agency and agency partner",
  },
  {
    name: "Yauga",
    logo: "/site/logos/yauga-stamp.svg",
    href: "https://www.yauga.com/",
    d: "Blockchain wellness",
  },
  {
    name: "Rehitage Stays",
    logo: "/site/logos/rehitage.svg",
    href: "https://rehitagestays.co.uk/",
    d: "Serviced accommodation, South Wales",
  },
];

const FOUNDER_CREDITS: Record<string, ReadonlyArray<string>> = {
  "Olusegun Isaac Aborode": [
    "Product, clients, commercial and finance",
    "20+ public Dune dashboards, forked 40+ times",
    "Speaker, UK Parliament session on blockchain data, 2026",
    "Co-host, Superteam Birmingham (120+ founders)",
  ],
  "Joshua Obafemi": [
    "Technical roadmap and architecture",
    "Web application, backend and infrastructure",
    "Deployment, security and documentation",
  ],
  "Joel Obafemi": [
    "Data engineering and data quality",
    "Analytical methodology",
    "Client onboarding",
  ],
};

const NEXT: ReadonlyArray<{ t: string; d: string }> = [
  { t: "More chains and protocols", d: "Wider CNS and PNS coverage." },
  {
    t: "Predictive scoring",
    d: "Our machine learning data model, released once testing supports it.",
  },
  {
    t: "A UK team",
    d: "Engineering, data and client success hires in Birmingham.",
  },
];

const RECORD: ReadonlyArray<[label: string, value: string]> = [
  ["Company", NAME.legal],
  ["Registered", `${COMPANY.jurisdiction}, ${COMPANY.number}`],
  ["Based", COMPANY.based],
  ["Incorporated", COMPANY.incorporated],
];

const MISSION =
  "OnchainSuite is retention and lifecycle software for blockchain companies. It reads what each customer does in the app and on-chain, and sends the message that brings them back.";

// AboutPage with a dateModified that matches the "Updated" line in the company
// record, and the FAQPage for the questions shown at the foot of the page.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "About OnchainSuite",
      description: MISSION,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      dateModified: ABOUT_UPDATED,
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: ABOUT_FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const UPDATED_LABEL = new Date(`${ABOUT_UPDATED}T00:00:00Z`).toLocaleDateString(
  "en-GB",
  { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
);

/**
 * /about: the company page. Mission, the problem, the platform, milestones,
 * numbers, clients, leadership and what comes next, then the company record
 * and the FAQ that AI tools quote. Company facts come from data/brand-facts.ts
 * (the same source as /llms.txt and the JSON-LD); the story and proof points
 * come from the OnchainSuite business plan, limited to what is public.
 */
export function AboutBody() {
  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="ab-hero">
        <p className="ab-eyebrow load">About OnchainSuite</p>
        <h1 className="load" style={{ animationDelay: ".08s" }}>
          The retention layer for every blockchain company.
        </h1>
        <p className="ab-lede load" style={{ animationDelay: ".16s" }}>
          {MISSION}
        </p>
      </section>

      <section className="ab-sec ab-problem" aria-labelledby="ab-prob-h">
        <h2 className="ab-big rv" id="ab-prob-h">
          Blockchain companies cannot see who is leaving.{" "}
          <span>
            Their customer data is split between the app and the chain, and
            tools like Klaviyo and Braze read neither.
          </span>
        </h2>
      </section>

      <section className="ab-sec" aria-labelledby="ab-eng-h">
        <h2 className="h2 rv" id="ab-eng-h">
          The platform
        </h2>
        <div className="ab-engine">
          {ENGINE.map((e) => (
            <article key={e.t} className="rv">
              <i>{e.k}</i>
              <h3>{e.t}</h3>
              <p>{e.d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ab-sec" aria-labelledby="ab-story-h">
        <h2 className="h2 rv" id="ab-story-h">
          Milestones
        </h2>
        <ol className="ab-story">
          {MILESTONES.map((m) => (
            <li key={m.y} className="rv">
              <i>{m.y}</i>
              <div>
                <h3>{m.t}</h3>
                <p>{m.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ab-dark" aria-labelledby="ab-num-h">
        <h2 className="ab-dark-h rv" id="ab-num-h">
          By the numbers
        </h2>
        <div className="ab-stats">
          {ABOUT_STATS.map((s) => (
            <div key={s.label} className="rv">
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ab-sec" aria-labelledby="ab-cl-h">
        <h2 className="h2 rv" id="ab-cl-h">
          Clients <span>7 paying, in 4 countries</span>
        </h2>
        <div className="ab-clients">
          {CLIENTS.map((c) => (
            <a
              key={c.name}
              className="rv"
              href={c.href}
              target="_blank"
              rel="noreferrer"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.logo}
                alt={`${c.name} logo`}
                width={40}
                height={40}
                loading="lazy"
              />
              <b>{c.name}</b>
              <span>{c.d}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="ab-sec" aria-labelledby="ab-team-h">
        <h2 className="h2 rv" id="ab-team-h">
          Leadership
        </h2>
        <div className="team ab-team">
          {FOUNDERS.map((f) => (
            <article key={f.name} className="person rv">
              <span
                className="ava"
                style={{
                  color: f.color,
                  background: `color-mix(in oklab, ${f.color} 10%, #fff)`,
                  borderColor: `color-mix(in oklab, ${f.color} 28%, #fff)`,
                }}
              >
                {f.initials}
              </span>
              <h3>{f.name}</h3>
              <p className="role">{f.role}</p>
              <ul className="ab-credits">
                {(FOUNDER_CREDITS[f.name] ?? []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="ab-more rv">
          <Link href="/team">
            Meet the team<span aria-hidden="true"> →</span>
          </Link>
        </p>
      </section>

      <section className="ab-sec ab-next" aria-labelledby="ab-next-h">
        <h2 className="h2 rv" id="ab-next-h">
          What comes next
        </h2>
        <ol className="steps3n ab-pillars">
          {NEXT.map((n, i) => (
            <li key={n.t} className="rv">
              <i>{String(i + 1).padStart(2, "0")}</i>
              <b>{n.t}</b>
              <span>{n.d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="ab-record" aria-labelledby="ab-rec-h">
        <h2 className="ab-rec-h" id="ab-rec-h">
          Company record
        </h2>
        <div className="facts">
          {RECORD.map(([k, v]) => (
            <div key={k} className="rv">
              <small>{k}</small>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <p className="ab-links">
          {OFFICIAL_ACCOUNTS.map((a, i) => (
            <span key={a.url}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <a href={a.url} rel="me">
                {a.label}
              </a>
            </span>
          ))}
          <span> · Updated {UPDATED_LABEL}</span>
        </p>
      </section>

      <section className="faq" aria-labelledby="about-faq-h">
        <div>
          <h2 className="h2" id="about-faq-h">
            Questions about OnchainSuite
          </h2>
        </div>
        <div className="faq-list">
          {ABOUT_FAQ.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CloseCta />
    </div>
  );
}
