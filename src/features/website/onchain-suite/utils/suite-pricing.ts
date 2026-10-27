/* Suite plan pricing, for the pricing page of a client strategy.

   The same curve as the live /pricing page (components/site/site-bundle.jsx,
   CURVE, MULT, levelFor, suitePrice, seatsIncluded, allowances, ONRAMP) and the
   Finance SSOT: price = level multiplier x ($16 + $13.30 per 1,000 contacts).
   The bundle is generated and exports nothing, so the numbers are repeated
   here. Change both together; suite-pricing.test.ts pins the reference prices
   the pricing page shows (Launch from $39, Growth from $349). */

export type SuiteLevel = "launch" | "growth" | "pro";

const CURVE = { base: 16, per1k: 13.3 };
const MULT: Record<SuiteLevel, number> = { launch: 0.79, growth: 1, pro: 1.6 };

export const EXTRA_SEAT_USD = 10;
export const ONRAMP = { usdPerMonth: 500, months: 3, hours: 20 };

export const LEVEL_NAME: Record<SuiteLevel, string> = {
  launch: "Launch",
  growth: "Growth",
  pro: "Enterprise",
};

export const LEVEL_BAND: Record<SuiteLevel, string> = {
  launch: "2,500 to 24,999 contacts",
  growth: "25,000 to 74,999 contacts",
  pro: "75,000 contacts and up",
};

export function levelFor(contacts: number): SuiteLevel {
  if (contacts >= 75_000) return "pro";
  if (contacts >= 25_000) return "growth";
  return "launch";
}

/** Monthly Suite price in USD for a contact count, rounded as the site does. */
export function suitePrice(contacts: number): number {
  return Math.round(
    MULT[levelFor(contacts)] * (CURVE.base + (CURVE.per1k * contacts) / 1000)
  );
}

export function seatsIncluded(contacts: number): number {
  if (contacts >= 75_000) return 7;
  if (contacts >= 50_000) return 5;
  if (contacts >= 25_000) return 4;
  if (contacts >= 10_000) return 3;
  return 2;
}

export interface Allowances {
  credits: number;
  listChecks: number;
  emails: number;
  inApp: number;
  seats: number;
}

export function allowances(contacts: number): Allowances {
  return {
    credits: contacts * 4,
    listChecks: contacts,
    emails: Math.max(50_000, contacts * 10),
    inApp:
      levelFor(contacts) === "pro"
        ? Math.round((contacts * 40) / 3)
        : contacts * 10,
    seats: seatsIncluded(contacts),
  };
}

/** Onramp is not offered on Launch, optional on Growth, included on Enterprise. */
export function onrampFor(level: SuiteLevel): "none" | "optional" | "included" {
  if (level === "launch") return "none";
  return level === "growth" ? "optional" : "included";
}

export const fmt = (n: number) => n.toLocaleString("en-US");
export const usd = (n: number) => `$${fmt(n)}`;
