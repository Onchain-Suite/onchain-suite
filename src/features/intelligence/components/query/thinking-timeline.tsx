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

export type ThinkingTone = "default" | "success" | "warning" | "error";

/**
 * One entry in the agent's thought process. Mirrors the live `StreamActivityEntry`
 * (tool path selected → tool running → tool returned → composing → answer) as
 * well as the persisted post-run `toolSteps`, so the same timeline renders both
 * the in-flight "Thinking" bubble and a completed message's collapsible trace.
 */
export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
  tone?: ThinkingTone;
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

function StepIcon({
  tone,
  spinning,
}: {
  tone: ThinkingTone;
  spinning: boolean;
}) {
  if (spinning) {
    return (
      <span
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
        aria-hidden="true"
      />
    );
  }
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
          className="h-2 w-2 rounded-full bg-primary/70"
          aria-hidden="true"
        />
      );
  }
}

/** Vertical connected timeline of steps. When `active`, the last step spins. */
function TimelineRows({
  steps,
  active = false,
}: {
  steps: ThinkingStep[];
  active?: boolean;
}) {
  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const spinning = active && isLast;
        return (
          <li key={step.id} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span className="flex h-5 w-5 items-center justify-center">
                <StepIcon tone={step.tone ?? "default"} spinning={spinning} />
              </span>
              {!isLast ? (
                <span
                  className="mt-0.5 w-px flex-1 bg-border"
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p
                className={cn(
                  "text-xs font-medium leading-5",
                  spinning ? "text-foreground" : "text-foreground/90"
                )}
              >
                {step.label}
              </p>
              {step.detail ? (
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {step.detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * In-thread "assistant is thinking" bubble showing the live thought process as a
 * status-aware timeline (spinner on the active step, ✓/⚠/✕ on finished ones) plus
 * an elapsed-time counter. Sized like a chat message.
 */
export function ThinkingTimeline({
  steps,
  recovering,
}: {
  steps: ThinkingStep[];
  recovering?: boolean;
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

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
      role="status"
      aria-live="polite"
      aria-label="MCP agent is thinking"
    >
      <div className="flex w-full max-w-[88%] gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
          AI
        </div>
        <div className="min-w-0 flex-1 rounded-[22px_22px_22px_8px] border border-border bg-card px-4 py-3 shadow-[0_18px_50px_-30px_rgba(45,102,255,0.6)]">
          <div className="flex items-center gap-2">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="ocs-anim-think-pulse inline-block h-1.5 w-1.5 rounded-full bg-primary"
                  style={{ animationDelay: `${d * 0.18}s` }}
                />
              ))}
            </span>
            <span className="text-sm font-medium text-foreground">
              {recovering ? "Recovering route" : "Thinking"}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {elapsed}s
            </span>
          </div>

          {steps.length > 0 ? (
            <div className="mt-3 max-h-60 overflow-y-auto pr-1">
              <TimelineRows steps={steps} active />
            </div>
          ) : null}
        </div>
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
