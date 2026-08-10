"use client";

import {
  ArrowLeftIcon,
  ArrowUpIcon,
  BoltIcon,
  CheckIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { type ChainKey, ChainLogo } from "./chain-logos";
import { Tilt } from "./primitives";

/* ─────────────────────── typing helpers ─────────────────────── */

function useTypewriter(text: string, startDelay: number, active: boolean) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(reduce ? text : "");
  useEffect(() => {
    if (reduce || !active) {
      setOut(text);
      return;
    }
    setOut("");
    let i = 0;
    let raf = 0;
    let started = false;
    const startAt = performance.now() + startDelay * 1000;
    const speed = 16;
    let last = 0;
    const tick = (now: number) => {
      if (!started) {
        if (now >= startAt) {
          started = true;
          last = now;
        } else {
          raf = requestAnimationFrame(tick);
          return;
        }
      }
      if (now - last >= speed) {
        const steps = Math.max(1, Math.floor((now - last) / speed));
        i = Math.min(text.length, i + steps);
        setOut(text.slice(0, i));
        last = now;
      }
      if (i < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, startDelay, active, reduce]);
  return out;
}

function UserBubble({
  text,
  startDelay,
}: {
  text: string;
  startDelay: number;
}) {
  const typed = useTypewriter(text, startDelay, true);
  const done = typed.length === text.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: startDelay }}
      className="ml-auto max-w-[88%] rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-[13px] leading-relaxed t-ink2"
      style={{
        background: "color-mix(in oklab, var(--acc) 9%, var(--surface))",
        border: "1px solid var(--line-2)",
      }}
    >
      {typed}
      {!done ? <span className="ocs2-caret">▌</span> : null}
    </motion.div>
  );
}

function ChecklistItem({
  text,
  active,
  delay,
}: {
  text: string;
  active?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-2.5 text-[12.5px]"
    >
      {active ? (
        <span className="live-dot shrink-0" />
      ) : (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            delay: delay + 0.08,
            type: "spring",
            stiffness: 500,
            damping: 18,
          }}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "var(--ok)" }}
        >
          <CheckIcon
            className="h-2.5 w-2.5"
            aria-hidden="true"
            strokeWidth={3}
          />
        </motion.span>
      )}
      <span className={active ? "font-medium t-ink" : "t-muted"}>{text}</span>
    </motion.div>
  );
}

/* ─────────────────────── chat pane ─────────────────────── */

interface ChatSpec {
  prompts: string[];
  items: { text: string; active?: boolean }[];
  placeholder: string;
}

function ChatPane({ spec }: { spec: ChatSpec }) {
  const reduce = useReducedMotion();
  const gaps: number[] = [];
  let t = 0.25;
  for (const p of spec.prompts) {
    gaps.push(t);
    t += (reduce ? 0 : p.length * 0.016) + 0.4;
  }
  const listStart = reduce ? 0.15 : t + 0.15;

  return (
    <div className="flex h-full flex-col">
      <div className="mono mb-3 text-[10px] uppercase tracking-[0.18em] t-muted2">
        You → Agent
      </div>
      <div className="flex-1 space-y-2.5">
        {spec.prompts.map((p, i) => (
          <UserBubble key={p} text={p} startDelay={gaps[i]} />
        ))}
        <div className="space-y-2 pt-1.5">
          {spec.items.map((it, i) => (
            <ChecklistItem
              key={it.text}
              text={it.text}
              active={it.active}
              delay={listStart + i * (reduce ? 0.1 : 0.45)}
            />
          ))}
        </div>
      </div>
      <div
        className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}
      >
        <span className="flex-1 text-[12.5px] t-muted2">
          {spec.placeholder}
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--acc)" }}
        >
          <ArrowUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────── viz: Activity ─────────────────────── */

type FeedRow = {
  w: string;
  verb: string;
  detail: string;
  ctx: string;
  chain: ChainKey;
  tone: "ok" | "warn" | "bad";
};

