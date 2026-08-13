"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

import "./landing-v2.css";
import { Counter, Reveal, Stagger, StaggerItem } from "./primitives";
import { Heading, PageShell, SIGNUP } from "./shared";

/* Pay-as-you-go unit rates - the live billing meters (docs/pricing.md v4 §2).
 * These are the list prices overage bills at once a plan's allowance is spent. */
const EMAIL_PER_1K = 1; // $1.00 per 1,000 emails
const INAPP_PER_1K = 1; // $1.00 per 1,000 in-app pushes
const ONSPLUS_PER_1K = 10; // $10.00 per 1,000 ONS+ verifications
const ONCHAIN_PER_10K = 10; // $10.00 per 10,000 on-chain credits
const AI_PER_1K = 5; // $5.00 per 1,000 AI actions

/* The six metered rates, shown as a rate card. */
const METERS: { label: string; rate: string; note: string }[] = [
  { label: "Email", rate: "$1.00", note: "per 1,000 sends" },
  { label: "In-app push", rate: "$1.00", note: "per 1,000 pushes" },
  { label: "ONS+ list protection", rate: "$10.00", note: "per 1,000 verified" },
  { label: "On-chain credits", rate: "$10.00", note: "per 10,000 credits" },
  { label: "AI actions", rate: "$5.00", note: "per 1,000 actions" },
  { label: "Concierge", rate: "$150.00", note: "per hour (Scale)" },
];

function Calculator() {
  const [email, setEmail] = useState(5000);
  const [inapp, setInapp] = useState(50000);
  const [onchain, setOnchain] = useState(10000);
  const [ai, setAi] = useState(1000);
  const [onsplus, setOnsplus] = useState(2500);

  const price = useMemo(() => {
    const raw =
      (email / 1000) * EMAIL_PER_1K +
      (inapp / 1000) * INAPP_PER_1K +
      (onchain / 10000) * ONCHAIN_PER_10K +
      (ai / 1000) * AI_PER_1K +
      (onsplus / 1000) * ONSPLUS_PER_1K;
    return Math.round(raw);
  }, [email, inapp, onchain, ai, onsplus]);

  return (
    <Reveal delay={0.12}>
      <div className="card mx-auto mt-12 max-w-3xl overflow-hidden p-6 md:p-8">
        <div className="mb-6">
          <span className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
            Estimate your bill
          </span>
          <p className="mt-1 text-[13px] t-muted">
            Pay-as-you-go is metered: pay only for what you send and read. A
            flat plan below usually works out cheaper once your volume settles.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-7">
            <Slider
              label="Emails sent"
              hint={`$${EMAIL_PER_1K} per 1,000 · emailable contacts via the identity bridge`}
              min={0}
              max={500000}
              step={5000}
              value={email}
              onChange={setEmail}
            />
            <Slider
              label="In-app pushes sent"
              hint={`$${INAPP_PER_1K} per 1,000 · every connected wallet, no extra identifier`}
              min={0}
              max={500000}
              step={5000}
              value={inapp}
              onChange={setInapp}
            />
            <Slider
              label="On-chain credits"
              hint="Wallet reads & enrichment, $10 per 10,000"
              min={0}
              max={500000}
              step={5000}
              value={onchain}
              onChange={setOnchain}
            />
            <Slider
              label="AI actions"
              hint="Intelligence queries & assistants, $5 per 1,000"
              min={0}
              max={40000}
              step={500}
              value={ai}
              onChange={setAi}
            />
            <Slider
              label="ONS+ list protection"
              hint="Email verification at upload, $10 per 1,000 verified"
              min={0}
              max={50000}
              step={500}
              value={onsplus}
              onChange={setOnsplus}
            />
          </div>
          <div
            className="flex flex-col items-center justify-center rounded-2xl px-7 py-6 text-center"
            style={{ background: "var(--acc-soft)", minWidth: 200 }}
          >
            <span className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
              Pay as you go
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span
                className="font-semibold tracking-tight t-ink"
                style={{ fontSize: "clamp(2rem,5vw,2.8rem)" }}
              >
                $<Counter to={price} duration={0.5} />
              </span>
              <span className="text-[14px] t-muted">/mo</span>
            </div>
            <span className="mt-1 text-[11px] t-muted2">
              no base fee, usage only
            </span>
          </div>
        </div>
        <p
          className="mt-6 border-t pt-5 text-[13px] leading-relaxed t-muted"
          style={{ borderColor: "var(--line-2)" }}
        >
          Every workspace starts on pay-as-you-go: no monthly fee, prepaid usage
          from a top-up wallet ($10 minimum), and nothing to cancel. When your
          volume settles, a flat plan below usually works out cheaper; switch
          anytime.
        </p>
      </div>
    </Reveal>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[14px] font-semibold t-ink">{label}</span>
        <span className="mono text-[14px] font-semibold t-acc">
          {value.toLocaleString()}
        </span>
      </div>
      <p className="mb-2 text-[12px] t-muted2">{hint}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="ocs2-range w-full"
        style={{
          background: `linear-gradient(90deg, var(--acc) ${pct}%, var(--line) ${pct}%)`,
        }}
      />
    </div>
  );
}

