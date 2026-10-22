import { describe, expect, it } from "vitest";

import { createGlossaryTracker, parseInline } from "./glossary-marker";

const join = (segments: { text: string }[]) =>
  segments.map((s) => s.text).join("");

describe("parseInline", () => {
  it("splits bold runs", () => {
    expect(parseInline("by **email** and **in-app** today")).toEqual([
      { text: "by " },
      { text: "email", bold: true },
      { text: " and " },
      { text: "in-app", bold: true },
      { text: " today" },
    ]);
  });

  it("leaves text without markers as one run", () => {
    expect(parseInline("plain")).toEqual([{ text: "plain" }]);
  });

  it("keeps an unclosed marker as text", () => {
    expect(join(parseInline("a ** b"))).toBe("a ** b");
  });

  it("splits ==underline== runs alongside bold", () => {
    expect(parseInline("**One** rule: ==stop on the action==.")).toEqual([
      { text: "One", bold: true },
      { text: " rule: " },
      { text: "stop on the action", underline: true },
      { text: "." },
    ]);
  });
});

describe("createGlossaryTracker", () => {
  it("marks a term and keeps every word", () => {
    const g = createGlossaryTracker();
    const text = "One click turns the answer into a segment.";
    const out = g.mark(text);
    expect(join(out)).toBe(text);
    expect(out.filter((s) => s.term)).toEqual([
      { text: "segment", term: "segment" },
    ]);
  });

  it("marks only the first use within one tracker", () => {
    const g = createGlossaryTracker();
    const first = g.mark("These seven Loops work. Every Loop ends.");
    const second = g.mark("Another Loop.");
    expect(first.filter((s) => s.term).map((s) => s.text)).toEqual(["Loops"]);
    expect(second.some((s) => s.term)).toBe(false);
  });

  it("starts fresh for each new tracker (each section)", () => {
    createGlossaryTracker().mark("a segment");
    const out = createGlossaryTracker().mark("a segment");
    expect(out.some((s) => s.term === "segment")).toBe(true);
  });

  it("marks several different terms in one string", () => {
    const g = createGlossaryTracker();
    const out = g.mark(
      "each answer can become a new segment or Loop in one click"
    );
    expect(out.filter((s) => s.term).map((s) => s.term)).toEqual([
      "segment",
      "loop",
    ]);
  });

  it("matches multi-word terms and plurals", () => {
    const g = createGlossaryTracker();
    const out = g.mark(
      "matched with a zero-knowledge proof, then in-app messages"
    );
    expect(out.filter((s) => s.term).map((s) => s.text)).toEqual([
      "zero-knowledge proof",
      "in-app messages",
    ]);
  });

  it("does not treat the verb 'triggers' as the term", () => {
    const g = createGlossaryTracker();
    const out = g.mark("the price that triggers liquidation");
    expect(out.some((s) => s.term)).toBe(false);
  });

  it("leaves the product name Automation Trigger API alone", () => {
    const g = createGlossaryTracker();
    expect(
      g.mark("through the Automation Trigger API").some((s) => s.term)
    ).toBe(false);
  });

  it("does not match inside longer words", () => {
    const g = createGlossaryTracker();
    expect(g.mark("loophole segmentation").some((s) => s.term)).toBe(false);
  });

  it("prefers the longer term when two overlap", () => {
    const g = createGlossaryTracker();
    const out = g.mark("Every retention trigger fires the same day.");
    expect(out.filter((s) => s.term).map((s) => s.term)).toEqual([
      "retention-trigger",
    ]);
  });

  it("matches the noun suppression but not the verb suppress", () => {
    const g = createGlossaryTracker();
    expect(g.mark("we suppress buyers").some((s) => s.term)).toBe(false);
    expect(
      g
        .mark("a suppression rule")
        .filter((s) => s.term)
        .map((s) => s.text)
    ).toEqual(["suppression"]);
  });

  it("keeps underline on a marked term inside an underlined run", () => {
    const g = createGlossaryTracker();
    expect(g.mark("==every capture point==")).toEqual([
      { text: "every ", underline: true },
      { text: "capture point", underline: true, term: "capture-point" },
    ]);
  });

  it("keeps bold on a marked term inside a bold run", () => {
    const g = createGlossaryTracker();
    const out = g.mark("**Holdout lift:**");
    expect(out).toEqual([
      { text: "Holdout", bold: true, term: "holdout" },
      { text: " lift:", bold: true },
    ]);
  });
});