const FEED_SOURCE: FeedRow[] = [
  {
    w: "0xa17d…5ce",
    verb: "minted",
    detail: "1 position",
    ctx: "Aerodrome · Base",
    chain: "aerodrome",
    tone: "ok",
  },
  {
    w: "8sJk…9QzP",
    verb: "swapped",
    detail: "$18,900",
    ctx: "Jupiter · Solana",
    chain: "jupiter",
    tone: "ok",
  },
  {
    w: "0x91cc…0fa",
    verb: "added liquidity",
    detail: "$4,300",
    ctx: "Aerodrome · Base",
    chain: "aerodrome",
    tone: "ok",
  },
  {
    w: "0x7f3a…c21",
    verb: "deposited",
    detail: "$52,000",
    ctx: "Aave · Ethereum",
    chain: "ethereum",
    tone: "ok",
  },
  {
    w: "0x44ab…e90",
    verb: "withdrew",
    detail: "$96,000",
    ctx: "Uniswap · Polygon",
    chain: "polygon",
    tone: "warn",
  },
  {
    w: "0x0c2f…113",
    verb: "went quiet",
    detail: "14 days",
    ctx: "idle",
    chain: "ethereum",
    tone: "bad",
  },
  {
    w: "0xbe90…2a1",
    verb: "voted",
    detail: "Proposal 42",
    ctx: "Governance · Ethereum",
    chain: "governance",
    tone: "ok",
  },
  {
    w: "9pQs…4Lm2",
    verb: "staked",
    detail: "320 SOL",
    ctx: "Jupiter · Solana",
    chain: "jupiter",
    tone: "ok",
  },
];

const TONE: Record<FeedRow["tone"], string> = {
  ok: "var(--ok)",
  warn: "#D9930A",
  bad: "#C0405A",
};

const VISIBLE_ROWS = 5;
type LiveRow = FeedRow & { id: number };

function FeedRowCard({ r, top }: { r: LiveRow; top: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 14, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex items-center gap-2.5 rounded-lg px-2 py-2"
      style={
        top
          ? { background: "color-mix(in oklab, var(--acc) 5%, transparent)" }
          : undefined
      }
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: TONE[r.tone] }}
      />
      <span className="mono text-[12px] t-ink2">{r.w}</span>
      <span className="text-[12.5px] t-muted">{r.verb}</span>
      <span className="mono ml-auto whitespace-nowrap text-[12.5px] font-semibold t-ink">
        {r.detail}
      </span>
      <span
        className="hidden items-center gap-1.5 pl-2 text-[11px] t-muted2 sm:flex"
        style={{ minWidth: 96 }}
      >
        <ChainLogo chain={r.chain} size={14} />
        <span className="truncate">{r.ctx}</span>
      </span>
    </motion.div>
  );
}

function ActivityViz() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(rootRef, { margin: "80px" });
  const idRef = useRef(VISIBLE_ROWS);
  const srcRef = useRef(VISIBLE_ROWS);
  const [rows, setRows] = useState<LiveRow[]>(() =>
    Array.from({ length: VISIBLE_ROWS }, (_, i) => ({
      ...FEED_SOURCE[i % FEED_SOURCE.length],
      id: i,
    }))
  );

  useEffect(() => {
    // feed only ticks while visible
    if (reduce || !inView) return;
    const t = window.setInterval(() => {
      setRows((prev) => {
        const next: LiveRow = {
          ...FEED_SOURCE[srcRef.current % FEED_SOURCE.length],
          id: idRef.current,
        };
        srcRef.current += 1;
        idRef.current += 1;
        return [next, ...prev].slice(0, VISIBLE_ROWS);
      });
    }, 2100);
    return () => window.clearInterval(t);
  }, [reduce, inView]);

  return (
    <div ref={rootRef} className="flex h-full flex-col">
      <div
        className="mb-3 flex items-center justify-between rounded-xl border px-3 py-2"
        style={{
          borderColor: "color-mix(in oklab, #C0405A 24%, var(--line))",
          background: "color-mix(in oklab, #C0405A 7%, transparent)",
        }}
      >
        <span
          className="inline-flex items-center gap-2 text-[12.5px] font-semibold"
          style={{ color: "#C0405A" }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "#C0405A" }}
          />
          Churn risk rising
        </span>
        <span className="mono text-[11px]" style={{ color: "#C0405A" }}>
          14 idle 14d+
        </span>
      </div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] t-muted2">
          <span className="live-dot" /> Live on-chain activity
        </span>
        <span className="mono text-[11px] t-muted2">4 chains</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <FeedRowCard key={r.id} r={r} top={i === 0} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────── viz: Automations ─────────────────────── */

const nodeMotion = (delay: number) => ({
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { delay, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as const },
});

function FiredBadge({ n }: { n: number }) {
  return (
    <span
      className="auto-beep mono inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        color: "var(--ok-deep)",
        background: "color-mix(in oklab, var(--ok) 14%, transparent)",
      }}
    >
      fired · {n}
    </span>
  );
}

