import Link from "next/link";

import { ABOUT_FAQ } from "@/onchain-suite-website/data/about-faq";
import {
  ABOUT_UPDATED,
  CHAINS,
  CHANNELS,
  COMPANY,
  DEVELOPERS,
  FOUNDERS,
  NAME,
  OFFICIAL_ACCOUNTS,
  ONE_LINER,
  PLANS,
  SITE_URL,
  TOP_TIER,
} from "@/onchain-suite-website/data/brand-facts";

const PAGE_URL = `${SITE_URL}/about`;

const FACTS: ReadonlyArray<[label: string, value: string]> = [
  ["Company", NAME.legal],
  ["Registered", `${COMPANY.jurisdiction}, ${COMPANY.number}`],
  ["Based", COMPANY.based],
  ["Incorporated", COMPANY.incorporated],
];

const UPDATED_LABEL = new Date(`${ABOUT_UPDATED}T00:00:00Z`).toLocaleDateString(
  "en-GB",
  { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
);

// AboutPage with a dateModified that matches the visible "Updated" line, and
// the FAQPage for the questions shown at the foot of the page.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "About OnchainSuite",
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

/**
 * /about: the single page of company facts that AI tools and search engines
 * can quote. Server-rendered and static; every fact comes from
 * data/brand-facts.ts, the same source as /llms.txt and the JSON-LD.
 */
export function AboutBody() {
  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <section className="phero">
        <h1 className="h1">About OnchainSuite</h1>
        <p className="sub">{ONE_LINER}</p>
        <p className="about-updated">Updated {UPDATED_LABEL}</p>
      </section>

      <section className="facts" aria-label="Company facts">
        {FACTS.map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </section>

      <div className="about-body">
        <section>
          <h2>What OnchainSuite does</h2>
          <p>
            Channels today: {CHANNELS.live} {CHANNELS.upcoming}
          </p>
          <p>Chains: {CHAINS}</p>
          <p>Developers: {DEVELOPERS}</p>
        </section>

        <section>
          <h2>Plans and prices</h2>
          <p>
            {PLANS.suite.name} plan, for {PLANS.suite.for}:{" "}
            {PLANS.suite.summary}
          </p>
          <p>
            {PLANS.send.name} plan, for {PLANS.send.for}: {PLANS.send.summary}
          </p>
          <p>
            Above 75,000 contacts: {TOP_TIER} {PLANS.freePlan}{" "}
            <Link href="/pricing">See pricing</Link>.
          </p>
        </section>

        <section>
          <h2>Founders</h2>
          <ul>
            {FOUNDERS.map((f) => (
              <li key={f.name}>
                {f.name}, {f.role}
              </li>
            ))}
          </ul>
          <p>
            <Link href="/team">Meet the team</Link>.
          </p>
        </section>

        <section>
          <h2>How to refer to us</h2>
          <p>{NAME.howToWrite}</p>
          <p>
            Link to {SITE_URL}. For prices, link to {SITE_URL}/pricing.
          </p>
        </section>

        <section>
          <h2>Official accounts</h2>
          <ul>
            {OFFICIAL_ACCOUNTS.map((a) => (
              <li key={a.url}>
                <a href={a.url} rel="me">
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

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
    </div>
  );
}
