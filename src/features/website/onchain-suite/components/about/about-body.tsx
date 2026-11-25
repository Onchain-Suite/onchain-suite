import Link from "next/link";

import { LogoRow } from "@/onchain-suite-website/components/site/site-bundle";
import {
  ABOUT_CTA,
  ABOUT_DASHBOARD,
  ABOUT_HERO,
  ABOUT_MISSION,
  ABOUT_USER,
  CUSTOMERS_HEADING,
  JOURNEY,
  JOURNEY_HEADING,
  PLATFORM,
  PLATFORM_HEADING,
} from "@/onchain-suite-website/data/about-copy";
import { ABOUT_FAQ } from "@/onchain-suite-website/data/about-faq";
import {
  ABOUT_UPDATED,
  COMPANY,
  NAME,
  OFFICIAL_ACCOUNTS,
  SITE_URL,
} from "@/onchain-suite-website/data/brand-facts";

const PAGE_URL = `${SITE_URL}/about`;

const COMPANY_LINE = `Founded in ${COMPANY.founded}. ${NAME.legal} was incorporated in 2026, is registered in ${COMPANY.jurisdiction} (company number ${COMPANY.number}) and is headquartered in ${COMPANY.based}.`;

// AboutPage, plus the FAQPage for the three questions shown on the page.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "About OnchainSuite",
      description: ABOUT_HERO.sub,
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
 * /about, built from the copy Olusegun approved on 25 Nov 2026
 * (data/about-copy.ts). Server-rendered; the only client piece is the shared
 * customer LogoRow from the site bundle.
 */
export function AboutBody() {
  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="phero ab-hero">
        <h1 className="h1 load" style={{ animationDelay: ".08s" }}>
          {ABOUT_HERO.title}
        </h1>
        <p className="sub load" style={{ animationDelay: ".16s" }}>
          {ABOUT_HERO.sub}
        </p>
        <div
          className="mf-split ab-split load"
          style={{ animationDelay: ".24s" }}
        >
          <div className="mf-dash">
            <p className="mf-cap">What the dashboard says</p>
            {ABOUT_DASHBOARD.map((d) => (
              <div key={d.k} className="mf-kpi">
                <span>{d.k}</span>
                <b>{d.v}</b>
              </div>
            ))}
          </div>
          <div className="mf-josh">
            <p className="mf-cap">What your customer actually did</p>
            <ol>
              {ABOUT_USER.map((u) => (
                <li key={u.t} className={u.tone ?? ""}>
                  <b>{u.t}</b>
                  <span>{u.where}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="ab-sec" aria-labelledby="ab-journey-h">
        <p className="ab-kicker rv">Our journey</p>
        <h2 className="h2 rv" id="ab-journey-h">
          {JOURNEY_HEADING}
        </h2>
        <ol className="ab-journey">
          {JOURNEY.map((j) => (
            <li key={j.year} className="rv">
              <i>{j.year}</i>
              <div>
                <h3>{j.title}</h3>
                <p>{j.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <LogoRow label={CUSTOMERS_HEADING} />

      <section className="ab-sec" aria-labelledby="ab-mission-h">
        <p className="ab-kicker rv">Our mission</p>
        <h2 className="ab-big rv" id="ab-mission-h">
          {ABOUT_MISSION.heading}
        </h2>
        <p className="ab-p rv">{ABOUT_MISSION.body}</p>
      </section>

      <section className="ab-sec" aria-labelledby="ab-platform-h">
        <p className="ab-kicker rv">The platform</p>
        <h2 className="h2 rv" id="ab-platform-h">
          {PLATFORM_HEADING}
        </h2>
        <ol className="steps3n ab-platform">
          {PLATFORM.map((p, i) => (
            <li key={p.title} className="rv">
              <i>{String(i + 1).padStart(2, "0")}</i>
              <b>{p.title}</b>
              <span>{p.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="ab-sec ab-cta" aria-labelledby="ab-cta-h">
        <h2 className="ab-big rv" id="ab-cta-h">
          {ABOUT_CTA.heading}
        </h2>
        <div className="ctas rv">
          <a className="btn solid lg" href={ABOUT_CTA.primary.href}>
            {ABOUT_CTA.primary.label}
          </a>
          <Link className="btn lg" href={ABOUT_CTA.secondary.href}>
            {ABOUT_CTA.secondary.label}
          </Link>
        </div>
      </section>

      <p className="ab-company">{COMPANY_LINE}</p>

      <section className="faq" id="faq" aria-labelledby="about-faq-h">
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

      <div className="ab-small">
        <p>{NAME.howToWrite}</p>
        <p>
          {OFFICIAL_ACCOUNTS.map((a, i) => (
            <span key={a.url}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <a href={a.url} rel="me">
                {a.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
