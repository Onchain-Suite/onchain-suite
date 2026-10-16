/* OnchainSuite pricing catalog — single source of truth.
 *
 * Mirrors the business plan (version 13, 27 September 2026), which supersedes the v4 live
 * model of 5 Aug. Every price, allowance and rate here is authoritative; UI reads from this
 * file rather than hardcoding numbers, so a pricing change is one edit.
 *
 * Since the business plan (8 October 2026): Pro is retired. The top of the Suite is Enterprise,
 * priced by custom offer rather than a list price. The business plan and finance-ssot still
 * carry Pro at $1,622 until they are revised; Pro stays here as a retired plan so any workspace
 * on it keeps its meters. Enterprise's allowances are Pro's — the floor an offer starts from.
 *
 * What the business plan changed, and why it matters to the code:
 *  - Two product lines, not one ladder. Send is campaigns and automations without the
 *    blockchain-data features; Suite is Launch / Launch+ / Growth / Growth+ / Pro. The
 *    forecast assumes 75% Suite and 25% Send, so Send is a quarter of the business and had
 *    no representation in the product at all.
 *  - Launch+ and Growth+ exist so a company can buy contact capacity without jumping a
 *    capability level — Growth to Pro was a 4.6x price step with nothing in between.
 *  - Wallet-data credits follow one rule: FOUR per contact, on every package. The old table
 *    had Launch at 1,000 against 2,500 contacts, which is a tenth of what the rule gives.
 *  - Launch is $39, not $49. Pro is $1,622, not $799.
 *  - PAYG and Scale are retired. The plan sells Send as the entry point and does not offer a
 *    concierge tier; both keep their meters so existing workspaces are unaffected.
 *
 * AI and ONS+ allowances come from finance-ssot/lib/model.js, not the plan PDF: the SSOT was
 * revised on 26 Sep, two weeks after the PDF, and it is the model the forecast is built on.
 * ONS+ is one verification per contact. Pro's AI went 16,000 to 24,000 there — it was the one
 * step in the table that was not 1.5x once Growth+ existed.
 *
 * What v4 changed, and why it matters to the code:
 *  - Five tiers. Scale is new; Launch/Growth/Pro were all repriced.
 *  - Email and in-app push are SEPARATE allowances. v3 had one blended "messages" meter.
 *  - In-app push is bundled per tier. The $39/$149/$449 add-on SKU is gone.
 *  - Wallet-data credits are $10.00 per 10,000 against an Alchemy cost of $1.08 per 10,000.
 *    The retired $2.50 sat below GoldRush's $8.33 and lost money below a 71% cache hit.
 *  - ONS+ list protection and Concierge are new meters.
 *  - No annual discount. Monthly billing only, until there is churn data worth trading.
 *  - Stripe (3.325% + $0.25) replaces Blockradar (0.75%) — 4.4x dearer, now an explicit line.
 *  - Send multiplier moved from 1x contacts to 10x, so overage prices the exceptional
 *    rather than taxing ordinary sending.
 *
 * Enforced invariants:
 *  - There is NO free tier. PAYG is the entry point.
 *  - Legacy plans stay priced so existing meters keep working, but are non-selectable.
 *  - A plan is a DISCOUNT on list price; overage is not discounted. Every tier's allowances
 *    bought at list cost more than the plan, so exceeding an allowance genuinely costs more
 *    per unit (1.65x to 2.42x). v3 had this backwards; pricing.test.ts now asserts it.
 */

export type PlanId = 'send' | 'launch' | 'launch-plus' | 'growth' | 'growth-plus' | 'enterprise';
export type LegacyPlanId = 'free' | 'starter' | 'pro-plus' | 'payg' | 'scale' | 'pro';

export interface Allowances {
  /** Wallet contacts. */
  contacts: number;
  /** Emails per month. Separate from push since v4. */
  emails: number;
  /** In-app pushes per month. Bundled per tier since v4 — no longer an add-on. */
  push: number;
  aiCredits: number;
  /** On-chain (wallet-data) credits, sourced from Alchemy. */
  onchainCredits: number;
  /** ONS+ list-protection verifications. */
  onsPlus: number;
  seats: number;
  /** Dedicated sending IPs. Auto-provisioned above 100k sends/mo. */
  dedicatedIps?: number;
  /** Included concierge hours (retired Scale tier only). */
  conciergeHours?: number;
}

/* Every package includes four blockchain-data credits per contact — enough for one full
   monthly refresh when all contacts are wallets. The allowances below are derived from this
   rather than typed out, so the table cannot drift away from the rule again. */
export const CREDITS_PER_CONTACT = 4;
/** A full wallet enrichment. At $10 per 10,000 credits that is $0.004 a wallet. */
export const CREDITS_PER_ENRICHMENT = 4;

