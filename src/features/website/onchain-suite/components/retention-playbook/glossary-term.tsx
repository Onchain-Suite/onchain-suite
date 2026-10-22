"use client";

import {
  type CSSProperties,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const GAP = 8;
const EDGE = 12;
const CLOSE_DELAY_MS = 120;

/**
 * A glossary term with its definition. The definition is always the term's
 * accessible description (aria-describedby), so a screen reader announces it on
 * focus. The visual tip opens on mouse hover, on keyboard focus and on tap or
 * Enter/Space, and closes on Escape, blur or a tap elsewhere.
 */
export function GlossaryTerm({
  text,
  definition,
  bold = false,
}: {
  text: string;
  definition: string;
  bold?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState({ x: 0, above: false });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const lastPointer = useRef("");

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(
      () => setOpen(false),
      CLOSE_DELAY_MS
    );
  };

  // Keep the tip inside the viewport: nudge it sideways, flip it above the
  // term when there is no room below.
  useLayoutEffect(() => {
    if (!open || !tipRef.current || !wrapRef.current) {
      return;
    }
    const tip = tipRef.current.getBoundingClientRect();
    const term = wrapRef.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const centred = term.left + term.width / 2 - tip.width / 2;
    const clamped = Math.min(Math.max(centred, EDGE), vw - EDGE - tip.width);
    setShift({
      x: clamped - centred,
      above: term.bottom + GAP + tip.height > window.innerHeight - EDGE,
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <span
      ref={wrapRef}
      className="rp-term"
      onPointerEnter={(e) => e.pointerType === "mouse" && show()}
      onPointerLeave={(e) => e.pointerType === "mouse" && hideSoon()}
    >
      <button
        type="button"
        className={`rp-term-btn${bold ? " is-bold" : ""}`}
        aria-describedby={id}
        aria-expanded={open}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onClick={() => {
          // A mouse click lands while hover already opened the tip, so it
          // only ever opens. Touch and keyboard toggle.
          const viaMouse = lastPointer.current === "mouse";
          lastPointer.current = "";
          if (viaMouse || !open) {
            show();
          } else {
            setOpen(false);
          }
        }}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
        onBlur={hideSoon}
      >
        {text}
      </button>
      <span
        ref={tipRef}
        id={id}
        role="tooltip"
        className={`rp-tip${open ? " is-open" : ""}${shift.above ? " is-above" : ""}`}
        style={{ "--rp-tip-x": `${shift.x}px` } as CSSProperties}
      >
        {definition}
      </span>
    </span>
  );
}