/* Plan tiers (docs/pricing.md v4 §1). Monthly billing only: one price per tier,
 * no channel split, no free tier, no annual discount. Overage past any
 * allowance bills at the pay-as-you-go rates above. */
interface Tier {
  name: string;
  slug: string;
  price: string;
  priceNote: string;
  who: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PAYG: Tier = {
  name: "Pay as you go",
  slug: "payg",
  price: "$0",
  priceNote: "/mo + usage",
  who: "Every new workspace starts here, top up and pay only for what you use.",
  features: [
    "1,000 contacts",
    "Direct campaigns, Audience & Forms",
    "Up to 3 automations",
    "Metered email, in-app, on-chain & AI",
    "2 team seats",
  ],
  cta: "Start free",
};

const TIERS: Tier[] = [
  {
    name: "Launch",
    slug: "launch",
    price: "$49",
    priceNote: "/mo",
    who: "A protocol getting started on email + wallet.",
    features: [
      "2,500 contacts",
      "50,000 emails/mo",
      "25,000 in-app pushes/mo",
      "1,000 on-chain credits/mo",
      "500 AI credits/mo",
      "Intelligence",
      "2 team seats",
    ],
    cta: "Get early access",
  },
  {
    name: "Growth",
    slug: "growth",
    price: "$349",
    priceNote: "/mo",
    who: "Scaling retention, adds Forms + a dedicated IP.",
    features: [
      "25,000 contacts",
      "250,000 emails/mo",
      "250,000 in-app pushes/mo",
      "10,000 on-chain credits/mo",
      "8,000 AI credits/mo",
      "Forms + dedicated IP",
      "4 team seats",
    ],
    cta: "Get early access",
    popular: true,
  },
  {
    name: "Pro",
    slug: "pro",
    price: "$799",
    priceNote: "/mo",
    who: "Intelligence at working scale across a large list.",
    features: [
      "75,000 contacts",
      "750,000 emails/mo",
      "1,000,000 in-app pushes/mo",
      "25,000 on-chain credits/mo",
      "16,000 AI credits/mo",
      "Dedicated IP",
      "7 team seats",
    ],
    cta: "Get early access",
  },
  {
    name: "Scale",
    slug: "scale",
    price: "$2,299",
    priceNote: "/mo",
    who: "Everything in Pro, plus custom allowances + concierge.",
    features: [
      "150,000 contacts",
      "1,500,000 emails/mo",
      "2,000,000 in-app pushes/mo",
      "50,000 on-chain credits/mo",
      "40,000 AI credits/mo",
      "5 concierge hrs/mo",
      "Custom team seats",
    ],
    cta: "Talk to us",
  },
];

function PlanCard({ tier }: { tier: Tier }) {
  return (
    <div
      className="card relative flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-1"
      style={
        tier.popular
          ? {
              borderColor: "color-mix(in oklab, var(--acc) 45%, var(--line))",
              boxShadow: "var(--shadow-acc)",
            }
          : undefined
      }
    >
      {tier.popular ? (
        <span
          className="mono absolute -top-2.5 left-5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white"
          style={{ background: "var(--acc)" }}
        >
          POPULAR
        </span>
      ) : null}
      <span className="text-[13px] font-semibold t-ink">{tier.name}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <span
          className="font-semibold tracking-tight t-ink"
          style={{ fontSize: "1.8rem" }}
        >
          {tier.price}
        </span>
        <span className="text-[13px] t-muted">{tier.priceNote}</span>
      </div>
      <p className="mt-1 text-[12.5px] t-muted">{tier.who}</p>
      <div
        className="my-4 space-y-1.5 border-y py-3 text-[12.5px]"
        style={{ borderColor: "var(--line-2)" }}
      >
        {tier.features.map((feature) => (
          <div key={feature} className="flex items-start gap-1.5">
            <CheckIcon
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "var(--acc)" }}
            />
            <span className="t-muted">{feature}</span>
          </div>
        ))}
      </div>
      <Link
        href={SIGNUP}
        className={`mt-auto btn ${tier.popular ? "btn-primary" : "btn-ghost"} w-full`}
      >
        {tier.cta}
      </Link>
    </div>
  );
}

