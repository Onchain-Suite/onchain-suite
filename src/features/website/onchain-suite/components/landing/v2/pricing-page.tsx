"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

import "./landing-v2.css";
import { Reveal } from "./primitives";
import { PageShell, SIGNUP } from "./shared";

/* ---------------------------------------------------------------------------
   Pricing content is driven by docs/pricing.md (SSOT, rev v4.2). Layout mirrors
   the marketing demo /pricing: a Suite/Send chooser, Suite tier cards, a Send
   subscriber slider, the shared-capabilities row, and a pricing FAQ.

   Suite = ($16 + $13.30 x contacts/1,000) x tier multiplier; the reference
   prices below are each tier at its reference contact count. Send = $6 + $3.95
   per 1,000 subscribers. Monthly billing only; annual is exactly 12x.
   ------------------------------------------------------------------------- */

interface SuiteTier {
  name: string;
  price: string;
  priceNote: string;
  who: string;
  /** Allowance rows shown on the card (label, value). */
  rows: [string, string][];
  popular?: boolean;
}

const SUITE_TIERS: SuiteTier[] = [
  {
    name: "PAYG",
    price: "$0",
    priceNote: "+ usage",
    who: "Every capability, no discount. Prepaid wallet, $10 minimum top-up. Hard caps stop it substituting for a plan; everything is metered at full list price.",
    rows: [
      ["Contacts", "1,000"],
      ["Automations", "3 max"],
      ["Team seats", "2"],
      ["Metered at", "list price"],
    ],
  },
  {
    name: "Launch",
    price: "$39",
    priceNote: "/mo",
    who: "Email and the wallet channel. Campaigns, automations, audience and Intelligence at sample size. No Forms or dedicated IP.",
    rows: [
      ["Contacts", "2,500"],
      ["Emails", "50,000"],
      ["In-app push", "25,000"],
      ["On-chain", "1,000"],
      ["AI credits", "500"],
      ["ONS+", "250"],
      ["Team seats", "2"],
    ],
  },
  {
    name: "Growth",
    price: "$349",
    priceNote: "/mo",
    who: "Adds Forms and a dedicated IP, and takes the wallet channel from sample size to campaign size.",
    popular: true,
    rows: [
      ["Contacts", "25,000"],
      ["Emails", "250,000"],
      ["In-app push", "250,000"],
      ["On-chain", "10,000"],
      ["AI credits", "8,000"],
      ["ONS+", "2,500"],
      ["Dedicated IP", "1"],
      ["Team seats", "4"],
    ],
  },
  {
    name: "Pro",
    price: "$1,622",
    priceNote: "/mo",
    who: "Intelligence at working scale. Enrichment, segmentation and on-chain triggers run continuously across a large list.",
    rows: [
      ["Contacts", "75,000"],
      ["Emails", "750,000"],
      ["In-app push", "1,000,000"],
      ["On-chain", "25,000"],
      ["AI credits", "16,000"],
      ["ONS+", "7,500"],
      ["Dedicated IP", "1"],
      ["Team seats", "7"],
    ],
  },
];

const SEND_BASE = 6; // $/mo
const SEND_RATE = 3.95; // $ per 1,000 subscribers
// The backend bills whole dollars (never cents) and public quotes match the
// authenticated charge exactly, so the estimate must round the same way -
// $45.50 shown but $46 charged would be "shown one number, charged another".

const CORE_CAPABILITIES = [
  "In-app push via a drop-in SDK, wallet address only",
  "Email campaigns and behaviour-triggered automations",
  "Audience segmentation and ONS+ list protection",
  "Intelligence: ask your on-chain data in plain language, SQL underneath",
  "Protocol Normalisation across the chains you use",
  "Wallet-first identity with privacy-first, opt-in channel linking",
];

