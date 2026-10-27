/* The plan of a strategy book: which pages it has, in order, and the pieces
   each section can be broken into.

   A section is not cut into pages here. It is broken into items, the smallest
   pieces a page may end between (a paragraph, a diagram, one Loop card, a few
   rows of a table), and the viewer measures those items in the browser and
   fills each page to the height it really has. Fixed pages (the cover, the
   contents, the overview, the figures, pricing and the close) are one page
   each. */

import type {
  Block,
  Chapter,
  ChapterSection,
} from "@/onchain-suite-website/types/retention-playbook";

export type BookPart =
  | { kind: "cover" }
  | { kind: "contents" }
  | { kind: "overview"; paragraphs: string[] }
  | { kind: "figure"; blocks: Block[] }
  | { kind: "section"; section: ChapterSection; items: Block[][] }
  | { kind: "pricing" }
  | { kind: "close" };

/** Table rows that stay together on one page, with the header repeated. */
export const TABLE_ROWS_PER_ITEM = 3;

/**
 * Breaks a section's blocks into items. A margin note stays with the block
 * before it, a run of Loop cards breaks between cards, and a long table
 * breaks between rows.
 */
export function sectionItems(blocks: Block[]): Block[][] {
  const items: Block[][] = [];
  for (const b of blocks) {
    const last = items[items.length - 1];
    if (b.kind === "note" && last) {
      last.push(b);
    } else if (b.kind === "loops") {
      for (const loop of b.loops) {
        items.push([{ kind: "loops", loops: [loop] }]);
      }
    } else if (b.kind === "table" && b.rows.length > TABLE_ROWS_PER_ITEM) {
      for (let i = 0; i < b.rows.length; i += TABLE_ROWS_PER_ITEM) {
        items.push([
          {
            kind: "table",
            head: b.head,
            rows: b.rows.slice(i, i + TABLE_ROWS_PER_ITEM),
          },
        ]);
      }
    } else {
      items.push([b]);
    }
  }
  return items;
}

function sectionBlocks(s: ChapterSection): Block[] {
  if (s.blocks) return s.blocks;
  if (!s.whw) return [];
  return [
    { kind: "p", text: s.whw.what },
    ...s.whw.how,
    { kind: "p", text: s.whw.why },
  ];
}

export function bookParts(chapter: Chapter, withPricing: boolean): BookPart[] {
  const parts: BookPart[] = [{ kind: "cover" }, { kind: "contents" }];
  if (chapter.tldr?.length) {
    parts.push({ kind: "overview", paragraphs: chapter.tldr });
  }
  for (const figure of sectionItems(chapter.intro ?? [])) {
    parts.push({ kind: "figure", blocks: figure });
  }
  for (const section of chapter.sections) {
    parts.push({
      kind: "section",
      section,
      items: sectionItems(sectionBlocks(section)),
    });
  }
  if (withPricing) parts.push({ kind: "pricing" });
  parts.push({ kind: "close" });
  return parts;
}

/** A stable key for a part. */
export function partKey(part: BookPart, i: number): string {
  if (part.kind === "section") return `section-${part.section.id}`;
  if (part.kind === "figure") return `figure-${i}`;
  return part.kind;
}

/** The title a part has in the contents, or nothing if it is not listed. */
export function partTitle(part: BookPart): string | undefined {
  switch (part.kind) {
    case "overview":
      return "Overview";
    case "section":
      return part.section.title;
    case "pricing":
      return "Your plan and price";
    case "close":
      return "Next steps";
    default:
      return undefined;
  }
}

/**
 * Packs measured item heights into pages no taller than `capacity`, in
 * order, never splitting an item. An item taller than a page gets a page of
 * its own, which then scrolls. Returns the item indexes on each page.
 */
export function packItems(heights: number[], capacity: number): number[][] {
  const pages: number[][] = [];
  let page: number[] = [];
  let used = 0;
  heights.forEach((h, i) => {
    if (page.length > 0 && used + h > capacity) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(i);
    used += h;
  });
  if (page.length > 0) pages.push(page);
  return pages;
}
