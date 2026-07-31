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

/* Pay-as-you-go unit rates — the live billing meters' prices. */
const PER_10K_ONCHAIN = 2.5; // $2.50 per 10,000 on-chain (GoldRush) credits
const PER_1K_AI = 5; // $5 per 1,000 AI credits

/* Per-1,000 message rates, split by channel. Email and in-app are billed
 * separately — set each channel's real rate here.
 * TODO(pricing): confirm the email vs in-app rates with the team. Both default
 * to the previous bundled $1/1k until the finalized numbers land. */
const EMAIL_PER_1K = 1;
const INAPP_PER_1K = 1;

type MessageChannel = "email" | "inapp";

interface ChannelRate {
  id: MessageChannel;
  label: string;
  per1k: number;
  hint: string;
}

const MESSAGE_CHANNELS: ChannelRate[] = [
  {
    id: "email",
    label: "Email",
    per1k: EMAIL_PER_1K,
    hint: "emailable contacts via the identity bridge",
  },
  {
    id: "inapp",
    label: "In-app push",
    per1k: INAPP_PER_1K,
    hint: "every connected wallet, no extra identifier",
  },
];

/** "email", "in-app push", or "email and in-app push" for inline copy. */
const channelSummary = (channels: ChannelRate[]): string =>
  channels.map((c) => c.label.toLowerCase()).join(" and ") || "message";

/** Non-exclusive channel toggle (Email / In-app push). Teams often run both,
 * so this is multi-select — at least one channel always stays on. Shared by the
 * calculator and the plan grid so both read from one idiom. */
