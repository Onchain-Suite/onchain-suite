"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type McpTypingActivity = {
  id: string;
  label: string;
  detail?: string;
};

const GLYPHS = "01<>{}#$&MCPCHAIN0x◇◆";
const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

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

/**
 * Compact, in-thread "assistant is thinking" bubble for the MCP chat.
 * Shows a small matrix shimmer, animated dots, and the agent's latest
 * reasoning step - sized like a chat message, not a full panel.
 */
export function McpTypingIndicator({
  activity,
  recovering,
}: {
  activity: McpTypingActivity[];
  recovering?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [row, setRow] = useState<string>(() =>
    Array.from({ length: 18 }, randomGlyph).join("")
  );
  const latest = activity[activity.length - 1];
  const elapsedRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const glyphTimer = window.setInterval(() => {
      setRow(Array.from({ length: 18 }, randomGlyph).join(""));
    }, 120);
    const tick = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => {
      window.clearInterval(glyphTimer);
      window.clearInterval(tick);
    };
  }, [reduced]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
      role="status"
      aria-live="polite"
      aria-label="MCP agent is thinking"
    >
      <div className="flex max-w-[88%] items-end gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary">
          AI
        </div>
        <div className="rounded-[22px_22px_22px_8px] border border-border bg-card px-4 py-3 shadow-[0_18px_50px_-30px_rgba(45,102,255,0.6)]">
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

          {/* matrix shimmer */}
          <div className="mt-2 overflow-hidden rounded-md border border-primary/15 bg-muted/60 px-2 py-1">
            <div
              className={`truncate font-mono text-[10px] tracking-[0.12em] text-primary/75 ${
                reduced ? "" : "ocs-anim-hash-flicker"
              }`}
            >
              {row}
            </div>
          </div>

          {latest ? (
            <p className="mt-2 max-w-[420px] text-xs leading-5 text-muted-foreground">
              {latest.detail ?? latest.label}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default McpTypingIndicator;
