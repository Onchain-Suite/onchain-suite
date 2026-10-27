"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  DocumentTextIcon,
} from "@heroicons/react/20/solid";
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BookLeaves } from "@/onchain-suite-website/components/retention-playbook/book/book-leaves";
import type { ViewerPart } from "@/onchain-suite-website/components/retention-playbook/book/book-types";
import { useBookLayout } from "@/onchain-suite-website/components/retention-playbook/book/use-book-layout";
import { useBookMode } from "@/onchain-suite-website/components/retention-playbook/book/use-book-mode";
import {
  spreadCount,
  spreadOf,
  spreadPages,
  step,
} from "@/onchain-suite-website/utils/book-spread";

/** #page-3 opens the book at its third page; pages are counted from 1. */
function pageFromHash(count: number): number {
  const m = /^#page-(\d+)$/.exec(window.location.hash);
  if (!m) return 0;
  return Math.min(Math.max(Number(m[1]) - 1, 0), count - 1);
}

function setView(view: "book" | "page") {
  document.documentElement.dataset.rpView = view;
  const url = new URL(window.location.href);
  if (view === "page") url.searchParams.set("view", "page");
  else url.searchParams.delete("view");
  window.history.replaceState(null, "", url);
}

function FlowPage({
  head,
  title,
  continued,
  children,
}: {
  head: string;
  title: string;
  continued: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rp-bk-page">
      <p className="rp-bk-head" aria-hidden="true">
        {head}
      </p>
      <div className="rp-chapter rp-bk-body rp-bk-body-flow">
        <h2 className="rp-bk-h">
          {title}
          {continued && <span className="rp-bk-cont">continued</span>}
        </h2>
        <div className="rp-bk-flow">{children}</div>
      </div>
    </div>
  );
}

/**
 * Turns the pages of a strategy book. Fixed pages arrive rendered from the
 * server; a section's items are measured here and laid out across as many
 * pages as they need. Turning forward lifts the open page from its right edge
 * and lays it over to the left, the way a book page turns.
 */
