import { describe, expect, it } from "vitest";

import { YAUGA } from "@/onchain-suite-website/data/clients/yauga";
import type { Block } from "@/onchain-suite-website/types/retention-playbook";
import {
  bookParts,
  partTitle,
  sectionItems,
  TABLE_ROWS_PER_ITEM,
} from "@/onchain-suite-website/utils/book-pages";

describe("book parts", () => {
  it("keeps a margin note with the block before it", () => {
    const items = sectionItems([
      { kind: "p", text: "a paragraph" },
      { kind: "note", text: "beside it" },
      { kind: "p", text: "another" },
    ]);
    expect(items.map((i) => i.map((b) => b.kind))).toEqual([
      ["p", "note"],
      ["p"],
    ]);
  });

  it("breaks Loop cards one per item and long tables between rows", () => {
    const loop = { name: "x", startsWhen: "a", sends: "b", stopsWhen: "c" };
    const table: Block = {
      kind: "table",
      head: ["h"],
      rows: Array.from({ length: TABLE_ROWS_PER_ITEM * 2 + 1 }, () => ["r"]),
    };
    const items = sectionItems([
      { kind: "loops", loops: [loop, loop, loop] },
      table,
    ]);
    expect(items).toHaveLength(3 + 3);
    for (const [b] of items.slice(3)) {
      expect(b.kind === "table" && b.head).toEqual(["h"]);
    }
  });

  it("breaks a bulleted list between bullets", () => {
    const items = sectionItems([{ kind: "list", items: ["a", "b", "c"] }]);
    expect(items).toHaveLength(3);
  });

  it("opens with a cover and contents and ends with pricing and the close", () => {
    const parts = bookParts(YAUGA, true);
    expect(parts[0].kind).toBe("cover");
    expect(parts[1].kind).toBe("contents");
    expect(parts.at(-2)?.kind).toBe("pricing");
    expect(parts.at(-1)?.kind).toBe("close");
  });

  it("lists every section once in the contents", () => {
    const titles = bookParts(YAUGA, true).map(partTitle);
    for (const s of YAUGA.sections) {
      expect(titles.filter((t) => t === s.title)).toHaveLength(1);
    }
  });
});
