"use client";

import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "./landing-v2.css";
import { type ChainKey, ChainLogo } from "./chain-logos";
import { submitEarlyAccess } from "./early-access.service";
import { INTEGRATIONS } from "./integration-logos";
import {
  Counter,
  Marquee,
  Reveal,
  Stagger,
  StaggerItem,
  useAnimGate,
} from "./primitives";
import {
  AutomationsViz,
  IntelligenceAskCard,
  ProductWindow,
} from "./product-window";
import { DOCS_URL, Heading, PageShell, SIGNUP } from "./shared";

/* ───────────────────────── Hero ───────────────────────── */

function HeroEmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || status === "submitting") return;
    setStatus("submitting");
    await submitEarlyAccess({ email: email.trim(), source: "hero" });
    setStatus("done");
  };

  const modal = (
    <AnimatePresence>
      {status === "done" ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setStatus("idle")}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            className="ocs2 relative w-full max-w-md rounded-3xl border bg-[color:var(--surface)] p-7 text-center shadow-[0_40px_120px_-40px_rgba(15,23,42,0.5)]"
            style={{ borderColor: "var(--line)" }}
          >
            <button
              type="button"
              onClick={() => setStatus("idle")}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 t-muted2 transition-colors hover:bg-[color:var(--line-2)] hover:t-ink"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 360,
                damping: 18,
              }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{ background: "var(--ok)" }}
            >
              <CheckIcon
                className="h-7 w-7"
                aria-hidden="true"
                strokeWidth={2.5}
              />
            </motion.span>
            <h3 className="mt-4 text-[20px] font-semibold t-ink">
              You&apos;re on the list.
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed t-muted">
              We&apos;ve registered{" "}
              <span className="font-medium t-ink2">{email}</span>. Tell us a bit
              about your protocol and book a 20-minute call to see the platform
              on your own on-chain data.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/early-access?email=${encodeURIComponent(email.trim())}`
                  )
                }
                className="btn btn-primary"
              >
                Complete your profile
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="btn btn-ghost"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="mx-auto mt-9 flex w-full max-w-md flex-col items-stretch gap-2.5 sm:flex-row"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@protocol.xyz"
          aria-label="Work email"
          className="h-12 min-h-12 rounded-xl border bg-white px-4 text-[14px] t-ink shadow-sm outline-none transition-colors placeholder:t-muted2 focus:border-[color:var(--acc)] focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--acc)_20%,transparent)] sm:flex-1"
          style={{ borderColor: "var(--line)" }}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn btn-primary h-12 shrink-0 disabled:opacity-70"
        >
          {status === "submitting" ? "Sending…" : "Get early access"}
        </button>
      </form>

      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}

const HERO_WORDS = ["incentivize", "mail", "respond", "act"];

function RotatingWord() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { margin: "80px" });
  const [i, setI] = useState(0);
  useEffect(() => {
    // rotate only while the headline is actually on screen
    if (reduce || !inView) return;
    const t = window.setInterval(
      () => setI((v) => (v + 1) % HERO_WORDS.length),
      2600
    );
    return () => window.clearInterval(t);
  }, [reduce, inView]);
  return (
    <span ref={ref} className="relative inline-block align-baseline">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={HERO_WORDS[i]}
          initial={
            reduce ? false : { opacity: 0, y: "0.4em", filter: "blur(4px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduce
              ? undefined
              : { opacity: 0, y: "-0.4em", filter: "blur(4px)" }
          }
          transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          className="grad-blue inline-block"
        >
          {HERO_WORDS[i]}
        </motion.span>
      </AnimatePresence>{" "}
      <span className="grad-blue">back.</span>
    </span>
  );
}

function Hero() {
  const gate = useAnimGate();
  return (
    <section
      ref={gate.ref as React.RefObject<HTMLElement>}
      data-anim={gate.anim}
      data-landing-hero=""
      className="relative overflow-hidden pb-10 pt-10 md:pt-12"
    >
      <div
        className="orb"
        style={{
          width: 520,
          height: 520,
          left: "50%",
          marginLeft: -260,
          top: -160,
          background: "color-mix(in oklab, var(--acc) 26%, transparent)",
        }}
      />
      <div className="wrap relative">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <h1 className="hero-title text-balance font-bold tracking-tight">
              When your users act on-chain.
              <br />
              Now you can <RotatingWord />
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-5 max-w-xl text-[16.5px] leading-relaxed t-muted">
              With OnchainSuite, protocols can respond directly to user
              behavior, on-chain and off. Wallet activity, email opens, and
              clicks all become triggers for enriched, personalized user
              engagement at scale.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <HeroEmailForm />
          </Reveal>
        </div>

        <div className="relative mx-auto mt-10">
          <ProductWindow />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Networks marquee ───────────────────── */

const NETWORKS: { name: string; chain: ChainKey }[] = [
  { name: "Ethereum", chain: "ethereum" },
  { name: "Solana", chain: "solana" },
  { name: "Base", chain: "base" },
  { name: "Polygon", chain: "polygon" },
  { name: "Optimism", chain: "optimism" },
  { name: "Arbitrum", chain: "arbitrum" },
];

function Networks() {
  return (
    <section className="py-12">
      <Reveal className="wrap mb-6 text-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] t-muted2">
          Normalizing activity across the chains your users already use
        </p>
      </Reveal>
      <Marquee durationSec={62} className="mx-auto max-w-2xl mt-4">
        {[
          ...NETWORKS.map((n) => ({ ...n, k: `${n.name}-a` })),
          ...NETWORKS.map((n) => ({ ...n, k: `${n.name}-b` })),
        ].map((n) => (
          <div
            key={n.k}
            className="mx-2.5 inline-flex items-center gap-2 rounded-full border bg-[color:var(--surface)] px-4 py-2.5"
            style={{ borderColor: "var(--line)" }}
          >
            <ChainLogo chain={n.chain} size={18} />
            <span className="text-[13.5px] font-medium t-ink2">{n.name}</span>
          </div>
        ))}
      </Marquee>
      <p className="mt-6 text-center text-[12px] mono t-muted2">
        Supported networks · more added every release
      </p>
    </section>
  );
}

/* ───────────────────────── Trusted by ───────────────────────── */

const PARTNERS = ["Yaugahaus", "Vault777", "W3GM", "Surgence"];

function TrustedBy() {
  return (
    <section className="py-10">
      <Reveal className="wrap text-center">
        <p className="mono text-[11px] uppercase tracking-[0.18em] t-muted2">
          Trusted by
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-16">
          {PARTNERS.map((name) => (
            <span
              key={name}
              className="text-[18px] font-semibold tracking-tight t-muted transition-colors hover:text-[color:var(--ink)] sm:text-[20px]"
            >
              {name}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Problem ───────────────────────── */

function Problem() {
  const gate = useAnimGate();
  return (
    <section
      ref={gate.ref as React.RefObject<HTMLElement>}
      data-anim={gate.anim}
      className="py-20"
      id="problem"
    >
      <div className="wrap">
        <Heading
          eyebrow="The problem"
          title={
            <>
              Protocols watch their best users churn{" "}
              <span className="grad">and can&apos;t act on it.</span>
            </>
          }
          sub="A wallet deposits $50k. Another pulls liquidity at 3am. A third stakes, then unstakes. You can see all of it on-chain in real time. But today's marketing tools have no way to reach users based on what their wallets actually do."
        />
        <div className="mt-12 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
          {/* what you can see */}
          <Reveal>
            <div className="card h-full p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold t-ink">
                  <span className="live-dot" /> What you can see
                </span>
                <span
                  className="mono rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: "var(--ok-deep)",
                    background:
                      "color-mix(in oklab, var(--ok) 14%, transparent)",
                  }}
                >
                  on-chain · live
                </span>
              </div>
              <div className="space-y-2">
                {[
                  ["Deposited", "0x7f3a…c21 · Aave", "$50,000", "var(--ok)"],
                  [
                    "Pulled liquidity",
                    "0x44ab…e90 · 3:00am",
                    "$96,000",
                    "#D9930A",
                  ],
                  [
                    "Staked, then unstaked",
                    "0x3de1…77b · Lido",
                    "1,200 ETH",
                    "#C0405A",
                  ],
                ].map(([t, w, v, dot], i) => (
                  <motion.div
                    key={w}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: "var(--line-2)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: dot }}
                      />
                      <div>
                        <div className="text-[13px] font-medium t-ink2">
                          {t}
                        </div>
                        <div className="mono text-[11px] t-muted2">{w}</div>
                      </div>
                    </div>
                    <span className="mono text-[13px] font-semibold t-ink">
                      {v}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* then what? */}
          <Reveal delay={0.15}>
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="mono text-[10px] uppercase tracking-[0.16em] t-muted2">
                Then what?
              </span>
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  background: "color-mix(in oklab, #C0405A 12%, transparent)",
                  color: "#C0405A",
                }}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </motion.span>
              <span
                className="max-w-[7rem] text-center text-[11px] font-medium"
                style={{ color: "#C0405A" }}
              >
                no channel to reach them
              </span>
            </div>
          </Reveal>

          {/* what you can do today */}
          <Reveal delay={0.22}>
            <div
              className="h-full rounded-2xl border border-dashed p-5"
              style={{
                borderColor: "color-mix(in oklab, #C0405A 32%, var(--line))",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold t-ink">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: "var(--muted-2)" }}
                  />
                  What you can do today
                </span>
                <span
                  className="mono rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: "#C0405A",
                    background: "color-mix(in oklab, #C0405A 10%, transparent)",
                  }}
                >
                  email tool
                </span>
              </div>
              <div className="mono mb-2 text-[10px] uppercase tracking-[0.14em] t-muted2">
                New campaign
              </div>
              <div className="space-y-2 text-[12.5px]">
                <div
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--line-2)" }}
                >
                  <span className="t-muted2">To: </span>
                  <span className="font-semibold" style={{ color: "#C0405A" }}>
                    wallet has no email on file
                  </span>
                </div>
                <div
                  className="rounded-lg border px-3 py-2 t-muted2"
                  style={{ borderColor: "var(--line-2)" }}
                >
                  Subject…
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className="rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-white"
                  style={{ background: "var(--muted-2)", opacity: 0.7 }}
                >
                  Send
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium"
                  style={{ color: "#C0405A" }}
                >
                  <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  no way to reach this wallet
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-12 max-w-2xl text-center text-[15px] leading-relaxed t-muted">
            Retention won&apos;t keep every user. That&apos;s a fact. But Web3
            has never even had the chance to run a complete retention funnel. It
            never had the channel, and that&apos;s what{" "}
            <span className="font-semibold t-acc">OnchainSuite solves</span>.
            The retention edge Web2 companies have always had, finally on-chain.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────── Monitor / normalize ───────────────────── */

type MonitorRow = {
  p: string;
  chain: string;
  chainKey: string;
  logo: ChainKey;
  sig: string;
  wallet: string;
  value: string;
  ts: string;
};
type MonitorEvent = {
  label: string;
  action: string;
  defaultIndex: number;
  rows: MonitorRow[];
};

const MONITOR_EVENTS: MonitorEvent[] = [
  {
    label: "Add Liquidity",
    action: "add_liquidity",
    defaultIndex: 2,
    rows: [
      {
        p: "Uniswap v3",
        chain: "Ethereum",
        chainKey: "ethereum",
        logo: "ethereum",
        sig: "Mint(sender, owner, tickLower, tickUpper, amount…)",
        wallet: "0x7f3a…c21",
        value: "52,000",
        ts: "03:14:08",
      },
      {
        p: "Aerodrome",
        chain: "Base",
        chainKey: "base",
        logo: "base",
        sig: "AddLiquidity(tokenA, tokenB, amountADesired…)",
        wallet: "0x91cc…0fa",
        value: "4,300",
        ts: "09:22:51",
      },
      {
        p: "Orca",
        chain: "Solana",
        chainKey: "solana",
        logo: "solana",
        sig: "increaseLiquidity(liquidityAmount, tokenMaxA…)",
        wallet: "8sJk…9QzP",
        value: "12,400",
        ts: "03:14:19",
      },
      {
        p: "Curve",
        chain: "Polygon",
        chainKey: "polygon",
        logo: "polygon",
        sig: "add_liquidity(amounts[2], min_mint_amount)",
        wallet: "0x44ab…e90",
        value: "8,900",
        ts: "17:40:02",
      },
    ],
  },
  {
    label: "Mint",
    action: "mint",
    defaultIndex: 1,
    rows: [
      {
        p: "Zora",
        chain: "Ethereum",
        chainKey: "ethereum",
        logo: "ethereum",
        sig: "mint(recipient, quantity, comment)",
        wallet: "0x3de1…77b",
        value: "-",
        ts: "14:05:33",
      },
      {
        p: "Aerodrome",
        chain: "Base",
        chainKey: "base",
        logo: "base",
        sig: "mintWithRewards(to, qty, referrer…)",
        wallet: "0xa17d…5ce",
        value: "-",
        ts: "11:02:47",
      },
      {
        p: "Metaplex",
        chain: "Solana",
        chainKey: "solana",
        logo: "solana",
        sig: "mintV1(metadata, token, authority…)",
        wallet: "9pQs…4Lm2",
        value: "-",
        ts: "08:51:10",
      },
      {
        p: "Manifold",
        chain: "Polygon",
        chainKey: "polygon",
        logo: "polygon",
        sig: "mintBase(creator, to, tokenId)",
        wallet: "0xbe90…2a1",
        value: "-",
        ts: "19:33:21",
      },
    ],
  },
  {
    label: "Borrow",
    action: "borrow",
    defaultIndex: 0,
    rows: [
      {
        p: "Aave v3",
        chain: "Ethereum",
        chainKey: "ethereum",
        logo: "ethereum",
        sig: "Borrow(reserve, user, amount, rateMode…)",
        wallet: "0x7f3a…c21",
        value: "30,000",
        ts: "21:48:05",
      },
      {
        p: "Moonwell",
        chain: "Base",
        chainKey: "base",
        logo: "base",
        sig: "Borrow(borrower, borrowAmount, accountBorrows…)",
        wallet: "0x91cc…0fa",
        value: "12,500",
        ts: "06:14:39",
      },
      {
        p: "Kamino",
        chain: "Solana",
        chainKey: "solana",
        logo: "solana",
        sig: "borrowObligationLiquidity(liquidityAmount)",
        wallet: "8sJk…9QzP",
        value: "7,800",
        ts: "02:09:44",
      },
      {
        p: "Aave v3",
        chain: "Polygon",
        chainKey: "polygon",
        logo: "polygon",
        sig: "Borrow(reserve, user, amount, rateMode…)",
        wallet: "0x44ab…e90",
        value: "21,200",
        ts: "13:55:17",
      },
    ],
  },
  {
    label: "Stake",
    action: "stake",
    defaultIndex: 0,
    rows: [
      {
        p: "Lido",
        chain: "Ethereum",
        chainKey: "ethereum",
        logo: "ethereum",
        sig: "Submitted(sender, amount, referral)",
        wallet: "9pQs…4Lm2",
        value: "64,200",
        ts: "08:33:12",
      },
      {
        p: "Aerodrome",
        chain: "Base",
        chainKey: "base",
        logo: "base",
        sig: "deposit(amount) → Staked(account, amount)",
        wallet: "0xa17d…5ce",
        value: "5,400",
        ts: "10:18:06",
      },
      {
        p: "Marinade",
        chain: "Solana",
        chainKey: "solana",
        logo: "solana",
        sig: "deposit(lamports) → MintTo(msol)",
        wallet: "8sJk…9QzP",
        value: "18,900",
        ts: "04:47:29",
      },
      {
        p: "Stader",
        chain: "Polygon",
        chainKey: "polygon",
        logo: "polygon",
        sig: "swapMaticForMaticXViaInstantPool(_amount)",
        wallet: "0xbe90…2a1",
        value: "9,100",
        ts: "22:01:53",
      },
    ],
  },
];

const MONITOR_CHAINS: { name: string; chain: ChainKey }[] = [
  { name: "Ethereum", chain: "ethereum" },
  { name: "Solana", chain: "solana" },
  { name: "Base", chain: "base" },
  { name: "Polygon", chain: "polygon" },
];

function Monitor() {
  const reduce = useReducedMotion();
  const gate = useAnimGate();
  const [active, setActive] = useState(0);
  const ev = MONITOR_EVENTS[active];
  const [sel, setSel] = useState(ev.defaultIndex);
  const [paused, setPaused] = useState(false);
  const selectEvent = (i: number) => {
    setActive(i);
    setSel(MONITOR_EVENTS[i].defaultIndex);
  };
  const row = ev.rows[sel] ?? ev.rows[ev.defaultIndex];

  // auto-walk the highlight across protocols, then across events -
  // only while the section is on screen
  useEffect(() => {
    if (reduce || paused || !gate.visible) return;
    const t = window.setInterval(() => {
      setSel((prev) => {
        const rows = MONITOR_EVENTS[active].rows.length;
        if (prev + 1 >= rows) {
          setActive((a) => (a + 1) % MONITOR_EVENTS.length);
          return 0;
        }
        return prev + 1;
      });
    }, 2400);
    return () => window.clearInterval(t);
  }, [active, paused, reduce, gate.visible]);

  return (
    <section
      ref={gate.ref as React.RefObject<HTMLElement>}
      data-anim={gate.anim}
      className="py-20"
      id="monitor"
    >
      <div className="wrap">
        <Heading
          eyebrow="Monitor & normalize"
          title={
            <>
              Monitor on-chain behavior.{" "}
              <span className="grad">Act on it.</span>
            </>
          }
          sub="OnchainSuite normalizes wallet activity across Ethereum, Solana, Base, and Polygon into clean triggers and segments any marketer can use."
        />
        <Reveal delay={0.1}>
          <div
            className="card mx-auto mt-12 overflow-hidden p-5 md:p-7"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] t-muted2">
                <span className="live-dot" /> Normalizing on-chain events in
                real time
              </span>
              <span className="mono text-[13px] t-muted2">
                <span className="font-semibold t-ink">
                  <Counter to={1213435} />
                </span>{" "}
                events normalized today
              </span>
            </div>
            <div className="my-5 h-px" style={{ background: "var(--line)" }} />

            {/* event filter chips */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="mono mr-1 text-[11px] uppercase tracking-[0.14em] t-muted2">
                Event
              </span>
              {MONITOR_EVENTS.map((e, i) => {
                const on = i === active;
                return (
                  <button
                    key={e.label}
                    type="button"
                    onClick={() => selectEvent(i)}
                    className="rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all"
                    style={
                      on
                        ? {
                            background: "var(--acc)",
                            borderColor: "var(--acc)",
                            color: "#fff",
                          }
                        : {
                            background: "var(--surface)",
                            borderColor: "var(--line)",
                            color: "var(--muted)",
                          }
                    }
                  >
                    {e.label}
                  </button>
                );
              })}
            </div>

            <div className="mono mb-2.5 text-[10px] uppercase tracking-[0.16em] t-muted2">
              Raw events · per protocol
            </div>
            <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
              {/* left: protocol rows */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={ev.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-2"
                >
                  {ev.rows.map((r, i) => {
                    const on = i === sel;
                    return (
                      <motion.button
                        type="button"
                        onClick={() => setSel(i)}
                        key={r.p + r.chain}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="block w-full rounded-xl border px-3 py-2.5 text-left transition-colors"
                        style={
                          on
                            ? {
                                borderColor:
                                  "color-mix(in oklab, var(--acc) 50%, var(--line))",
                                background:
                                  "color-mix(in oklab, var(--acc) 5%, transparent)",
                              }
                            : { borderColor: "var(--line-2)" }
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-[12.5px] font-semibold t-ink2">
                            <ChainLogo chain={r.logo} size={15} />
                            {r.p}
                          </span>
                          <span className="mono text-[11px] t-muted2">
                            {r.chain}
                          </span>
                        </div>
                        <div className="mono mt-1 truncate text-[11px] t-muted2">
                          {r.sig}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {/* middle: arrow */}
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="mono hidden text-center text-[10px] uppercase leading-tight tracking-[0.14em] t-muted2 md:block">
                  Protocol
                  <br />
                  normalization
                </span>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "var(--acc-soft)", color: "var(--acc)" }}
                >
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              {/* right: normalized (derives from the selected protocol row) */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${ev.label}-${sel}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.26 }}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor:
                      "color-mix(in oklab, var(--acc) 30%, var(--line))",
                    background: "var(--acc-soft)",
                  }}
                >
                  <div className="mono mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] t-muted2">
                    <span>Normalized · one shape</span>
                    <span className="flex items-center gap-1 normal-case tracking-normal">
                      <ChainLogo chain={row.logo} size={13} />
                      {row.p}
                    </span>
                  </div>
                  <span
                    className="mono inline-block rounded-md px-2 py-1 text-[12px] font-semibold"
                    style={{
                      background:
                        "color-mix(in oklab, var(--ok) 16%, transparent)",
                      color: "var(--ok-deep)",
                    }}
                  >
                    event: {ev.action}
                  </span>
                  <div className="mt-3 space-y-1.5">
                    {[
                      ["wallet", row.wallet],
                      ["value_usd", row.value],
                      ["action", ev.action],
                      ["chain", row.chainKey],
                      ["ts", row.ts],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between gap-3 border-b pb-1.5 last:border-b-0"
                        style={{
                          borderColor:
                            "color-mix(in oklab, var(--acc) 12%, transparent)",
                        }}
                      >
                        <span className="mono text-[12px] t-muted">{k}</span>
                        <span className="mono text-[12px] font-medium t-ink">
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="my-5 h-px" style={{ background: "var(--line)" }} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono mr-1 text-[11px] uppercase tracking-[0.14em] t-muted2">
                Same shape across
              </span>
              {MONITOR_CHAINS.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium t-ink2"
                  style={{ borderColor: "var(--line)" }}
                >
                  <ChainLogo chain={c.chain} size={15} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────── Feature split (Automations + Intelligence) ───────── */

function FeatureSplit({
  id,
  eyebrow,
  title,
  body,
  points,
  visual,
  flip,
  docsHref,
}: {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  points: string[];
  visual: React.ReactNode;
  flip?: boolean;
  /** Docs section the "Learn more" link points to (defaults to the docs home). */
  docsHref?: string;
}) {
  const gate = useAnimGate();
  return (
    <section
      ref={gate.ref as React.RefObject<HTMLElement>}
      data-anim={gate.anim}
      className="py-20"
      id={id}
    >
      <div className="wrap grid items-center gap-12 lg:grid-cols-2">
        <Reveal className={flip ? "lg:order-2" : ""}>
          <span className="eyebrow">{eyebrow}</span>
          <h2
            className="mt-4 font-semibold tracking-tight t-ink"
            style={{
              fontSize: "clamp(1.8rem, 3.2vw, 2.5rem)",
              lineHeight: 1.12,
            }}
          >
            {title}
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed t-muted">{body}</p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "var(--ok)" }}
                >
                  <CheckIcon className="h-3 w-3" aria-hidden="true" />
                </span>
                <span className="text-[14.5px] t-ink2">{p}</span>
              </li>
            ))}
          </ul>
          <a
            href={docsHref ?? DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-1.5 text-[14px] font-semibold t-acc"
          >
            Learn more
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </Reveal>
        <Reveal delay={0.1} className={flip ? "lg:order-1" : ""}>
          {visual}
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Channels ───────────────────────── */

const CHANNELS = [
  {
    name: "In-app push",
    tag: "LIVE",
    tagC: "var(--ok-deep)",
    d: "Wallet address only. Reaches 100% of connected wallets via a drop-in SDK.",
  },
  {
    name: "Email",
    tag: "LIVE",
    tagC: "var(--ok-deep)",
    d: "Live today, on wallets that have linked an address privately via ZK.",
  },
  {
    name: "Telegram",
    tag: "ROADMAP",
    tagC: "var(--muted-2)",
    d: "A bot that posts to the protocol's group, on the roadmap.",
  },
  {
    name: "Discord",
    tag: "ROADMAP",
    tagC: "var(--muted-2)",
    d: "Channel posts and DMs to members, on the roadmap.",
  },
];

function Channels() {
  return (
    <section className="py-20">
      <div className="wrap">
        <Heading
          eyebrow="Channels"
          title={
            <>
              One trigger.{" "}
              <span className="grad">Every channel it can reach.</span>
            </>
          }
          sub="A single behavior reaches whichever channels are set up for each wallet, in-app push leads, with no DNS, warm-up, or extra identifier."
        />
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c) => (
            <StaggerItem key={c.name}>
              <div className="card h-full p-5 transition-transform duration-200 hover:-translate-y-1">
                <span
                  className="mono inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{
                    color: c.tagC,
                    background:
                      "color-mix(in oklab, currentColor 12%, transparent)",
                  }}
                >
                  {c.tag}
                </span>
                <div className="mt-3 text-[16px] font-semibold t-ink">
                  {c.name}
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed t-muted">
                  {c.d}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────────────────────── Why (table) ───────────────────────── */

const WHY_ROWS = [
  [
    "Identity resolution",
    "Manual wallet-to-email mapping",
    "Automatic, ZK-privacy bridge",
  ],
  [
    "On-chain analytics",
    "Dune queries + CSV export",
    "Real-time normalized events",
  ],
  [
    "Activation",
    "Generic, no on-chain triggers",
    "Behavior-triggered, multi-channel",
  ],
  ["Data flow", "Manual CSV stitching", "Unified real-time pipeline"],
  ["Time to first campaign", "Hours to days", "Minutes"],
];

function Why() {
  return (
    <section className="py-20" id="why">
      <div className="wrap">
        <Heading
          eyebrow="Why OnchainSuite"
          title={
            <>
              Replace the patchwork stack{" "}
              <span className="grad">with one loop.</span>
            </>
          }
          sub="Most Web3 teams stitch together email, auth, analytics, and CSV exports. It's slow and can't automate in real time. OnchainSuite replaces all of it."
        />
        <Reveal delay={0.1}>
          {/* phones: the 3-col grid scrolls inside the card instead of
              crushing each column - the page body never scrolls sideways */}
          <div className="card mx-auto mt-12 overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                <div
                  className="grid grid-cols-[1.2fr_1fr_1fr] border-b text-[12px] font-semibold uppercase tracking-wide"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="px-5 py-3 t-muted2">Capability</div>
                  <div className="px-5 py-3 t-muted2">Patchwork stack</div>
                  <div
                    className="px-5 py-3 t-acc"
                    style={{ background: "var(--acc-soft)" }}
                  >
                    OnchainSuite
                  </div>
                </div>
                {WHY_ROWS.map((r, i) => (
                  <motion.div
                    key={r[0]}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="grid grid-cols-[1.2fr_1fr_1fr] border-b text-[13.5px] last:border-b-0"
                    style={{ borderColor: "var(--line-2)" }}
                  >
                    <div className="px-5 py-4 font-medium t-ink2">{r[0]}</div>
                    <div className="px-5 py-4 t-muted">{r[1]}</div>
                    <div
                      className="flex items-center gap-2 px-5 py-4 font-medium t-ink"
                      style={{
                        background:
                          "color-mix(in oklab, var(--acc) 4%, transparent)",
                      }}
                    >
                      <CheckIcon
                        className="h-4 w-4 shrink-0 t-ok"
                        aria-hidden="true"
                      />
                      {r[2]}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Developer ───────────────────────── */

const DEV_TABS = [
  {
    id: "Install",
    code: "$ npm i @onchainsuite/sdk",
    copy: "npm i @onchainsuite/sdk",
  },
  {
    id: "Initialize",
    code: `import { OnchainSuite } from '@onchainsuite/sdk'

