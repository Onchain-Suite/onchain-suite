import { Fragment, type ReactNode } from "react";

import type { BookSheet } from "@/onchain-suite-website/components/retention-playbook/book/book-leaves";
import type { ViewerPart } from "@/onchain-suite-website/components/retention-playbook/book/book-types";
import type { PackEntry } from "@/onchain-suite-website/utils/book-pack";

/** One item of a run: a section heading, or a piece of a section. */
export interface RunItem {
  key: string;
  node: ReactNode;
  /** The section it belongs to, for the running head and the contents. */
  section: string;
  heading?: boolean;
  /** A heading for a sub-page, indented under its parent in the contents. */
  sub?: boolean;
}

/**
 * The book in order: fixed pages, the contents, and runs. A run is one or
 * more sections in a row, set continuously, so a section can start partway
 * down a page.
 */
export type Segment =
  | { kind: "page"; key: string; title?: string; node: ReactNode }
  | { kind: "contents"; key: string }
  | { kind: "run"; key: string; items: RunItem[] };

export function toSegments(parts: ViewerPart[]): Segment[] {
  const out: Segment[] = [];
  for (const part of parts) {
    if (part.kind !== "flow") {
      out.push(part);
      continue;
    }
    let run = out[out.length - 1];
    if (run?.kind !== "run") {
      run = { kind: "run", key: `run-${part.key}`, items: [] };
      out.push(run);
    }
    run.items.push({
      key: `${part.key}-heading`,
      node: (
        <h2 className="rp-bk-h">
          {part.parent && <span className="rp-bk-hk">{part.parent}</span>}
          {part.title}
        </h2>
      ),
      section: part.title,
      heading: true,
      sub: Boolean(part.parent),
    });
    for (const item of part.items) {
      run.items.push({ ...item, section: part.title });
    }
  }
  return out;
}

/** One piece of an item on a page; a cut paragraph shows only its slice. */
function Piece({ entry, item }: { entry: PackEntry; item: RunItem }) {
  if (entry.from === 0 && entry.to === undefined) return item.node;
  return (
    <div
      className="rp-bk-clip"
      style={
        entry.to === undefined ? undefined : { height: entry.to - entry.from }
      }
    >
      <div style={{ marginTop: -entry.from }}>{item.node}</div>
    </div>
  );
}

function RunPage({ head, children }: { head: string; children: ReactNode }) {
  return (
    <div className="rp-bk-page">
      <p className="rp-bk-head" aria-hidden="true">
        {head}
      </p>
      <div className="rp-chapter rp-bk-body rp-bk-body-flow">
        <div className="rp-bk-flow">{children}</div>
      </div>
    </div>
  );
}

/**
 * Every page of the book, in order. Until the runs are measured, each run is
 * one page that scrolls.
 */
export function buildSheets(
  segments: Segment[],
  layout: PackEntry[][][] | null,
  title: string
): BookSheet[] {
  let run = 0;
  const pagesOf = segments.map((s) => {
    if (s.kind !== "run") return null;
    return layout?.[run++] ?? [s.items.map((_, i) => ({ item: i, from: 0 }))];
  });

  // Where each segment starts, and the page each section heading sits on.
  const starts: number[] = [];
  const sectionPage = new Map<string, number>();
  let page = 0;
  segments.forEach((s, si) => {
    starts.push(page);
    const pages = pagesOf[si];
    if (s.kind === "run" && pages) {
      pages.forEach((entries, n) => {
        for (const e of entries) {
          const item = s.items[e.item];
          if (item.heading && !sectionPage.has(item.section)) {
            sectionPage.set(item.section, page + n);
          }
        }
      });
      page += pages.length;
    } else {
      page += 1;
    }
  });

  const contents: { title: string; page: number; sub?: boolean }[] = [];
  segments.forEach((s, si) => {
    if (s.kind === "page" && s.title) {
      contents.push({ title: s.title, page: starts[si] });
    }
    if (s.kind === "run") {
      for (const item of s.items) {
        if (item.heading) {
          contents.push({
            title: item.section,
            page: sectionPage.get(item.section) ?? starts[si],
            sub: item.sub,
          });
        }
      }
    }
  });

  const sheets: BookSheet[] = [];
  segments.forEach((s, si) => {
    if (s.kind === "page") {
      sheets.push({ key: s.key, node: s.node });
    } else if (s.kind === "contents") {
      sheets.push({
        key: s.key,
        node: (
          <div className="rp-bk-page">
            <p className="rp-bk-head" aria-hidden="true">
              {title} · OnchainSuite
            </p>
            <div className="rp-chapter rp-bk-body">
              <h2 className="rp-bk-h">Contents</h2>
              <ol className="rp-bk-toc">
                {contents.map((c) => (
                  <li key={c.title} className={c.sub ? "is-sub" : undefined}>
                    <a href={`#page-${c.page + 1}`}>
                      <span>{c.title}</span>
                      <span className="rp-bk-toc-n">{c.page + 1}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ),
      });
    } else {
      (pagesOf[si] ?? []).forEach((entries, n) => {
        // The running head names the section the page opens in.
        const section = s.items[entries[0]?.item ?? 0]?.section ?? "";
        sheets.push({
          key: `${s.key}-${n}`,
          node: (
            <RunPage head={`${title} · ${section}`}>
              {entries.map((e) => (
                <Fragment key={`${s.items[e.item].key}-${e.from}`}>
                  <Piece entry={e} item={s.items[e.item]} />
                </Fragment>
              ))}
            </RunPage>
          ),
        });
      });
    }
  });
  return sheets;
}
