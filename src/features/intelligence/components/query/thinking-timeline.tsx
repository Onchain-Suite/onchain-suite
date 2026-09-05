"use client";

import {
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { ThinkingOrb } from "./thinking-orb";

export type ThinkingTone = "default" | "success" | "warning" | "error";

/**
 * The kind of reasoning step, surfaced as a small badge so the reader can see
 * *what type* of work each line is (planning vs. loading context vs. running a
 * tool vs. writing) without parsing the prose. Derived from the stream event
 * type in `toStreamActivityEntry`; `KIND_LABEL` maps each to its badge text.
 */
export type ThinkingKind =
  | "plan"
  | "context"
  | "tools"
  | "tool"
  | "decision"
  | "adjust"
  | "clarify"
  | "writing"
  | "done"
  | "error"
  | "update";

const KIND_LABEL: Record<ThinkingKind, string> = {
  plan: "Plan",
  context: "Context",
  tools: "Tools",
  tool: "Tool",
  decision: "Decision",
  adjust: "Adjust",
  clarify: "Clarify",
  writing: "Writing",
  done: "Done",
  error: "Error",
  update: "Update",
};

/**
 * One entry in the agent's thought process. Mirrors the live `StreamActivityEntry`
 * (tool path selected -> tool running -> tool returned -> composing -> answer) as
 * well as the persisted post-run `toolSteps`, so the same timeline renders both
 * the in-flight "Thinking" bubble and a completed message's collapsible trace.
 */
export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
  tone?: ThinkingTone;
  /** Category of work, rendered as a badge next to the label. */
  kind?: ThinkingKind;
  /** Data sources this step drew on, rendered as small pills (e.g. On-chain, CRM). */
  sources?: string[];
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
};

/** Small source pill, e.g. "On-chain" / "CRM" / "Memory". */
function SourceChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

/** The marker in a step's left rail: an orb for the active step, a status glyph
 *  for finished ones, a quiet dot otherwise. */
function StepMarker({
  tone,
  active,
  reduced,
}: {
  tone: ThinkingTone;
  active: boolean;
  reduced: boolean;
}) {
  if (active) return <ThinkingOrb size={18} active={!reduced} />;
  switch (tone) {
    case "success":
      return (
        <CheckCircleIcon
          className="h-4 w-4 text-emerald-500"
          aria-hidden="true"
        />
      );
    case "warning":
      return (
        <ExclamationTriangleIcon
          className="h-4 w-4 text-amber-500"
          aria-hidden="true"
        />
      );
    case "error":
      return (
        <XCircleIcon className="h-4 w-4 text-destructive" aria-hidden="true" />
      );
    default:
      return (
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
          aria-hidden="true"
        />
      );
  }
}

/**
 * Vertical connected timeline of steps. When `active`, the last step carries the
 * live orb and its detail keeps its full presence; earlier, settled steps fade
 * back so the eye rests on what the agent is doing *now*. With `animateEntrance`
 * each row and its detail fade in as they stream, so the thought process is
 * revealed gradually rather than all at once.
 */
function TimelineRows({
  steps,
  active = false,
  animateEntrance = false,
  reduced = false,
}: {
  steps: ThinkingStep[];
  active?: boolean;
  animateEntrance?: boolean;
  reduced?: boolean;
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const live = active && isLast;
        const settled = active && !isLast;
        return (
          <li
            key={step.id}
            className={cn(
              "flex gap-3",
              animateEntrance &&
                "animate-in fade-in slide-in-from-bottom-1 duration-300"
            )}
          >
            <div className="flex flex-col items-center pt-0.5">
              <span className="flex h-[18px] w-[18px] items-center justify-center">
                <StepMarker
                  tone={step.tone ?? "default"}
                  active={live}
                  reduced={reduced}
                />
              </span>
              {!isLast ? (
                <span
                  className="mt-1 w-px flex-1 bg-gradient-to-b from-border to-transparent"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 pb-1 transition-opacity duration-500",
                settled && "opacity-55"
              )}
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium leading-6">
                <span
                  className={cn(
                    "min-w-0",
                    live ? "text-foreground" : "text-foreground/85"
                  )}
                >
                  {step.label}
                  {live ? <span className="opacity-70">...</span> : null}
                </span>
                {step.kind ? (
                  <span className="shrink-0 rounded-full border border-border bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {KIND_LABEL[step.kind]}
                  </span>
                ) : null}
              </p>
              {step.detail ? (
                <p
                  className={cn(
                    "mt-1 text-[13px] leading-6 text-muted-foreground/80",
                    animateEntrance && "animate-in fade-in duration-700"
                  )}
                >
                  {step.detail}
                </p>
              ) : null}
              {step.sources && step.sources.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {step.sources.map((s) => (
                    <SourceChip key={s} label={s} />
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * In-thread "assistant is thinking" surface showing the live thought process as
 * a gradually revealed timeline: an animated orb leads the header, each reasoning
 * step streams in with its sources, and a trailing "waiting" line stands in until
 * the agent starts writing. Once answer tokens arrive it flips to a live,
 * typing-out answer preview.
 */
export function ThinkingTimeline({
  steps,
  recovering,
  answerPreview,
}: {
  steps: ThinkingStep[];
  recovering?: boolean;
  /**
   * Answer text streamed so far (SSE `answer_token`). When non-empty the surface
   * flips from "Thinking" to "Writing answer" and types the text out with a
   * caret, so the answer visibly forms before the durable query resolves.
   */
  answerPreview?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  const writing = (answerPreview?.length ?? 0) > 0;
  const heading = recovering
    ? "Recovering route"
    : writing
      ? "Writing answer"
      : "Thinking";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
      role="status"
      aria-live="polite"
      aria-label={
        writing
          ? "On-chain agent is writing the answer"
          : "On-chain agent is thinking"
      }
    >
      <div className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-card/60 px-4 py-3.5 backdrop-blur-sm">
        {/* Header: the live orb leads, like the reference design. */}
        <div className="flex items-center gap-2.5">
          <ThinkingOrb size={26} active={!reduced && !writing} />
          <span className="text-base font-medium text-foreground">
            {heading}
            {!writing ? (
              <span className="text-muted-foreground">...</span>
            ) : null}
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
            {elapsed}s
          </span>
        </div>

        {steps.length > 0 ? (
          <div className="mt-4 max-h-72 overflow-y-auto pr-1">
            <TimelineRows
              steps={steps}
              active={!writing}
              animateEntrance={!reduced}
              reduced={reduced}
            />
          </div>
        ) : null}

        {/* Trailing "waiting" line until the first answer token arrives. */}
        {!writing ? (
          <div className="mt-3 flex items-center gap-2.5 pl-[3px] text-sm text-muted-foreground">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="ocs-anim-think-pulse inline-block h-1 w-1 rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${d * 0.18}s` }}
                />
              ))}
            </span>
            <span>Waiting the agent to write response</span>
          </div>
        ) : null}

        {writing ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
            {answerPreview}
            <span
              className="ml-0.5 inline-block h-4 w-[2px] -translate-y-[1px] animate-pulse bg-primary align-middle"
              aria-hidden="true"
            />
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}

/**
 * Collapsed, post-run trace of the agent's thought process for a completed
 * message. Renders the same timeline, disclosed on demand so answers stay clean.
 */
export function ThoughtProcess({ steps }: { steps: ThinkingStep[] }) {
  const [open, setOpen] = useState(false);
  if (steps.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Thought process · {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
        <ChevronDownIcon
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div className="px-3 pb-3">
          <TimelineRows steps={steps} />
        </div>
      ) : null}
    </div>
  );
}

export default ThinkingTimeline;