const ocs = OnchainSuite.init({ project: 'pk_live_…' })
// renders to 100% of connected wallets
ocs.connect(wallet.address)`,
    copy: `import { OnchainSuite } from '@onchainsuite/sdk'

const ocs = OnchainSuite.init({ project: 'pk_live_…' })
ocs.connect(wallet.address)`,
  },
  {
    id: "Send",
    code: `// fire an in-app push the moment a wallet acts
await ocs.push({
  wallet: '0x7f3a…c21',
  title: 'Your stake dropped',
  body: 'Top up to keep your rewards rate.',
})`,
    copy: `await ocs.push({
  wallet: '0x7f3a…c21',
  title: 'Your stake dropped',
  body: 'Top up to keep your rewards rate.',
})`,
  },
] as const;

function CodeLine({ line }: { line: string }) {
  if (line.startsWith("//")) {
    return <span style={{ color: "var(--muted-2)" }}>{line}</span>;
  }
  if (line.startsWith("$")) {
    return (
      <>
        <span style={{ color: "var(--muted-2)" }}>$ </span>
        <span style={{ color: "#16A34A" }}>{line.slice(2)}</span>
      </>
    );
  }
  return <span className="t-ink2">{line || " "}</span>;
}

function Developer() {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const active = DEV_TABS[tab];

  return (
    <section className="py-20" id="developer">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="eyebrow">Developer experience</span>
          <h2
            className="mt-4 font-semibold tracking-tight t-ink"
            style={{
              fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)",
              lineHeight: 1.1,
            }}
          >
            Drop in in-app push <span className="grad">in minutes.</span>
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed t-muted">
            A lightweight SDK your team adds to the dApp. It opens a socket,
            OnchainSuite pushes the payload, the SDK renders the toast, banner,
            or modal. No extra identifier needed.
          </p>
          <a
            href={`${DOCS_URL}/api/overview`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold t-acc"
          >
            Learn more
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="card overflow-hidden"
            style={{ boxShadow: "var(--shadow)" }}
          >
            {/* terminal top bar with tabs */}
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ borderColor: "var(--line)" }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: "#d7dde6" }}
                />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: "#d7dde6" }}
                />
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: "#d7dde6" }}
                />
              </span>
              <div className="flex items-center gap-1">
                {DEV_TABS.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTab(i);
                      setCopied(false);
                    }}
                    className="mono rounded-md px-2.5 py-1 text-[12.5px] transition-colors"
                    style={
                      tab === i
                        ? {
                            color: "var(--ink)",
                            fontWeight: 600,
                            background: "var(--acc-soft)",
                          }
                        : { color: "var(--muted)" }
                    }
                  >
                    {t.id}
                  </button>
                ))}
              </div>
              <span className="mono ml-auto hidden text-[11px] t-muted2 sm:inline">
                terminal
              </span>
            </div>

            {/* code body */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard?.writeText(active.copy).then(
                    () => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1400);
                    },
                    () => undefined
                  )
                }
                className="mono absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] t-muted transition-colors hover:t-ink"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface)",
                }}
              >
                {copied ? (
                  <CheckIcon className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ClipboardDocumentIcon
                    className="h-3 w-3"
                    aria-hidden="true"
                  />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              <AnimatePresence mode="wait">
                <motion.pre
                  key={active.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="mono min-h-[168px] overflow-x-auto p-5 text-[13px] leading-7"
                >
                  {active.code
                    .split("\n")
                    .map((text, i) => ({ id: `${active.id}-${i}`, text }))
                    .map((l) => (
                      <div key={l.id}>
                        <CodeLine line={l.text} />
                      </div>
                    ))}
                </motion.pre>
              </AnimatePresence>
            </div>

            {/* footer */}
            <div
              className="flex flex-wrap items-center gap-2 border-t px-4 py-3"
              style={{ borderColor: "var(--line)" }}
            >
              <span
                className="mono rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white"
                style={{ background: "#CB3837" }}
              >
                npm
              </span>
              <span className="mono text-[12.5px] t-ink2">
                @onchainsuite/sdk
              </span>
              <span
                className="mono rounded-full px-2 py-0.5 text-[10.5px] font-medium t-acc"
                style={{ background: "var(--acc-soft)" }}
              >
                early access
              </span>
              <span className="mono ml-auto text-[11px] t-muted2">
                ESM · ~30 kB · MIT
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Integrations ───────────────────────── */

function Integrations() {
  return (
    <section className="py-20" id="integrations">
      <div className="wrap">
        <Heading
          eyebrow="Integrations"
          title={
            <>
              Plug into the stack <span className="grad">you already run.</span>
            </>
          }
          sub="Wallets, chains, chat, and developer tools, all connected into one real-time pipeline."
        />
        <Stagger className="mx-auto mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {INTEGRATIONS.map(({ name, Logo }) => (
            <StaggerItem key={name}>
              <div className="card flex items-center gap-3 px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--acc)]">
                <span className="flex h-8 w-8 items-center justify-center">
                  <Logo size={28} />
                </span>
                <span className="text-[14px] font-medium t-ink2">{name}</span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────────────────────── Testimonials ───────────────────────── */

const QUOTES = [
  {
    q: "We forked a Play and shipped a win-back flow before lunch. The first-mile insight sold the whole team.",
    a: "Growth Lead",
    r: "DeFi protocol",
  },
  {
    q: "Finally a marketing stack that speaks wallets, not just emails.",
    a: "Founder",
    r: "Liquid staking",
  },
  {
    q: "The MCP queries feel like cheating, cohorts back in plain language.",
    a: "Head of Growth",
    r: "NFT marketplace",
  },
];

function Testimonials() {
  return (
    <section className="py-20">
      <div className="wrap">
        <Heading
          eyebrow="Who it's for"
          title={
            <>
              Built for teams who <span className="grad">feel the pain.</span>
            </>
          }
          sub="The first tool that actually does something when a wallet goes quiet, instead of just charting it."
        />
        <Stagger className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {QUOTES.map((t) => (
            <StaggerItem key={t.a}>
              <figure className="card flex h-full flex-col p-6">
                <SparklesIcon className="h-5 w-5 t-acc" aria-hidden="true" />
                <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed t-ink2">
                  “{t.q}”
                </blockquote>
                <figcaption
                  className="mt-4 border-t pt-4 text-[13px]"
                  style={{ borderColor: "var(--line-2)" }}
                >
                  <span className="font-semibold t-ink">{t.a}</span>
                  <span className="t-muted2"> · {t.r}</span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ───────────────────────── FAQ ───────────────────────── */

const FAQS = [
  {
    q: "Which chains do you support?",
    a: "Ethereum, Solana, Base, and Polygon today, with more on the way. Every chain is normalized into one event shape, so a stake on Lido and a stake on Marinade look identical to your rules and segments.",
  },
  {
    q: "How can you message a wallet with no personal data?",
    a: "In-app push needs only the wallet address, so it reaches 100% of connected wallets through a drop-in SDK, no email or extra identifier required. Email is available when a wallet has linked an address privately through our zero-knowledge identity bridge.",
  },
  {
    q: "How does identity resolution work?",
    a: "Wallet-to-channel mapping is automatic. Where a wallet has opted to link a personal channel, it happens through our zero-knowledge privacy bridge so you never stitch CSVs by hand and never hold data a wallet hasn't chosen to share.",
  },
  {
    q: "Do you ever move funds or write to the chain?",
    a: "No. OnchainSuite monitors on-chain activity read-only and is fully non-custodial. We normalize events and fire your messages; we never sign transactions or touch a wallet's assets.",
  },
  {
    q: "How fast can we go live?",
    a: "Drop the SDK into your dApp in minutes and in-app push is live. From there it's about ten minutes to your first real cohort insight, and you can build an automation that runs on its own right after.",
  },
  {
    q: "What does it cost?",
    a: "Usage-based, with no rigid tiers. You pay a small base fee plus the wallets you track and the email subscribers you reach, pricing starts low (around $45/mo for a small protocol) and scales with use. Early-access teams lock in founding rates.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-20" id="faq">
      <div className="wrap">
        <Heading eyebrow="FAQ" title="Questions, answered." />
        <div className="mx-auto mt-10 max-w-2xl space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.04}>
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
                    <span className="text-[15px] font-semibold t-ink">
                      {f.q}
                    </span>
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
                          {f.a}
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

/* ───────────────────────── CTA ───────────────────────── */

function Cta() {
  return (
    <section className="py-20">
      <div className="wrap">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-3xl border px-5 py-12 text-center sm:px-8 sm:py-16"
            style={{
              borderColor: "color-mix(in oklab, var(--acc) 18%, var(--line))",
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--acc) 12%, #ffffff) 0%, color-mix(in oklab, var(--acc) 5%, #ffffff) 55%, #ffffff 100%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 18% 12%, color-mix(in oklab, var(--acc) 22%, transparent), transparent 42%), radial-gradient(circle at 85% 85%, color-mix(in oklab, #2F94FF 20%, transparent), transparent 46%)",
              }}
            />
            <div className="relative mx-auto max-w-2xl">
              <h2
                className="font-semibold tracking-tight t-ink"
                style={{
                  fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)",
                  lineHeight: 1.1,
                }}
              >
                Start acting on what your users do{" "}
                <span className="grad-blue">on-chain.</span>
              </h2>
              <p className="mt-4 text-[16px] t-muted">
                Write your first rule today. It fires the moment a wallet acts,
                day or night, until you pause it.
              </p>
              <div className="mt-8 flex justify-center">
                <Link href={SIGNUP} className="btn btn-primary">
                  Get early access
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-5 text-[12.5px] t-muted2">
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

/* ───────────────────────── Page ───────────────────────── */

export function LandingV2() {
  return (
    <PageShell navCtaWatchesHero>
      <Hero />
      <Networks />
      <TrustedBy />
      <Problem />
      <Monitor />
      <FeatureSplit
        id="automations"
        eyebrow="Automations"
        docsHref={`${DOCS_URL}/automation/overview`}
        title={
          <>
            Automations that fire on{" "}
            <span className="grad">real behavior.</span>
          </>
        }
        body="Build a flow once. It runs on its own, firing the instant a wallet acts or a contact opens, clicks, or ignores your message, day or night, until you pause or edit it."
        points={[
          "Set it up once. It runs on its own until you pause it.",
          "Trigger on on-chain actions and email behavior, opens, clicks, even non-opens.",
          "One trigger sends to both in-app push and email.",
        ]}
        visual={
          <div className="card p-5">
            <AutomationsViz />
          </div>
        }
      />
      <FeatureSplit
        id="intelligence"
        eyebrow="Intelligence · MCP"
        flip
        docsHref={`${DOCS_URL}/intelligence/overview`}
        title={
          <>
            Ask your on-chain data <span className="grad">anything.</span>
          </>
        }
        body="The Intelligence layer pairs a SQL engine with an MCP integration, so you can query on-chain actions and email engagement in plain language and get cohorts back. No SQL required."
        points={[
          "The MCP runs the analysis over your normalized on-chain data.",
          "Get cohorts and segments back, ready to message.",
          "A SQL engine underneath for when your team wants the raw query.",
        ]}
        visual={<IntelligenceAskCard />}
      />
      <Channels />
      <Why />
      <Developer />
      <Integrations />
      <Testimonials />
      <Faq />
      <Cta />
    </PageShell>
  );
}

export default LandingV2;
