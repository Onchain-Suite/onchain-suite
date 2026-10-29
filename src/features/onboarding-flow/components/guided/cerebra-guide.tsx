"use client";

import { XMarkIcon } from "@heroicons/react/20/solid";
import { useEffect, useState } from "react";

import "./cerebra-guide.css";
import { CerebraMark } from "./cerebra-mark";

/* Cerebra in the corner of onboarding, talking people through it.
 *
 * Sits bottom right as the mark, eyes on the cursor. When it has something new to say, the mark
 * turns into Cerebra's face and the line types out in a bubble beside it; a moment after the
 * line is finished it settles back into the mark, and the bubble stays until the next line.
 *
 * A line only changes once the answer behind it has been still for half a second, so typing a
 * name does not make Cerebra restart a sentence on every letter. Screen readers hear each line
 * once, whole, from a polite live region; the typed text is decoration. Closing the bubble
 * leaves the mark, which opens it again; clicking Cerebra says the line again.
 *
 * Shown on lg+ only (like the illustration pane), so the fixed corner never covers the footer
 * on narrow screens. Ported from the 2.7 handoff (web/src/components/CerebraGuide.tsx). */
const SETTLE_MS = 550;
const TYPE_MS = 22;
const REST_MS = 2600;

const prefersReduced = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CerebraGuide({
  line,
  cheer = false,
}: {
  line: string;
  /** Someone is about to press the button that moves them on: Cerebra grins. */
  cheer?: boolean;
}) {
  const [said, setSaid] = useState(line);
  const [typed, setTyped] = useState(0);
  const [face, setFace] = useState(true);
  const [open, setOpen] = useState(true);
  const [reduce] = useState(prefersReduced);
  /* Bumped to say the current line again: reopening the bubble, or clicking Cerebra. */
  const [take, setTake] = useState(0);

  // A new line, once the answer behind it has stopped changing.
  useEffect(() => {
    if (line === said) return;
    const t = setTimeout(() => setSaid(line), SETTLE_MS);
    return () => clearTimeout(t);
  }, [line, said]);

  // Type it out, with the face showing.
  useEffect(() => {
    setFace(true);
    if (reduce) {
      setTyped(said.length);
      return;
    }
    setTyped(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= said.length) clearInterval(t);
    }, TYPE_MS);
    return () => clearInterval(t);
  }, [said, reduce, take]);

  const talking = typed < said.length;
  // Finished talking: back to the mark after a beat.
  useEffect(() => {
    if (talking) return;
    const t = setTimeout(() => setFace(false), REST_MS);
    return () => clearTimeout(t);
  }, [talking, said]);

  return (
    <div className="pointer-events-none fixed right-6 bottom-5 z-50 hidden items-end gap-2.5 lg:flex">
      {open && (
        <div className="cg__bubble border-border bg-card text-foreground pointer-events-auto relative mb-6 max-w-[300px] rounded-[16px_16px_4px_16px] border py-3 pr-9 pl-3.5 shadow-xl">
          <span className="text-primary mb-0.5 block text-[11px] font-semibold tracking-wide uppercase">
            Cerebra
          </span>
          {/* The untyped rest is laid out but invisible, so the bubble does not grow as it types. */}
          <p aria-hidden="true" className="m-0 text-sm leading-relaxed">
            {said.slice(0, typed)}
            <span className="text-transparent">{said.slice(typed)}</span>
          </p>
          <button
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 inline-flex rounded-sm p-1 transition-colors"
            aria-label="Hide Cerebra"
            onClick={() => setOpen(false)}
          >
            <XMarkIcon aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-label="Cerebra says"
      >
        {open ? said : ""}
      </p>
      <button
        type="button"
        className="cg__av pointer-events-auto shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
        aria-expanded={open}
        aria-label={open ? "Cerebra, your setup guide" : "Show Cerebra"}
        onClick={() => {
          setOpen(true);
          setTake((n) => n + 1);
        }}
      >
        <CerebraMark
          face={face && open}
          talking={talking && open}
          cheer={cheer}
          size={76}
        />
      </button>
    </div>
  );
}