function Profiles() {
  return (
    <section className="py-16">
      <div className="wrap">
        <Heading
          eyebrow="Plans"
          title={
            <>
              Where teams typically <span className="grad">land.</span>
            </>
          }
          sub="Four flat tiers plus a metered entry point. Monthly billing, one price per plan, no free tier and no annual lock-in. Overage past any allowance continues at the pay-as-you-go rates. Pay in Fiat or Crypto."
        />
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StaggerItem key={PAYG.slug}>
            <PlanCard tier={PAYG} />
          </StaggerItem>
          {TIERS.map((tier) => (
            <StaggerItem key={tier.slug}>
              <PlanCard tier={tier} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Rates() {
  return (
    <section className="py-16">
      <div className="wrap">
        <Heading
          eyebrow="Unit rates"
          title={
            <>
              The meters, <span className="grad">in the open.</span>
            </>
          }
          sub="Every plan bundles an allowance of each; overage bills at these list rates. Nothing is priced below its worst-case cost."
        />
        <Stagger className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METERS.map((m) => (
            <StaggerItem key={m.label}>
              <div className="card flex items-baseline justify-between gap-3 p-4">
                <div>
                  <p className="text-[13.5px] font-semibold t-ink">{m.label}</p>
                  <p className="text-[12px] t-muted2">{m.note}</p>
                </div>
                <span className="mono text-[16px] font-semibold t-acc">
                  {m.rate}
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const INCLUDED = [
  "In-app push to 100% of connected wallets, via a drop-in SDK",
  "Email over a wallet-linked, zero-knowledge identity bridge",
  "Protocol Plays library: fork-and-edit retention automations",
  "Behavior-triggered automations and on-demand campaigns",
  "Intelligence: MCP plus a SQL engine over normalized on-chain data",
  "Protocol Normalization across Ethereum, Solana, Base, and Polygon",
  "ONS+ list protection on every upload, keeping sender reputation clean",
  "Sub-10-minute first-mile cohort report",
];

function Included() {
  return (
    <section className="py-16">
      <div className="wrap">
        <Heading
          eyebrow="Every plan"
          title={
            <>
              Everything included,{" "}
              <span className="grad">whatever your size.</span>
            </>
          }
          sub="Pricing scales with usage and allowances, not features. Every protocol gets the full platform from day one (Intelligence from Launch upward)."
        />
        <Stagger className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
          {INCLUDED.map((f) => (
            <StaggerItem key={f}>
              <div className="card flex items-start gap-3 p-4">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--ok)" }}
                >
                  <CheckIcon className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="text-[13.5px] leading-snug t-ink2">{f}</span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const PRICING_FAQ: [string, string][] = [
  [
    "How does pricing work?",
    "Four flat monthly tiers (Launch $49, Growth $349, Pro $799, Scale $2,299) plus a pay-as-you-go entry point at $0/mo. Each plan bundles an allowance of every meter; once you pass an allowance, that meter continues at the list rate: $1 per 1,000 emails, $1 per 1,000 in-app pushes, $10 per 10,000 on-chain credits, $5 per 1,000 AI actions, and $10 per 1,000 ONS+ verifications. Billing is monthly only.",
  ],
  [
    "What is pay-as-you-go?",
    "The metered entry point every workspace starts on: no monthly fee, a prepaid top-up wallet ($10 minimum), Direct campaigns, Audience and Forms, and up to 3 automations. Intelligence is not included on PAYG; move to Launch for that.",
  ],
  [
    "What counts as a contact?",
    "A wallet-first profile in your audience. Plans are sized by contacts (1,000 on PAYG up to 150,000 on Scale) alongside per-channel send allowances, so your list and your sending scale together.",
  ],
  [
    "Is there a free plan or an annual discount?",
    "No free tier and no annual discount, until there is churn data worth trading against. Signing up costs nothing (a 5-wallet preview), and pay-as-you-go means a small protocol's first campaigns typically run a few dollars.",
  ],
  [
    "What is ONS+ list protection?",
    "Email verification run at upload so dead and risky addresses never reach a send. A two-stage filter clears most addresses in-house for free and only escalates the rest, which is why it is billed per 1,000 verified rather than per address submitted.",
  ],
  [
    "What about a dedicated IP, or larger protocols?",
    "A dedicated IP comes with Growth and up, and is provisioned automatically once an account sustains 100,000 sends/month (below that the managed warm pool sends better than a cold dedicated IP). Scale adds custom allowances and 5 concierge hours; ecosystems with bigger needs get a custom agreement, contact us for a quote.",
  ],
];

function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-16">
      <div className="wrap">
        <Heading eyebrow="Pricing FAQ" title="Pricing, explained." />
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {PRICING_FAQ.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <Reveal key={q} delay={i * 0.04}>
                <div
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
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingCta() {
  return (
    <section className="py-16">
      <div className="wrap">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-3xl px-5 py-12 text-center sm:px-8 sm:py-14"
            style={{
              background: "linear-gradient(135deg, var(--acc), var(--acc-h))",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,.4), transparent 40%), radial-gradient(circle at 80% 80%, rgba(47,148,255,.5), transparent 45%)",
              }}
            />
            <div className="relative mx-auto max-w-2xl">
              <h2
                className="font-semibold tracking-tight text-white"
                style={{
                  fontSize: "clamp(1.8rem,3.4vw,2.6rem)",
                  lineHeight: 1.1,
                }}
              >
                Start acting on what your users do on-chain.
              </h2>
              <p className="mt-4 text-[16px] text-white/85">
                Write your first rule today. It fires the moment a wallet acts,
                until you pause it.
              </p>
              <div className="mt-7 flex justify-center">
                <Link
                  href={SIGNUP}
                  className="btn"
                  style={{ background: "#fff", color: "var(--acc)" }}
                >
                  Get early access
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-5 text-[12.5px] text-white/70">
                Start on pay-as-you-go · flat plans from $49/mo · founding rates
                for early teams
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function PricingPage() {
  return (
    <PageShell>
      <section className="relative overflow-hidden pb-6 pt-16 md:pt-20">
        <div className="grid-bg" />
        <div
          className="orb"
          style={{
            width: 420,
            height: 420,
            right: -80,
            top: -80,
            background: "color-mix(in oklab, var(--acc) 28%, transparent)",
          }}
        />
        <div className="wrap relative">
          <Heading
            eyebrow="Start free, pay per use"
            title={
              <>
                Simple plans, priced by{" "}
                <span className="grad">what you actually use.</span>
              </>
            }
            sub="Start on pay-as-you-go with no monthly fee: $1 per 1,000 messages (email or in-app), $10 per 10,000 on-chain credits, $5 per 1,000 AI actions, all prepaid from a top-up wallet. Flat plans from $49/mo take over when your volume settles."
          />
          <Calculator />
        </div>
      </section>
      <Profiles />
      <Rates />
      <Included />
      <PricingFaq />
      <PricingCta />
    </PageShell>
  );
}

export default PricingPage;