const PRICING_FAQ: [string, string][] = [
  [
    "What is the difference between Suite and Send?",
    "Suite is for teams with an on-chain audience: it pairs the wallet channel (in-app push) with email and comes in four tiers. Send is email only, for teams with no on-chain audience, the same email engine with the wallet channel switched off, priced as a simple per-subscriber curve.",
  ],
  [
    "How do the Suite tiers work?",
    "Four tiers: PAYG ($0 plus usage), Launch ($39), Growth ($349) and Pro ($1,622) a month. Every paid tier includes campaigns, automations, audience, ONS+ and Intelligence; Forms and a dedicated IP start on Growth. Tiers otherwise differ on allowance depth and team seats.",
  ],
  [
    "How is Send priced?",
    "One plan, no tiers: $6 a month plus $3.95 per 1,000 subscribers, billed on your list size and assuming around six sends per subscriber. A 10,000-subscriber list is $46 a month, a 50,000-subscriber list is $204.",
  ],
  [
    "What is PAYG?",
    "Pay as you go: every capability, metered at list price, with a prepaid wallet ($10 minimum top-up) and hard caps. It is the way to try the platform before committing to a monthly tier.",
  ],
  [
    "What happens if I exceed an allowance?",
    "Usage above a tier's allowance bills at list price. Allowances are sized to cover normal use, so overage is the exception rather than the plan. Move up a tier whenever it is cheaper than running over.",
  ],
  [
    "Is there a free plan, and is there SMS?",
    "No free tier: PAYG starts at $0 plus usage, so you only pay for what you send and track. In-app push and email are the channels today, with Telegram and Discord on the roadmap. There is no SMS; in-app push is the lowest-cost, highest-reach channel.",
  ],
];

