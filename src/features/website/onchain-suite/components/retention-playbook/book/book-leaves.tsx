"use client";

import type { ReactNode } from "react";

import {
  type BookMode,
  isOpen,
  leafCount,
  spreadOf,
} from "@/onchain-suite-website/utils/book-spread";

export interface BookSheet {
  key: string;
  node: ReactNode;
}

/** One page face: its content and its folio, hidden from readers unless open. */
function Face({
  sheet,
  page,
  count,
  open,
  className,
  pageRef,
}: {
  sheet?: BookSheet;
  page: number;
  count: number;
  open: boolean;
  className: string;
  pageRef: (page: number, el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={(el) => pageRef(page, el)}
      className={className}
      tabIndex={-1}
      inert={!open}
      aria-hidden={!open}
      aria-label={sheet ? `Page ${page + 1} of ${count}` : undefined}
    >
      {sheet?.node}
      {sheet && (
        <p className="rp-bk-folio" aria-hidden="true">
          {page + 1}
        </p>
      )}
    </div>
  );
}

/**
 * The pages of the book. In single mode each page is a sheet that turns over
 * to the left on its own. In spread mode the pages are printed on leaves, two
 * to a leaf: the front is the right-hand page, and the back shows on the left
 * once the leaf has turned over the spine.
 */
export function BookLeaves({
  sheets,
  mode,
  at,
  pageRef,
}: {
  sheets: BookSheet[];
  mode: BookMode;
  /** The page the reader is at, counted from 0. */
  at: number;
  pageRef: (page: number, el: HTMLDivElement | null) => void;
}) {
  const count = sheets.length;

  if (mode === "single") {
    return sheets.map((sheet, i) => (
      <div
        key={sheet.key}
        className="rp-bk-sheet"
        data-state={i < at ? "turned" : i === at ? "open" : "under"}
        style={{ zIndex: i < at ? 1000 + i : 500 - i }}
      >
        <Face
          sheet={sheet}
          page={i}
          count={count}
          open={i === at}
          className="rp-bk-face-single"
          pageRef={pageRef}
        />
      </div>
    ));
  }

  const s = spreadOf(at);
  return Array.from({ length: leafCount(count) }, (_, k) => {
    const front = 2 * k;
    const back = 2 * k + 1;
    const turned = k < s;
    return (
      <div
        key={sheets[front].key}
        className="rp-bk-leaf"
        data-state={turned ? "turned" : "flat"}
        style={{ zIndex: turned ? 1000 + k : 500 - k }}
      >
        <Face
          sheet={sheets[front]}
          page={front}
          count={count}
          open={isOpen(front, at, mode, count)}
          className="rp-bk-face rp-bk-front"
          pageRef={pageRef}
        />
        <Face
          sheet={sheets[back]}
          page={back}
          count={count}
          open={back < count && isOpen(back, at, mode, count)}
          className="rp-bk-face rp-bk-back"
          pageRef={pageRef}
        />
      </div>
    );
  });
}
