"use client";

import { useEffect, useRef } from "react";

type AutoGrowTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "ref"
> & {
  /** Minimum height in px before content forces it taller. */
  minHeight?: number;
  /** Cap the auto-grow; beyond this it scrolls. 0 = uncapped. */
  maxHeight?: number;
};

/**
 * Textarea that grows to fit its content so the full value is visible without
 * an inner scrollbar - used for the Properties "Message Body" field. Recomputes
 * on value change and on mount; caps at `maxHeight` (then scrolls) to avoid the
 * panel getting unusably tall.
 */
export function AutoGrowTextarea({
  value,
  minHeight = 76,
  maxHeight = 320,
  className = "",
  ...rest
}: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.max(minHeight, el.scrollHeight);
    const capped = maxHeight > 0 ? Math.min(next, maxHeight) : next;
    el.style.height = `${capped}px`;
    el.style.overflowY = maxHeight > 0 && next > maxHeight ? "auto" : "hidden";
  };

  useEffect(resize, [value, minHeight, maxHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onInput={resize}
      style={{ minHeight }}
      className={`scrollbar-sleek resize-none ${className}`}
      {...rest}
    />
  );
}

export default AutoGrowTextarea;