export interface Plan {
  id: PlanId | LegacyPlanId;
  name: string;
  /** null = usage-based (PAYG). */
  monthly: number | null;
  allowances: Allowances;
  selectable: boolean;
  legacy?: boolean;
  /** Priced and sized per customer: Enterprise now, Scale before it. */
  custom?: boolean;
  /** Send is priced per subscriber over a base, so `monthly` cannot be a single number. */
  send?: { base: number; per1k: number };
  blurb: string;
}

const suite = (contacts: number, emails: number, push: number, aiCredits: number, onsPlus: number, seats: number, dedicatedIps?: number): Allowances => ({
  contacts, emails, push, aiCredits, onsPlus, seats, dedicatedIps,
  onchainCredits: contacts * CREDITS_PER_CONTACT,
});

export const PLANS: Plan[] = [
  {
    id: 'send', name: 'Send', monthly: null, selectable: true,
    send: { base: 6, per1k: 3.95 },
    blurb: 'Campaigns and automations on email records and application activity. No blockchain data.',
    allowances: { contacts: 0, emails: 50_000, push: 25_000, aiCredits: 500, onchainCredits: 0, onsPlus: 250, seats: 2 },
  },
  {
    id: 'launch', name: 'Launch', monthly: 39, selectable: true,
    blurb: 'Suite at entry size. Both lanes, Loops and Intelligence on a small list.',
    allowances: suite(2_500, 50_000, 25_000, 500, 2_500, 2),
  },
  {
    id: 'launch-plus', name: 'Launch+', monthly: 118, selectable: true,
    blurb: 'Launch with four times the contacts: capacity without changing capability level.',
    allowances: suite(10_000, 100_000, 100_000, 2_000, 10_000, 3),
  },
  {
    id: 'growth', name: 'Growth', monthly: 349, selectable: true,
    blurb: 'Adds Forms and a dedicated IP, and takes the wallet channel to campaign size.',
    allowances: suite(25_000, 250_000, 250_000, 8_000, 25_000, 4, 1),
  },
  {
    id: 'growth-plus', name: 'Growth+', monthly: 681, selectable: true,
    blurb: 'Growth at double the contacts, for a list outgrowing it before it needs Enterprise.',
    allowances: suite(50_000, 500_000, 500_000, 16_000, 50_000, 5, 1),
  },
  {
    id: 'enterprise', name: 'Enterprise', monthly: null, selectable: true, custom: true,
    blurb: 'Everything in Growth, with contacts, volume and terms set for your list. Priced by offer.',
    // The floor an offer starts from (Pro's allowances); the agreed numbers are per customer.
    allowances: suite(75_000, 750_000, 1_000_000, 24_000, 75_000, 7, 1),
  },
  /* Retired — meters intact so existing workspaces keep working, not offered to new ones. */
  {
    id: 'pro', name: 'Pro', monthly: 1_622, selectable: false, legacy: true,
    blurb: 'Retired. Enterprise replaced it with a custom offer.',
    allowances: suite(75_000, 750_000, 1_000_000, 24_000, 75_000, 7, 1),
  },
  {
    id: 'payg', name: 'Pay as you go', monthly: null, selectable: false, legacy: true,
    blurb: 'Retired. Send is the entry point.',
    allowances: { contacts: 1_000, emails: 0, push: 0, aiCredits: 0, onchainCredits: 0, onsPlus: 0, seats: 2 },
  },
  {
    id: 'scale', name: 'Scale', monthly: 2_299, selectable: false, legacy: true, custom: true,
    blurb: 'Retired. No concierge tier is offered.',
    allowances: { contacts: 150_000, emails: 1_500_000, push: 2_000_000, aiCredits: 40_000, onchainCredits: 50_000, onsPlus: 15_000, seats: 0, dedicatedIps: 1, conciergeHours: 5 },
  },
  {
    id: 'free', name: 'Free', monthly: 0, selectable: false, legacy: true,
    blurb: 'Retired. There is no free tier.',
    allowances: { contacts: 250, emails: 500, push: 0, aiCredits: 50, onchainCredits: 1_000, onsPlus: 0, seats: 1 },
  },
  {
    id: 'starter', name: 'Starter', monthly: 49, selectable: false, legacy: true,
    blurb: 'Retired. Superseded by Launch.',
    allowances: { contacts: 10_000, emails: 25_000, push: 0, aiCredits: 1_000, onchainCredits: 20_000, onsPlus: 0, seats: 3 },
  },
  {
    id: 'pro-plus', name: 'Pro Plus', monthly: 1_499, selectable: false, legacy: true,
    blurb: 'Retired. Superseded by Pro.',
    allowances: { contacts: 1_000_000, emails: 1_000_000, push: 0, aiCredits: 50_000, onchainCredits: 750_000, onsPlus: 0, seats: 30 },
  },
];

/** Send's monthly price at a given subscriber count: $6 base plus $3.95 per 1,000. */
export function sendPrice(subscribers: number): number {
  const p = getPlan('send')!.send!;
  return Math.round((p.base + (subscribers / 1_000) * p.per1k) * 100) / 100;
}

