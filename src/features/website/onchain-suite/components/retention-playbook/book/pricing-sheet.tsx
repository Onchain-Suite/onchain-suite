import Link from "next/link";

import type { StrategyPricing } from "@/onchain-suite-website/data/clients";
import {
  allowances,
  EXTRA_SEAT_USD,
  fmt,
  LEVEL_BAND,
  LEVEL_NAME,
  levelFor,
  ONRAMP,
  onrampFor,
  suitePrice,
  usd,
} from "@/onchain-suite-website/utils/suite-pricing";

/** What every Suite level includes, in the words of the /pricing page. */
const INCLUDED = [
  "One record per customer across your app and your contracts",
  "Lifecycle stages and health scores",
  "Segments, campaigns and Loops by email and in-app, each with a holdout",
  "Intelligence MCP, SDK, REST API and webhooks",
];

function Option({
  contacts,
  label,
  onrampFree,
}: {
  contacts: number;
  label?: string;
  onrampFree?: boolean;
}) {
  const level = levelFor(contacts);
  const a = allowances(contacts);
  const onramp = onrampFree ? "free" : onrampFor(level);
  return (
    <div className="rp-bk-plan">
      {label && <p className="rp-bk-plan-k">{label}</p>}
      <p className="rp-bk-plan-name">
        {LEVEL_NAME[level]}
        <span>{fmt(contacts)} contacts</span>
      </p>
      <p className="rp-bk-plan-price">
        {level === "pro" ? "Custom" : usd(suitePrice(contacts))}
        {level !== "pro" && <span> a month</span>}
      </p>
      <p className="rp-bk-plan-band">{LEVEL_BAND[level]}</p>
      <dl className="rp-bk-plan-dl">
        <div>
          <dt>Emails a month</dt>
          <dd>{fmt(a.emails)}</dd>
        </div>
        <div>
          <dt>In-app messages</dt>
          <dd>{fmt(a.inApp)}</dd>
        </div>
        <div>
          <dt>Wallet-data credits</dt>
          <dd>{fmt(a.credits)}</dd>
        </div>
        <div>
          <dt>Team seats</dt>
          <dd>{a.seats}</dd>
        </div>
      </dl>
      <p className="rp-bk-plan-onramp">
        {onramp === "none" && "Set up yourself, with a walkthrough call."}
        {onramp === "optional" &&
          `Onramp with our team: ${usd(ONRAMP.usdPerMonth)} a month for ${ONRAMP.months} months.`}
        {onramp === "included" && "Onramp and migration included."}
        {onramp === "free" && "Onramp with our team, free as partners."}
      </p>
    </div>
  );
}

/** The book's pricing page: the client's Suite plans, priced from their contacts. */
export function PricingSheet({ pricing }: { pricing: StrategyPricing }) {
  return (
    <div className="rp-bk-pricing">
      <div className="rp-bk-plans">
        {pricing.options.map((o) => (
          <Option
            key={o.contacts}
            contacts={o.contacts}
            label={o.label}
            onrampFree={pricing.onrampFree}
          />
        ))}
      </div>
      {pricing.note && <p className="rp-bk-note">{pricing.note}</p>}
      <p className="rp-bk-k">Every level includes</p>
      <ul className="rp-bk-incl">
        {INCLUDED.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="rp-bk-fine">
        Billed monthly. Extra seats are {usd(EXTRA_SEAT_USD)} a month each, and
        use beyond the allowance is from $1 per 1,000. Full details on{" "}
        <Link href="/pricing">the pricing page</Link>.
      </p>
    </div>
  );
}