export function BookViewer({
  parts,
  title,
}: {
  parts: ViewerPart[];
  /** The strategy's title: the running head and the page announcement. */
  title: string;
}) {
  const head = `${title} · OnchainSuite`;
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const mode = useBookMode();
  const layout = useBookLayout(stage, box, column);

  const flows = useMemo(
    () =>
      parts.filter(
        (p): p is Extract<ViewerPart, { kind: "flow" }> => p.kind === "flow"
      ),
    [parts]
  );

  const sheets = useMemo(() => {
    // Until the first measurement, a section is one page that scrolls.
    let flowIndex = 0;
    const counts = parts.map((p) =>
      p.kind === "flow" ? (layout?.[flowIndex++]?.length ?? 1) : 1
    );
    const starts = counts.map((_, i) =>
      counts.slice(0, i).reduce((a, b) => a + b, 0)
    );
    const out: { key: string; node: ReactNode }[] = [];
    flowIndex = 0;
    parts.forEach((p) => {
      if (p.kind === "page") {
        out.push({ key: p.key, node: p.node });
      } else if (p.kind === "contents") {
        out.push({
          key: p.key,
          node: (
            <div className="rp-bk-page">
              <p className="rp-bk-head" aria-hidden="true">
                {head}
              </p>
              <div className="rp-chapter rp-bk-body">
                <h2 className="rp-bk-h">Contents</h2>
                <ol className="rp-bk-toc">
                  {parts.map((q, qi) => {
                    const t =
                      q.kind === "flow"
                        ? q.title
                        : q.kind === "page"
                          ? q.title
                          : undefined;
                    return t ? (
                      <li key={q.key}>
                        <a href={`#page-${starts[qi] + 1}`}>
                          <span>{t}</span>
                          <span className="rp-bk-toc-n">{starts[qi] + 1}</span>
                        </a>
                      </li>
                    ) : null;
                  })}
                </ol>
              </div>
            </div>
          ),
        });
      } else {
        const pages = layout?.[flowIndex] ?? [p.items.map((_, i) => i)];
        flowIndex++;
        pages.forEach((indexes, n) =>
          out.push({
            key: `${p.key}-${n}`,
            node: (
              <FlowPage head={head} title={p.title} continued={n > 0}>
                {indexes.map((i) => (
                  <Fragment key={p.items[i].key}>{p.items[i].node}</Fragment>
                ))}
              </FlowPage>
            ),
          })
        );
      }
    });
    return out;
  }, [parts, layout, head]);

  const count = sheets.length;
  const [index, setIndex] = useState(0);
  const pageEls = useRef<(HTMLDivElement | null)[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const pageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    pageEls.current[page] = el;
  }, []);

  // What is open: one page, or the two pages of a spread.
  const spread = spreadOf(index);
  const open =
    mode === "spread"
      ? spreadPages(spread, count)
      : { left: null, right: index };
  const atStart = mode === "spread" ? spread === 0 : index === 0;
  const atEnd =
    mode === "spread" ? spread === spreadCount(count) - 1 : index === count - 1;

  const go = useCallback(
    (to: number, focus = true) => {
      const next = Math.min(Math.max(to, 0), count - 1);
      setIndex(next);
      window.history.replaceState(null, "", `#page-${next + 1}`);
      if (focus) pageEls.current[next]?.focus({ preventScroll: true });
    },
    [count]
  );
  const turn = useCallback(
    (dir: 1 | -1, focus = true) => go(step(index, dir, mode, count), focus),
    [go, index, mode, count]
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "page") {
      document.documentElement.dataset.rpView = "page";
    }
    setIndex(pageFromHash(count));
    // The contents page links to #page-N, so follow the hash when it changes.
    const onHash = () => setIndex(pageFromHash(count));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [count]);

  // The hand-drawn diagrams draw as their page opens. The Annotator only
  // watches what was on the page when it mounted, and the book lays its pages
  // out again after measuring, so the open pages are marked here.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      for (const page of [open.left, open.right]) {
        if (page === null) continue;
        pageEls.current[page]
          ?.querySelectorAll("[data-draw]:not(.is-drawn)")
          .forEach((el) => el.classList.add("is-drawn"));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open.left, open.right, sheets, mode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.documentElement.dataset.rpView === "page") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const dir: Record<string, 1 | -1> = {
        ArrowRight: 1,
        PageDown: 1,
        ArrowLeft: -1,
        PageUp: -1,
      };
      if (e.key in dir) {
        e.preventDefault();
        turn(dir[e.key]);
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        go(e.key === "Home" ? 0 : count - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go, turn]);

  return (
    <div className="rp-book" aria-roledescription="book">
      <div
        ref={stage}
        className="rp-bk-stage"
        data-mode={mode}
        style={{
          ["--rp-bk-left" as string]: Math.min(
            mode === "spread" ? spread : index,
            6
          ),
          ["--rp-bk-right" as string]: Math.min(
            mode === "spread"
              ? spreadCount(count) - spread - 1
              : count - index - 1,
            6
          ),
        }}
        onPointerDown={(e) => {
          swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s || e.pointerType === "mouse") return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
            turn(dx < 0 ? 1 : -1, false);
          }
        }}
      >
        {/* A hidden page the same size as the real ones: its empty flow area
            is what one page holds, and the column under it measures items. */}
        <div className="rp-bk-sheet rp-bk-probe" aria-hidden="true" inert>
          <div className="rp-bk-page">
            <p className="rp-bk-head">{head}</p>
            <div className="rp-chapter rp-bk-body rp-bk-body-flow">
              <h2 className="rp-bk-h">{title}</h2>
              <div className="rp-bk-flow" ref={box} />
              <div className="rp-bk-measure" ref={column}>
                {flows.map((f) => (
                  <div key={f.key} data-flow="">
                    {f.items.map((it) => (
                      <div key={it.key} data-item="">
                        {it.node}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <BookLeaves sheets={sheets} mode={mode} at={index} pageRef={pageRef} />
      </div>

      <div className="rp-bk-bar">
        <button
          type="button"
          className="rp-bk-turn"
          onClick={() => turn(-1)}
          disabled={atStart}
          aria-label="Previous page"
        >
          <ArrowLeftIcon className="rp-icon-sm" aria-hidden="true" />
        </button>
        <a href="#page-2" className="rp-bk-contents">
          <BookOpenIcon className="rp-icon-sm" aria-hidden="true" />
          Contents
        </a>
        <p className="rp-bk-count" aria-live="polite">
          <span className="sr-only">{title}, </span>
          {open.left !== null && open.right !== null
            ? `Pages ${open.left + 1} and ${open.right + 1} of ${count}`
            : `Page ${(open.right ?? open.left ?? 0) + 1} of ${count}`}
        </p>
        <button
          type="button"
          className="rp-bk-view"
          onClick={() => setView("page")}
        >
          <DocumentTextIcon className="rp-icon-sm" aria-hidden="true" />
          Read as one page
        </button>
        <button
          type="button"
          className="rp-bk-turn"
          onClick={() => turn(1)}
          disabled={atEnd}
          aria-label="Next page"
        >
          <ArrowRightIcon className="rp-icon-sm" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** On the one-page view: the way back into the book. */
export function BackToBook() {
  return (
    <button
      type="button"
      className="btn lg rp-bk-back"
      onClick={() => {
        setView("book");
        window.scrollTo({ top: 0 });
      }}
    >
      <BookOpenIcon className="rp-icon-sm" aria-hidden="true" />
      Read as a book
    </button>
  );
}