export function AutomationsViz() {
  return (
    <div className="flex h-full flex-col">
      <motion.div {...nodeMotion(0)} className="mb-3 flex items-center gap-2">
        <span className="live-dot" />
        <span className="text-[13px] font-semibold t-ink">Churn Win-Back</span>
        <span
          className="mono rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            color: "var(--ok-deep)",
            background: "color-mix(in oklab, var(--ok) 14%, transparent)",
          }}
        >
          LIVE
        </span>
        <span className="mono ml-auto text-[10.5px] t-muted2">
          runs on its own
        </span>
      </motion.div>

      {/* trigger */}
      <motion.div
        {...nodeMotion(0.12)}
        className="rounded-xl border px-3.5 py-3"
        style={{
          borderColor: "color-mix(in oklab, var(--acc) 30%, var(--line))",
          background: "var(--acc-soft)",
        }}
      >
        <div className="mono text-[10px] uppercase tracking-[0.16em] t-acc">
          Trigger
        </div>
        <div className="mt-1 text-[13px] font-semibold t-ink">
          Stake dropped, and email ignored
        </div>
        <div className="mt-0.5 text-[11.5px] t-muted">
          staked &lt; 0.5 × peak · no open in 7d
        </div>
      </motion.div>

      {/* trigger → fire connector */}
      <div className="auto-conn mx-auto h-7 w-px">
        <span className="auto-dot auto-dot-main" />
      </div>

      {/* fire-instantly node */}
      <motion.div
        {...nodeMotion(0.22)}
        className="rounded-xl border px-3.5 py-2.5 text-center"
        style={{ borderColor: "var(--line-2)" }}
      >
        <span className="mono text-[12px] t-muted">
          Fire instantly · then split by channel
        </span>
      </motion.div>

      {/* split connectors */}
      <div className="relative mx-auto h-4 w-px auto-conn" />
      <div
        className="relative mx-auto h-px"
        style={{ width: "60%", background: "var(--line)" }}
      />
      <div className="relative mx-auto mb-2 grid w-[60%] grid-cols-2">
        <div className="auto-conn mx-auto h-4 w-px">
          <span className="auto-dot auto-dot-branch" />
        </div>
        <div className="auto-conn mx-auto h-4 w-px">
          <span className="auto-dot auto-dot-branch" />
        </div>
      </div>

      {/* branch nodes */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          {...nodeMotion(0.34)}
          className="rounded-xl border px-3 py-2.5"
          style={{
            borderColor: "color-mix(in oklab, var(--acc) 35%, var(--line))",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold t-ink">
              <span
                className="inline-block h-3.5 w-3.5 rounded-[4px]"
                style={{
                  background:
                    "color-mix(in oklab, var(--acc) 35%, var(--surface))",
                }}
              />
              In-app push
            </span>
            <FiredBadge n={3} />
          </div>
          <div className="mt-1 text-[11.5px] t-muted">
            “Your stake dropped. Top up?”
          </div>
        </motion.div>
        <motion.div
          {...nodeMotion(0.44)}
          className="rounded-xl border px-3 py-2.5"
          style={{ borderColor: "var(--line-2)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold t-ink">
              <span
                className="inline-block h-3.5 w-3.5 rounded-[4px]"
                style={{
                  background:
                    "color-mix(in oklab, var(--acc) 18%, var(--surface))",
                }}
              />
              Email
            </span>
            <FiredBadge n={2} />
          </div>
          <div className="mt-1 text-[11.5px] t-muted">
            Top-up incentive offer
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const INTEL_QUESTION =
  "Which wallets deposited over $10k last month but haven't returned?";

/* Intelligence card for the marketing feature section - a self-driving loop:
   type the question → reveal the full animated MCP result (skeleton → bar
   chart → rows → buttons) → hold → clear → retype. Loops while in view. */
export function IntelligenceAskCard() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState("");
  const [showViz, setShowViz] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setTyped(INTEL_QUESTION);
      setShowViz(true);
      return;
    }
    let cancelled = false;
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) =>
      timers.push(window.setTimeout(fn, ms));

    const run = () => {
      if (cancelled) return;
      setTyped("");
      setShowViz(false);
      setRunId((r) => r + 1);
      // type the question
      let i = 0;
      const typeStep = () => {
        if (cancelled) return;
        i += 1;
        setTyped(INTEL_QUESTION.slice(0, i));
        if (i < INTEL_QUESTION.length) at(typeStep, 30);
        else {
          at(() => !cancelled && setShowViz(true), 500); // reveal graph
          at(run, 9500); // hold, then restart the loop
        }
      };
      at(typeStep, 450);
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [inView, reduce]);

  const typingDone = typed.length === INTEL_QUESTION.length;

  return (
    <div ref={ref} className="card flex flex-col gap-3 p-4 md:p-5">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-5 w-5 rounded-[6px]"
          style={{
            background: "color-mix(in oklab, var(--acc) 35%, var(--surface))",
          }}
        />
        <span className="text-[14px] font-semibold t-ink">Intelligence</span>
        <span className="mono ml-auto text-[11px] t-muted2">
          MCP · natural language
        </span>
      </div>
      <div
        className="rounded-xl border px-3.5 py-3"
        style={{ borderColor: "var(--line-2)" }}
      >
        <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.16em] t-muted2">
          Ask your on-chain data
        </div>
        <div className="text-[14px] leading-relaxed t-ink">
          {typed}
          {!typingDone ? <span className="ocs2-caret">▌</span> : null}
        </div>
      </div>
      <div
        className="min-h-[318px] rounded-2xl border p-4"
        style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}
      >
        <AnimatePresence mode="wait">
          {showViz ? (
            <motion.div
              key={runId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <IntelligenceViz />
            </motion.div>
          ) : (
            <motion.div
              key="thinking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[286px] items-center justify-center"
            >
              <span className="mono inline-flex items-center gap-2 text-[12px] t-muted2">
                <CpuChipIcon className="h-4 w-4 t-acc" aria-hidden="true" />
                {typingDone ? "Running MCP…" : "Waiting for your question…"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────── viz: Intelligence ─────────────────────── */

type IntelView = "result" | "automation" | "segments";

const CHART = [
  { id: "w1", v: 0.52 },
  { id: "w2", v: 0.8 },
  { id: "w3", v: 0.46 },
  { id: "w4", v: 0.95 },
  { id: "w5", v: 1.0 },
  { id: "w6", v: 0.6 },
  { id: "w7", v: 0.36 },
];

function CohortChart() {
  return (
    <div className="flex h-[68px] items-end gap-2">
      {CHART.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ height: 4, opacity: 0.5 }}
          animate={{ height: `${b.v * 100}%`, opacity: 1 }}
          transition={{
            delay: i * 0.06,
            duration: 0.55,
            ease: [0.2, 0.7, 0.2, 1],
          }}
          className="flex-1 rounded-[5px]"
          style={{ minHeight: 6, background: "var(--acc)" }}
        />
      ))}
    </div>
  );
}

function CohortSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex h-[68px] items-end gap-2">
        {CHART.map((b) => (
          <div
            key={b.id}
            className="skel flex-1"
            style={{ height: `${b.v * 100}%`, minHeight: 6 }}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {["r1", "r2", "r3"].map((k) => (
          <div key={k} className="skel h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

const RESULT_ROWS = [
  ["0x7f3a…c21", "$52,000", "31d ago"],
  ["0x44ab…e90", "$96,000", "28d ago"],
  ["8sJk…9QzP", "$18,900", "34d ago"],
];

const AUTOMATION_ITEMS = [
  { text: "Segment locked · 87 wallets" },
  { text: "Trigger set · deposited >$10k, no return" },
  { text: "In-app push drafted · “We saved your spot”" },
  { text: "Email drafted · win-back incentive" },
  { text: "Automation live", active: true },
];

const SAVED_SEGMENTS = [
  {
    name: "Whales · >$10k, no return",
    n: "87",
    when: "just now",
    badge: "NEW",
  },
  { name: "Churn risk · idle 14d+", n: "1,240", when: "2h ago" },
  { name: "Active LPs · added liquidity 7d", n: "312", when: "yesterday" },
  { name: "Stakers · stake < 0.5× peak", n: "540", when: "3d ago" },
  { name: "First deposits · this week", n: "96", when: "5d ago" },
];

function BackBar({
  title,
  right,
  onBack,
}: {
  title: string;
  right: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium t-muted transition-colors hover:t-ink"
        style={{ borderColor: "var(--line)" }}
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
        Back
      </button>
      <span className="text-[13px] font-semibold t-ink">{title}</span>
      <span className="ml-auto text-[11px] t-muted2">{right}</span>
    </div>
  );
}

export function IntelligenceViz() {
  const reduce = useReducedMotion();
  const [view, setView] = useState<IntelView>("result");
  const [loaded, setLoaded] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    setLoaded(false);
    const t = window.setTimeout(() => setLoaded(true), 950);
    return () => window.clearTimeout(t);
  }, [reduce]);

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        {view === "result" ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            className="flex h-full flex-col"
          >
            <div className="mb-2.5 flex items-center gap-2">
              <CpuChipIcon className="h-4 w-4 t-acc" aria-hidden="true" />
              <span className="text-[13px] font-semibold t-ink">
                Intelligence
              </span>
              <span className="chip">MCP</span>
              <span className="ml-auto text-[12px] t-muted">
                <span className="font-semibold t-acc">87</span> wallets
              </span>
            </div>
            <div className="mono mb-2 text-[10px] uppercase tracking-[0.14em] t-muted2">
              Result · MCP over normalized on-chain data
            </div>
            {!loaded ? (
              <CohortSkeleton />
            ) : (
              <>
                <CohortChart />
                <div className="mt-2.5 flex-1 space-y-1.5">
                  {RESULT_ROWS.map(([w, v, ago], i) => (
                    <motion.div
                      key={w}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                      style={{ borderColor: "var(--line-2)" }}
                    >
                      <span className="mono text-[12px] t-ink2">{w}</span>
                      <span className="mono text-[12.5px] font-semibold t-ink">
                        {v}
                      </span>
                      <span className="text-[11px] t-muted2">{ago}</span>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setView("automation")}
                className="btn btn-primary w-full !py-2.5 !text-[13px]"
              >
                <BoltIcon className="h-4 w-4" aria-hidden="true" />
                Create automation
              </button>
              <button
                type="button"
                onClick={() => setView("segments")}
                className="btn btn-ghost w-full !py-2.5 !text-[13px]"
              >
                Save segment
              </button>
            </div>
          </motion.div>
        ) : null}

        {view === "automation" ? (
          <motion.div
            key="automation"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            className="flex h-full flex-col"
          >
            <BackBar
              title="Win-Back automation"
              right="LIVE"
              onBack={() => setView("result")}
            />
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{
                borderColor: "color-mix(in oklab, var(--acc) 30%, var(--line))",
                background: "var(--acc-soft)",
              }}
            >
              <div className="mono text-[10px] uppercase tracking-[0.16em] t-acc">
                Trigger · from your query
              </div>
              <div className="mt-1 text-[12.5px] font-medium t-ink">
                Deposited &gt;$10k last month, no return tx since
              </div>
              <div className="mt-0.5 text-[11px] t-muted2">
                Audience · 87 wallets
              </div>
            </div>
            <div className="mt-3 flex-1 space-y-2">
              {AUTOMATION_ITEMS.map((it, i) => (
                <ChecklistItem
                  key={it.text}
                  text={it.text}
                  active={it.active}
                  delay={0.1 + i * 0.16}
                />
              ))}
            </div>
          </motion.div>
        ) : null}

        {view === "segments" ? (
          <motion.div
            key="segments"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.28 }}
            className="flex h-full flex-col"
          >
            <BackBar
              title="Saved segments"
              right="5 total"
              onBack={() => setView("result")}
            />
            <div className="flex-1 space-y-2">
              {SAVED_SEGMENTS.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
                  style={{ borderColor: "var(--line-2)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium t-ink2">
                        {s.name}
                      </span>
                      {s.badge ? (
                        <span
                          className="mono rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                          style={{ background: "var(--acc)" }}
                        >
                          {s.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] t-muted2">{s.when}</div>
                  </div>
                  <span className="mono text-[13px] font-semibold t-ink">
                    {s.n}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── tab specs ─────────────────────── */

const CHAT: Record<TabId, ChatSpec> = {
  activity: {
    prompts: [
      "Send an email campaign to the segment with churn risk rising over 8%.",
      "Only include users from the last campaign who opened and clicked our email, and who made a deposit on-chain.",
    ],
    items: [
      { text: "Segment built · churn ↑ >8% · 1,240" },
      { text: "Filtered to openers + clickers · 312" },
      { text: "Matched on-chain action: deposited · 142" },
      { text: "Campaign drafted · ready to review", active: true },
    ],
    placeholder: "Refine the audience…",
  },
  automations: {
    prompts: [
      "When a wallet's stake falls below half its peak, win it back.",
      "Send an in-app push right away, then an email with a top-up incentive.",
    ],
    items: [
      { text: "Trigger set · stake < 0.5 × peak" },
      { text: "Channels · in-app push + email" },
      { text: "Copy drafted for both" },
      { text: "Automation live", active: true },
    ],
    placeholder: "Add a delay or branch…",
  },
  intelligence: {
    prompts: [
      "Which wallets deposited over $10k last month but haven't returned?",
    ],
    items: [
      { text: "Parsed your question via MCP" },
      { text: "Queried normalized on-chain data" },
      { text: "Cohort built · 87 wallets" },
      { text: "Ready to message or save as segment", active: true },
    ],
    placeholder: "Ask a follow-up…",
  },
};

const TABS = [
  { id: "activity", label: "Activity" },
  { id: "automations", label: "Automations" },
  { id: "intelligence", label: "Intelligence" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const ORDER: TabId[] = ["activity", "automations", "intelligence"];
const DWELL = 9000; // ms onscreen per tab (lets every pane animation play)

/* ─────────────────────── product window ─────────────────────── */

export function ProductWindow() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(rootRef, { margin: "80px" });
  const [tab, setTab] = useState<TabId>("activity");
  const [paused, setPaused] = useState(false);
  // hovering pauses by intent; offscreen pauses for free
  const halted = paused || !inView;

  // The time-line below the tabs is a pure-CSS animation (smooth linear fill
  // over DWELL). When it finishes it advances to the next tab; changing tabs
  // remounts the fill (key={tab}) so it restarts cleanly for each screen.
  const advance = () =>
    setTab((cur) => ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length]);
  const selectTab = (id: TabId) => setTab(id);

  return (
    <Tilt max={2.5} className="relative w-full">
      <motion.div
        ref={rootRef}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="card relative overflow-hidden"
        style={{ borderRadius: 18, boxShadow: "var(--shadow)" }}
      >
        <div className="sheen" />
        {/* top bar: tabs (left) + url (right) */}
        <div className="relative flex items-center gap-1 px-3.5 pr-4 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {TABS.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTab(t.id)}
                  className="relative shrink-0 px-2.5 pb-2.5 pt-3.5 text-[14px] font-semibold transition-colors sm:px-3.5 sm:text-[15px]"
                  style={{ color: isActive ? "var(--ink)" : "var(--muted)" }}
                >
                  {t.label}
                  {isActive ? (
                    <motion.span
                      layoutId="ocs2-tab-active"
                      className="absolute inset-x-2.5 bottom-1 h-[2.5px] rounded-full sm:inset-x-3"
                      style={{ background: "var(--acc)" }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <span className="ml-auto hidden items-center gap-1.5 text-[11px] t-muted2 sm:inline-flex">
            <span className="live-dot" />
            <span className="mono">app.onchainsuite.com</span>
          </span>
        </div>
        {/* gap, then a full-width time-line track that fills end-to-end over
            the dwell, then advances to the next tab */}
        <div
          className="mt-2 h-[3px] w-full overflow-hidden"
          style={{ background: "var(--line)" }}
        >
          {reduce ? (
            <span
              className="block h-full"
              style={{
                width: "100%",
                background:
                  "linear-gradient(90deg, color-mix(in oklab, var(--acc) 35%, transparent), var(--acc))",
              }}
            />
          ) : (
            <span
              key={tab}
              onAnimationEnd={advance}
              className={`ocs2-timeline pointer-events-none ${halted ? "is-paused" : ""}`}
              style={{ animationDuration: `${DWELL}ms` }}
            />
          )}
        </div>

        {/* body: two panes, equal height */}
        <div className="p-3 md:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="grid gap-3 md:grid-cols-2"
            >
              <div
                className="flex min-h-[330px] flex-col rounded-2xl border p-4"
                style={{
                  borderColor: "var(--line-2)",
                  background:
                    "color-mix(in oklab, var(--paper) 60%, var(--surface))",
                }}
              >
                <ChatPane spec={CHAT[tab]} />
              </div>
              <div
                className="flex min-h-[330px] flex-col rounded-2xl border p-4"
                style={{
                  borderColor: "var(--line-2)",
                  background: "var(--surface)",
                }}
              >
                {tab === "activity" ? <ActivityViz /> : null}
                {tab === "automations" ? <AutomationsViz /> : null}
                {tab === "intelligence" ? <IntelligenceViz /> : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </Tilt>
  );
}

export default ProductWindow;
