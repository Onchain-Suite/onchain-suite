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
    d: "Brings social, product and blockchain data into one record per customer, whether they first arrived by email, an app account or a wallet.",
  },
  {
    k: "CNS + PNS",
    t: "Chain and Protocol Normalisation",
    d: "CNS turns raw chain data into consistent records on every supported chain. PNS reads those records as business actions: a deposit, a withdrawal, a membership.",
  },
  {
    k: "MCP + Loops",
    t: "Intelligence MCP and Loops",
    d: "Growth teams ask questions in plain English, approve the segments it suggests, and run campaigns and automated journeys by email and in-app without waiting on a developer.",
  },
];

const STORY: ReadonlyArray<{ y: string; t: string; d: string }> = [
  {
    y: "2022",
    t: "The problem, up close",
    d: "Leading growth at Rocket3, a blockchain marketing agency, across more than 14 client portfolios, Olusegun watched teams run retention by hand in tools that could not see the chain. Every campaign began with a developer's export.",
  },
  {
    y: "2024",
    t: "OnchainSuite begins",
    d: "Research and development started in 2024, and OnchainSuite itself in November, in the final month of Olusegun's MSc at Ulster University's Birmingham campus.",
  },
  {
    y: "2025",
    t: "Back to the drawing board",
    d: "A first soft launch told us the product was too complex. We rebuilt it around the growth and CRM people who use it every day, with early feedback from the founders of Superteam Birmingham.",
  },
  {
    y: "2026",
    t: "Paying clients, and a company",
    d: `Our first clients started paying in July, and ${NAME.legal} was incorporated in Birmingham on ${COMPANY.incorporated}. In October we joined Stripe's startup programme, and by November more than 100,000 messages had gone out through the platform.`,
  },
  {
    y: "Next",
    t: "From private beta to every blockchain company",
    d: "We are in private beta today. Next come a public beta, wider chain and protocol coverage, and a team built here in Birmingham.",
  },
];

// Paying clients that the site already shows in its logo row, described as
// the business plan describes them.
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
    d: "FIFA's Official Prediction Market Partner for the 2026 World Cup.",
  },
  {
    name: "TraderComps",
    logo: "/site/logos/tradercomps.svg",
    href: "https://tradercomps.com/",
    d: "Runs a calendar of exchange trading competitions from Abu Dhabi.",
  },
  {
    name: "Sovren",
    logo: "/site/logos/sovren.png",
    href: "https://www.sovrentech.io/",
    d: "A decentralised network that rewards verified work.",
  },
  {
    name: "Surgence Labs",
    logo: "/site/logos/surgence.jpg",
    href: "https://surgence.io/",
    d: "A blockchain marketing agency in Dubai and Australia, and our agency partner.",
  },
  {
    name: "Yauga",
    logo: "/site/logos/yauga-stamp.svg",
    href: "https://www.yauga.com/",
    d: "A blockchain wellness company, and one of our first clients.",
  },
  {
    name: "Rehitage Stays",
    logo: "/site/logos/rehitage.svg",
    href: "https://rehitagestays.co.uk/",
    d: "Serviced accommodation in South Wales, on our Send plan.",
  },
];

const FOUNDER_CREDITS: Record<string, ReadonlyArray<string>> = {
  "Olusegun Isaac Aborode": [
    "20+ public Dune dashboards, forked 40+ times",
    "Spoke on blockchain data analytics at a UK Parliament session, January 2026",
    "Lectured 150 postgraduates at the University of Birmingham",
    "Co-hosts Superteam Birmingham, 120+ blockchain founders",
  ],
  "Joshua Obafemi": [
    "Builds the web application, backend and servers",
    "Owns deployment, security and documentation",
  ],
  "Joel Obafemi": [
    "Data engineering, data quality and analytical methods",
    "Takes every client through onboarding",
  ],
};

const NEXT: ReadonlyArray<{ t: string; d: string }> = [
  {
    t: "Every chain and protocol, read the same way",
    d: "Wider CNS and PNS coverage, so a deposit means a deposit wherever it happens.",
  },
  {
    t: "Predictions you can act on",
    d: "Our machine learning data model, tested against today's rules before it scores a single customer.",
  },
  {
    t: "A team built in Birmingham",
    d: "Engineering, data and client success hires in the UK, serving blockchain companies worldwide.",
  },
];

const RECORD: ReadonlyArray<[label: string, value: string]> = [
  ["Company", NAME.legal],
  ["Registered", `${COMPANY.jurisdiction}, ${COMPANY.number}`],
  ["Based", COMPANY.based],
  ["Incorporated", COMPANY.incorporated],
];

const MISSION =
  "OnchainSuite is building the retention layer for every blockchain company: the software a growth or CRM team uses to see what each customer does in the product and on the chain, and to send the message that keeps them.";

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
 * /about: the company page. Mission, the problem, the engine, our story,
 * numbers, clients, founders and where we are going, then the company record
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
          Klaviyo, Braze and Customer.io gave mainstream companies a way to keep
          their customers. Blockchain companies never got one, because their
          customers live in two places at once: inside the app and on the chain.
          OnchainSuite reads both, and turns what it sees into the next message.
        </p>
      </section>

      <section className="ab-sec ab-problem" aria-labelledby="ab-prob-h">
        <p className="ab-kicker rv">The problem</p>
        <h2 className="ab-big rv" id="ab-prob-h">
          A customer deposits into a vault, withdraws five days later and never
          touches the contract again.{" "}
          <span>Most growth teams never see it happen.</span>
        </h2>
        <p className="ab-p rv">
          That story is written on the blockchain as strings of numbers, far
          from the CRM, the email tool and the social profiles. So growth teams
          report what they can measure, open rates, impressions, Discord numbers
          and total value locked, and every real campaign starts with a
          developer export and days of analyst work. We started OnchainSuite to
          end that.
        </p>
      </section>

      <section className="ab-sec" aria-labelledby="ab-eng-h">
        <p className="ab-kicker rv">What we are building</p>
        <h2 className="h2 rv" id="ab-eng-h">
          One engine that understands crypto customers.{" "}
          <span>
            Built so the person who knows the customers does the work.
          </span>
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
        <p className="ab-kicker rv">Our story</p>
        <h2 className="h2 rv" id="ab-story-h">
          Built by people who sent the campaigns.{" "}
          <span>Rebuilt when customers told us to.</span>
        </h2>
        <ol className="ab-story">
          {STORY.map((s) => (
            <li key={s.y} className="rv">
              <i>{s.y}</i>
              <div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ab-dark" aria-labelledby="ab-num-h">
        <h2 className="ab-dark-h rv" id="ab-num-h">
          Where we are today
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
        <p className="ab-kicker rv">Clients</p>
        <h2 className="h2 rv" id="ab-cl-h">
          Seven paying clients in four countries.{" "}
          <span>From the World Cup to South Wales.</span>
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
        <p className="ab-kicker rv">Founders</p>
        <h2 className="h2 rv" id="ab-team-h">
          Onchain data on one side, growth on the other.{" "}
          <span>The team that joins them.</span>
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
        <p className="ab-kicker rv">Where we are going</p>
        <h2 className="ab-big rv" id="ab-next-h">
          Every blockchain company with a live product should know who is
          drifting, and win them back.{" "}
          <span>That is the company we are building.</span>
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