function ChannelToggle({
  value,
  onChange,
  label = "Channels",
}: {
  value: Set<MessageChannel>;
  onChange: (next: Set<MessageChannel>) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] t-muted2">{label}</span>
      <div
        className="inline-flex items-center gap-1 rounded-full border p-1"
        style={{ borderColor: "var(--line)" }}
        role="group"
        aria-label="Message channels"
      >
        {MESSAGE_CHANNELS.map((c) => {
          const on = value.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              title={`$${c.per1k} per 1,000 · ${c.hint}`}
              onClick={() => {
                const next = new Set(value);
                if (on) {
                  if (next.size > 1) next.delete(c.id);
                } else {
                  next.add(c.id);
                }
                onChange(next);
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150"
              style={
                on
                  ? { background: "var(--acc)", color: "#fff" }
                  : { color: "var(--muted)" }
              }
            >
              <CheckIcon
                className="h-3.5 w-3.5"
                style={{ opacity: on ? 1 : 0.3 }}
                aria-hidden="true"
              />
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Calculator({
  channels,
  onChannelsChange,
}: {
  channels: Set<MessageChannel>;
  onChannelsChange: (next: Set<MessageChannel>) => void;
}) {
  const [emailMsgs, setEmailMsgs] = useState(25000);
  const [inappMsgs, setInappMsgs] = useState(25000);
  const [onchain, setOnchain] = useState(100000);
  const [ai, setAi] = useState(1000);

  const emailOn = channels.has("email");
  const inappOn = channels.has("inapp");

  const price = useMemo(() => {
    let messageCost = 0;
    if (emailOn) messageCost += (emailMsgs / 1000) * EMAIL_PER_1K;
    if (inappOn) messageCost += (inappMsgs / 1000) * INAPP_PER_1K;
    const raw =
      messageCost +
      (onchain / 10000) * PER_10K_ONCHAIN +
      (ai / 1000) * PER_1K_AI;
    return Math.round(raw);
  }, [emailOn, inappOn, emailMsgs, inappMsgs, onchain, ai]);

  return (
    <Reveal delay={0.12}>
      <div className="card mx-auto mt-12 max-w-3xl overflow-hidden p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mono text-[11px] uppercase tracking-[0.16em] t-muted2">
              Estimate your bill
            </span>
            <p className="mt-1 text-[13px] t-muted">
              Email and in-app push are billed separately — run one or both.
            </p>
          </div>
          <ChannelToggle value={channels} onChange={onChannelsChange} />
        </div>
        <div className="grid gap-8 md:grid-cols-[1fr_auto]">
          <div className="space-y-7">
            {emailOn ? (
              <Slider
                label="Emails sent"
                hint={`$${EMAIL_PER_1K} per 1,000 · emailable contacts via the identity bridge`}
                min={0}
                max={500000}
                step={5000}
                value={emailMsgs}
                onChange={setEmailMsgs}
              />
            ) : null}
            {inappOn ? (
              <Slider
                label="In-app pushes sent"
                hint={`$${INAPP_PER_1K} per 1,000 · every connected wallet, no extra identifier`}
                min={0}
                max={500000}
                step={5000}
                value={inappMsgs}
                onChange={setInappMsgs}
              />
            ) : null}
            <Slider
              label="On-chain credits"
              hint="Wallet reads & enrichment, $2.50 per 10,000"
              min={0}
              max={2000000}
              step={20000}
              value={onchain}
              onChange={setOnchain}
            />
            <Slider
              label="AI credits"
              hint="Intelligence queries & assistants, $5 per 1,000"
              min={0}
              max={20000}
              step={250}
              value={ai}
              onChange={setAi}
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
          from a top-up wallet, and nothing to cancel. When your volume settles,
          a flat plan below usually works out cheaper; switch anytime.
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

/* Plan tiers. Email and in-app push are priced separately; a card's price is
 * the sum of the selected channels' prices (choosing both is cumulative). Each
 * tier is a full plan on either channel — the shared resources (contacts, AI,
 * wallet-data, seats) are included once, never doubled. Numbers from the pricing
 * docs (docs/pricing.md). */
interface Tier {
  name: string;
  slug: string;
  who: string;
  emailPrice: number;
  inappPrice: number;
  emailMessages: string;
  inappPushes: string;
  contacts: string;
  ai: string;
  walletData: string;
  seats: string;
  popular?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Launch",
    slug: "launch",
    who: "A protocol getting started",
    emailPrice: 29,
    inappPrice: 39,
    emailMessages: "15,000",
    inappPushes: "50,000",
    contacts: "5,000",
    ai: "500",
    walletData: "10,000",
    seats: "2",
  },
  {
    name: "Growth",
    slug: "growth",
    who: "Scaling retention",
    emailPrice: 199,
    inappPrice: 149,
    emailMessages: "100,000",
    inappPushes: "250,000",
    contacts: "100,000",
    ai: "8,000",
    walletData: "75,000",
    seats: "5",
    popular: true,
  },
  {
    name: "Pro",
    slug: "pro",
    who: "Established & high-volume",
    emailPrice: 499,
    inappPrice: 449,
    emailMessages: "250,000",
    inappPushes: "1,000,000",
    contacts: "250,000",
    ai: "16,000",
    walletData: "200,000",
    seats: "15",
  },
];

/** Card price = sum of the selected channels' prices (cumulative for both). */
const tierPrice = (tier: Tier, channels: ChannelRate[]): number => {
  const emailOn = channels.some((c) => c.id === "email");
  const inappOn = channels.some((c) => c.id === "inapp");
  return (emailOn ? tier.emailPrice : 0) + (inappOn ? tier.inappPrice : 0);
};

/** Channel-aware allowances: a message line per selected channel, then the
 * shared resources (listed once). */
const tierFeatures = (tier: Tier, channels: ChannelRate[]): string[] => {
  const emailOn = channels.some((c) => c.id === "email");
  const inappOn = channels.some((c) => c.id === "inapp");
  const features: string[] = [];
  if (emailOn) features.push(`${tier.emailMessages} email sends/mo`);
  if (inappOn) features.push(`${tier.inappPushes} in-app pushes/mo`);
  features.push(`Up to ${tier.contacts} contacts`);
  features.push(`${tier.ai} AI credits/mo`);
  features.push(`${tier.walletData} on-chain credits/mo`);
  features.push(`${tier.seats} team seats`);
  return features;
};

function Profiles({
  channels,
  onChannelsChange,
}: {
  channels: Set<MessageChannel>;
  onChannelsChange: (next: Set<MessageChannel>) => void;
}) {
  const enabledChannels = MESSAGE_CHANNELS.filter((c) => channels.has(c.id));
  const both = channels.has("email") && channels.has("inapp");

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
          sub="Email and in-app push are priced separately — pick one or both. Choosing both simply adds the two prices. Pay in USDC via crypto checkout, upgrade or downgrade anytime."
        />
        <div className="mt-8 flex justify-center">
          <ChannelToggle
            value={channels}
            onChange={onChannelsChange}
            label="Pay for"
          />
        </div>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* PAYG is the signup default — usage-based, per-unit. */}
          <StaggerItem key="payg">
            <div className="card relative flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-1">
              <span className="text-[13px] font-semibold t-ink">
                Pay as you go
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span
                  className="font-semibold tracking-tight t-ink"
                  style={{ fontSize: "1.8rem" }}
                >
                  $0
                </span>
                <span className="text-[13px] t-muted">/mo + usage</span>
              </div>
              <p className="mt-1 text-[12.5px] t-muted">
                Every new workspace starts here, top up and pay only for what
                you use.
              </p>
              <div
                className="my-4 space-y-1.5 border-y py-3 text-[12.5px]"
                style={{ borderColor: "var(--line-2)" }}
              >
                {[
                  ...enabledChannels.map(
                    (c) => `$${c.per1k} per 1,000 ${c.label} messages`
                  ),
                  "$2.50 per 10,000 on-chain credits",
                  "$5 per 1,000 AI credits",
                  "Up to 25k contacts · 2 seats",
                ].map((feature) => (
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
              <Link href={SIGNUP} className="mt-auto btn btn-ghost w-full">
                Start free
              </Link>
            </div>
          </StaggerItem>
          {TIERS.map((tier) => {
            const price = tierPrice(tier, enabledChannels);
            return (
              <StaggerItem key={tier.slug}>
                <div
                  className="card relative flex h-full flex-col p-5 transition-transform duration-200 hover:-translate-y-1"
                  style={
                    tier.popular
                      ? {
                          borderColor:
                            "color-mix(in oklab, var(--acc) 45%, var(--line))",
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
                  <span className="text-[13px] font-semibold t-ink">
                    {tier.name}
                  </span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span
                      className="font-semibold tracking-tight t-ink"
                      style={{ fontSize: "1.8rem" }}
                    >
                      ${price}
                    </span>
                    <span className="text-[13px] t-muted">/mo</span>
                  </div>
                  {both ? (
                    <p className="mt-0.5 text-[11.5px] t-muted2">
                      ${tier.emailPrice} email + ${tier.inappPrice} in-app
                    </p>
                  ) : null}
                  <p className="mt-1 text-[12.5px] t-muted">{tier.who}</p>
                  <div
                    className="my-4 space-y-1.5 border-y py-3 text-[12.5px]"
                    style={{ borderColor: "var(--line-2)" }}
                  >
                    {tierFeatures(tier, enabledChannels).map((feature) => (
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
                    Get early access
                  </Link>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[12.5px] t-muted2">
          {`Showing ${channelSummary(enabledChannels)} pricing. Email and in-app push are billed separately — choosing both adds the two prices. Overage past any plan's allowance continues at the pay-as-you-go rate.`}
        </p>
      </div>
    </section>
  );
}

const INCLUDED = [
  "In-app push to 100% of connected wallets, via a drop-in SDK",
  "Email with 10 monthly sends bundled per subscriber",
  "Protocol Plays library: fork-and-edit retention automations",
  "Behavior-triggered automations and on-demand campaigns",
  "Intelligence: MCP plus a SQL engine over normalized on-chain data",
  "Protocol Normalization across Ethereum, Solana, Base, and Polygon",
  "Wallet-first identity with a zero-knowledge privacy bridge",
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
          sub="Pricing scales with usage, not features. Every protocol gets the full platform from day one."
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

const PRICING_FAQ = [
  [
    "How does pricing work?",
    "Every workspace starts on pay-as-you-go: no monthly fee, prepaid usage from a top-up wallet at $1 per 1,000 messages (email or in-app), $2.50 per 10,000 on-chain credits, and $5 per 1,000 AI credits. When your volume settles, flat plans (email $29/$199/$499 and in-app $39/$149/$449, cumulative for both) usually work out cheaper, and overage past a plan's allowance simply continues at the pay-as-you-go rates.",
  ],
  [
    "What is a tracked wallet?",
    "An on-chain wallet your protocol monitors for behavior. Tracked wallets are the platform's core value, independent of email, so they are billed separately. In-app push reaches every connected wallet with no extra identifier.",
  ],
  [
    "What is an email subscriber?",
    "An emailable contact a wallet has linked privately through the zero-knowledge identity bridge. Each subscriber bundles 10 sends per month, so your sending capacity scales automatically with your list.",
  ],
  [
    "Is there a free plan?",
    "There is no free tier. New workspaces start on pay-as-you-go with no monthly fee, so you only ever pay for usage. Signing up costs nothing, and a small protocol's first campaigns typically run a few dollars.",
  ],
  [
    "Which channels are included, and is there SMS?",
    "In-app push and email are live today, included on every plan. Telegram and Discord are on the roadmap. There is no SMS; in-app push is the lowest-cost, highest-reach channel and leads the set.",
  ],
  [
    "What about larger protocols?",
    "Pro covers most high-volume protocols, and pay-as-you-go rates apply past any plan's allowance, so nothing hard-stops. Ecosystems with bigger needs move to a custom agreement; contact us for a quote based on your usage.",
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
                Usage-based pricing · in-app push + email · founding rates for
                early teams
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function PricingPage() {
  const [channels, setChannels] = useState<Set<MessageChannel>>(
    () => new Set<MessageChannel>(["email", "inapp"])
  );
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
                Pay as you go, priced by{" "}
                <span className="grad">what you actually use.</span>
              </>
            }
            sub="No monthly fee to start: $1 per 1,000 messages (email or in-app), $2.50 per 10,000 on-chain credits, $5 per 1,000 AI credits. All prepaid from a top-up wallet. Flat email and in-app plans take over when your volume settles."
          />
          <Calculator channels={channels} onChannelsChange={setChannels} />
        </div>
      </section>
      <Profiles channels={channels} onChannelsChange={setChannels} />
      <Included />
      <PricingFaq />
      <PricingCta />
    </PageShell>
  );
}

export default PricingPage;