/* ---------- Suite tier card ---------- */
function SuiteCard({ tier }: { tier: SuiteTier }) {
  return (
    <div
      className="card relative flex h-full flex-col p-5"
      style={
        tier.popular
          ? {
              borderColor: "color-mix(in oklab, var(--acc) 45%, var(--line))",
              boxShadow: "var(--shadow-acc)",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-semibold t-ink">{tier.name}</span>
        {tier.popular ? (
          <span
            className="mono rounded-full px-2 py-0.5 text-[9.5px] font-semibold tracking-wide text-white"
            style={{ background: "var(--acc)" }}
          >
            POPULAR
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="font-semibold tracking-tight t-ink"
          style={{ fontSize: "1.9rem" }}
        >
          {tier.price}
        </span>
        <span className="text-[13px] t-muted">{tier.priceNote}</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-relaxed t-muted">{tier.who}</p>
      <dl
        className="my-4 space-y-1.5 border-t pt-4 text-[12.5px]"
        style={{ borderColor: "var(--line)" }}
      >
        {tier.rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="t-muted">{label}</dt>
            <dd className="mono font-medium tabular-nums t-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={SIGNUP}
        className={`mt-auto btn ${tier.popular ? "btn-primary" : "btn-ghost"} w-full`}
      >
        Get early access
      </Link>
    </div>
  );
}

/* ---------- Suite view ---------- */
function SuiteView() {
  return (
    <div>
      <h2 className="text-[26px] font-semibold tracking-tight t-ink sm:text-[30px]">
        Suite, wallet + email.
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed t-muted">
        For teams acting on on-chain behaviour. Every paid tier includes the
        platform; Forms and a dedicated IP start on Growth. Usage above an
        allowance bills at list price.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUITE_TIERS.map((tier) => (
          <SuiteCard key={tier.name} tier={tier} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Send view (subscriber slider) ---------- */
function SendView() {
  const [subs, setSubs] = useState(10000);
  const price = useMemo(() => SEND_BASE + SEND_RATE * (subs / 1000), [subs]);
  const min = 1000;
  const max = 100000;
  const pct = ((subs - min) / (max - min)) * 100;

  return (
    <div>
      <h2 className="text-[26px] font-semibold tracking-tight t-ink sm:text-[30px]">
        Send, email only.
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed t-muted">
        For teams with no on-chain audience, the same email engine with the
        wallet channel switched off. One plan, no tiers: $6 a month plus $3.95
        per 1,000 subscribers.
      </p>
      <div className="card mt-8 p-6 sm:p-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold t-ink">
                  Email subscribers
                </div>
                <div className="text-[12px] t-muted2">Your list size</div>
              </div>
              <span className="mono text-[22px] font-semibold tabular-nums t-ink">
                {subs.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={1000}
              value={subs}
              onChange={(e) => setSubs(Number(e.target.value))}
              aria-label="Email subscribers"
              className="ocs2-range mt-4 w-full"
              style={{
                background: `linear-gradient(90deg, var(--acc) ${pct}%, var(--line) ${pct}%)`,
              }}
            />
          </div>
          <div
            className="rounded-2xl px-6 py-5 text-center md:min-w-[200px]"
            style={{ background: "var(--acc-soft)" }}
          >
            <div className="mono text-[10.5px] uppercase tracking-[0.14em] t-muted2">
              Send · estimated
            </div>
            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span
                className="font-semibold tracking-tight t-ink"
                style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)" }}
              >
                ${Math.round(price).toLocaleString()}
              </span>
              <span className="text-[13px] t-muted">/mo</span>
            </div>
          </div>
        </div>
        <p
          className="mt-6 border-t pt-5 text-[13px] leading-relaxed t-muted"
          style={{ borderColor: "var(--line)" }}
        >
          Send is the email-only line for teams with no on-chain audience. One
          flat rate, no tiers, assuming around six sends per subscriber a month.
          Need the wallet channel too? See the Suite tiers above.
        </p>
      </div>
    </div>
  );
}

/* ---------- Plan chooser (Suite / Send toggle) ---------- */
function PlanChooser() {
  const [plan, setPlan] = useState<"suite" | "send">("suite");
  const options: { id: "suite" | "send"; name: string; sub: string }[] = [
    { id: "suite", name: "Suite", sub: "Wallet + email · 4 tiers" },
    { id: "send", name: "Send", sub: "Email only · one plan" },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:items-start">
      <div className="lg:sticky lg:top-24">
        <div className="mono mb-3 text-[11px] uppercase tracking-[0.16em] t-muted2">
          Choose a plan
        </div>
        <div className="flex gap-2 lg:flex-col">
          {options.map((o) => {
            const active = plan === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setPlan(o.id)}
                aria-pressed={active}
                className="flex-1 rounded-xl border px-4 py-3 text-left transition-colors"
                style={{
                  borderColor: active
                    ? "color-mix(in oklab, var(--acc) 45%, var(--line))"
                    : "var(--line)",
                  background: active ? "var(--acc-soft)" : "var(--surface)",
                }}
              >
                <span
                  className="block text-[15px] font-semibold"
                  style={{ color: active ? "var(--acc)" : "var(--ink)" }}
                >
                  {o.name}
                </span>
                <span className="block text-[12px] t-muted">{o.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>{plan === "suite" ? <SuiteView /> : <SendView />}</div>
    </div>
  );
}

/* ---------- Shared capabilities ---------- */
function CoreCapabilities() {
  return (
    <section className="py-16">
      <div className="wrap-fit">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
            Every Suite tier
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight t-ink sm:text-[32px]">
            The core platform, on every tier.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed t-muted">
            Every paid tier includes the capabilities below. Forms and a
            dedicated IP start on Growth; higher tiers add allowance depth, team
            seats and scale.
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {CORE_CAPABILITIES.map((cap) => (
            <Reveal key={cap}>
              <div className="card flex items-start gap-3 p-4">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--ok)" }}
                >
                  <CheckIcon className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="text-[13.5px] leading-snug t-ink2">{cap}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing FAQ ---------- */
function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="pb-20">
      <div className="wrap-fit">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
            Pricing FAQ
          </div>
          <h2 className="mt-3 text-[26px] font-semibold tracking-tight t-ink sm:text-[32px]">
            Pricing, explained.
          </h2>
        </div>
        <div className="mx-auto mt-8 max-w-2xl space-y-3">
          {PRICING_FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div
                key={q}
                className="card overflow-hidden"
                style={{
                  borderColor: isOpen
                    ? "color-mix(in oklab, var(--acc) 35%, var(--line))"
                    : "var(--line)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-semibold t-ink">{q}</span>
                  <ChevronDownIcon
                    className="h-5 w-5 shrink-0 t-muted transition-transform duration-300"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                    aria-hidden="true"
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                    >
                      <p className="px-5 pb-5 text-[14px] leading-relaxed t-muted">
                        {a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PricingPage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-4 md:pt-20">
        <div className="grid-bg" />
        <div
          className="orb"
          style={{
            width: 420,
            height: 420,
            right: -80,
            top: -80,
            background: "color-mix(in oklab, var(--acc) 22%, transparent)",
          }}
        />
        <div className="wrap-fit relative text-center">
          <Reveal>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium t-acc"
              style={{
                borderColor: "var(--line)",
                background: "var(--surface)",
              }}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--ok)" }}
              />
              Founding rates for early teams
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="mx-auto mt-5 max-w-3xl font-semibold tracking-tight t-ink"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)", lineHeight: 1.04 }}
            >
              Simple pricing,{" "}
              <span className="grad-blue">two ways to buy.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed t-muted">
              Suite pairs the wallet channel with email for teams acting on
              on-chain behaviour, four tiers from $0. Send is email only, for
              teams with no on-chain audience. Monthly billing, no annual
              lock-in.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Plan chooser */}
      <section className="pt-10 pb-8 sm:pt-14">
        <div className="wrap-fit">
          <PlanChooser />
        </div>
      </section>

      <CoreCapabilities />
      <PricingFaq />
    </PageShell>
  );
}

export default PricingPage;