export const selectablePlans = () => PLANS.filter((p) => p.selectable);
export const getPlan = (id: string) => PLANS.find((p) => p.id === id);

/* ---------------- Metered rates (v4 §03) ----------------
 *
 * Six meters. Every one is priced as a multiple of what the unit costs us, after a company
 * buffer. These are the list rates: PAYG pays them from the first unit, and a subscriber
 * pays them on everything past an allowance. They are NOT discounted, which is what makes
 * overage more expensive per unit than the plan. */

export interface Meter {
  id: 'emails' | 'push' | 'onsPlus' | 'onchain' | 'ai' | 'concierge';
  label: string;
  /** Price in USD per `per` units. */
  price: number;
  per: number;
  unit: string;
  note?: string;
}

export const METERS: Meter[] = [
  { id: 'emails', label: 'Email sends', price: 1.0, per: 1_000, unit: 'emails' },
  { id: 'push', label: 'In-app push', price: 1.0, per: 1_000, unit: 'pushes', note: 'Bundled per tier since v4. The add-on SKU is retired.' },
  { id: 'onsPlus', label: 'ONS+ list protection', price: 10.0, per: 1_000, unit: 'addresses', note: 'Two-stage filter: 65% cleared in-house, the rest escalated to Kickbox.' },
  { id: 'onchain', label: 'Wallet-data credits', price: 10.0, per: 10_000, unit: 'credits', note: 'Our cost is $1.08 per 10,000 at four credits a wallet (Alchemy, measured 11 Sep 2026). GoldRush, the $8.33 supplier the old $2.50 price lost money against, is retired.' },
  { id: 'ai', label: 'AI actions', price: 5.0, per: 1_000, unit: 'actions' },
  { id: 'concierge', label: 'Concierge', price: 150.0, per: 1, unit: 'hours', note: 'Scale includes 5 hours per month; beyond that bills at list.' },
];

export const getMeter = (id: Meter['id']) => METERS.find((m) => m.id === id)!;

/** Cost of `qty` units on a meter, at list / overage rates. */
export function meterCost(id: Meter['id'], qty: number): number {
  const m = getMeter(id);
  return (qty / m.per) * m.price;
}

/** What a plan's whole allowance would cost bought at list. The plan is a discount on this. */
export function allowanceAtList(plan: Plan): number {
  const a = plan.allowances;
  return meterCost('emails', a.emails)
    + meterCost('push', a.push)
    + meterCost('onsPlus', a.onsPlus)
    + meterCost('onchain', a.onchainCredits)
    + meterCost('ai', a.aiCredits)
    + meterCost('concierge', a.conciergeHours ?? 0);
}

/** How much dearer a unit is once the allowance is gone. >1 on every tier by design. */
export function overageMultiple(plan: Plan): number {
  return plan.monthly ? allowanceAtList(plan) / plan.monthly : 1;
}

/* ---------------- PAYG wallet + caps (§3) ---------------- */

export const TOPUP_MIN = 10;
export const TOPUP_MAX = 1_000;

/* Stripe replaced Blockradar in v4 — 4.4x dearer, and now an explicit cost line rather
   than a rounding error. Cross-currency settlement costs 5.33%, so avoiding FX is worth
   about two points of margin on every transaction. Plan prices already absorb this. */
export const PROCESSING_FEE_PCT = 3.325;
export const PROCESSING_FEE_FIXED = 0.25;
export const PROCESSING_FEE_PCT_CROSS_CURRENCY = 5.33;

/* PAYG cannot substitute for a paid tier.
 *
 * v4 cut this from 25,000 to 1,000: "25,000 free contacts made Launch unsellable at any
 * price." Keep in step with PLANS.payg.allowances.contacts — pricing.test.ts fails if the
 * two diverge, and asserts Launch still beats PAYG on contacts. */
export const PAYG_CAPS = { contacts: 1_000, seats: 2, automations: 3 };

/* ---------------- Lifecycle (§5) ---------------- */

/** Renewal reminders to org owners, in days before expiry. */
export const RENEWAL_REMINDER_DAYS = [4, 2, 1];

export type BillingState =
  | 'subscribed'      // inside allowance
  | 'usage-based'     // allowance exhausted or plan expired → bills wallet at PAYG rates
  | 'blocked';        // wallet empty too → hard 402

/** No revenue cliffs: only an empty wallet blocks (§5). */
export function billingState(opts: { subscribed: boolean; allowanceLeft: boolean; walletBalance: number }): BillingState {
  if (opts.subscribed && opts.allowanceLeft) return 'subscribed';
  return opts.walletBalance > 0 ? 'usage-based' : 'blocked';
}

export const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: n % 1 === 0 ? 0 : 2 });

/** "$2.50 per 10,000 credits" */
export const rateLabel = (m: Meter) => `${fmtUsd(m.price)} per ${m.per.toLocaleString('en-US')} ${m.unit}`;
