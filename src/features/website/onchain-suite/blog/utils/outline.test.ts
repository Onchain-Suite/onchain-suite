import { describe, expect, it } from "vitest";

import type { BlogPost } from "../blog.types";
import { buildOutline, nodeText, slugifyHeading } from "./outline";

const text = (value: string) => ({ type: "text", text: value });
const heading = (tag: string, ...children: object[]) => ({
  type: "heading",
  tag,
  children,
});
const paragraph = (value: string) => ({
  type: "paragraph",
  children: [text(value)],
});
const doc = (...children: object[]) =>
  ({ root: { type: "root", children } }) as unknown as BlogPost["content"];

describe("slugifyHeading", () => {
  it("makes URL-safe fragments", () => {
    expect(slugifyHeading("Why it's 2x faster")).toBe("why-its-2x-faster");
    expect(slugifyHeading("  Café   déjà vu -- again  ")).toBe(
      "cafe-deja-vu-again"
    );
  });

  it("falls back when nothing usable is left", () => {
    expect(slugifyHeading("!!!")).toBe("section");
  });
});

describe("nodeText", () => {
  it("joins text across links and formatting", () => {
    const node = heading(
      "h2",
      text("Read "),
      { type: "link", children: [text("the docs")] },
      text(" first")
    );
    expect(nodeText(node)).toBe("Read the docs first");
  });
});

describe("buildOutline", () => {
  it("collects H2 and H3 in order and skips everything else", () => {
    const outline = buildOutline(
      doc(
        heading("h1", text("Title")),
        heading("h2", text("Why wallets go quiet")),
        paragraph("Body"),
        heading("h3", text("Signals")),
        heading("h4", text("Fine print")),
        heading("h2", text("The loop"))
      )
    );

    expect(outline.items).toEqual([
      { id: "why-wallets-go-quiet", text: "Why wallets go quiet", level: 2 },
      { id: "signals", text: "Signals", level: 3 },
      { id: "the-loop", text: "The loop", level: 2 },
    ]);
  });

  it("gives repeated headings unique ids, including against a literal suffix", () => {
    const a = heading("h2", text("Results"));
    const b = heading("h2", text("Results 2"));
    const c = heading("h2", text("Results"));
    const outline = buildOutline(doc(a, b, c));

    expect(outline.items.map((item) => item.id)).toEqual([
      "results",
      "results-2",
      "results-3",
    ]);
    expect(outline.idFor(c)).toBe("results-3");
  });

  it("anchors H4s without listing them, and maps ids by node identity", () => {
    const h4 = heading("h4", text("Fine print"));
    const outline = buildOutline(doc(h4));

    expect(outline.items).toEqual([]);
    expect(outline.idFor(h4)).toBe("fine-print");
    expect(outline.idFor(heading("h4", text("Fine print")))).toBeUndefined();
    expect(outline.idFor(null)).toBeUndefined();
  });

  it("ignores empty headings and copes with a missing body", () => {
    expect(buildOutline(doc(heading("h2", text("   ")))).items).toEqual([]);
    expect(buildOutline(null as unknown as BlogPost["content"]).items).toEqual(
      []
    );
  });
});
