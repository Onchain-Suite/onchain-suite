import { describe, expect, it } from "vitest";

import { rewrite, shortenCut } from "./rewrite";

describe("rewrite", () => {
  it("fixes typos and spacing", () => {
    expect(rewrite("fix", "teh  vault is open ,come in")).toBe(
      "The vault is open, come in"
    );
  });

  it("never touches a merge tag", () => {
    const text = 'hi {{ name | default: "there" }}, we think you will  like it';
    expect(rewrite("direct", text)).toBe(
      'Hi {{ name | default: "there" }}, you will like it'
    );
    expect(rewrite("friendlier", text)).toContain(
      '{{ name | default: "there" }}'
    );
  });

  it("keeps a fragment's edges and case", () => {
    expect(
      rewrite("fix", " teh vault ", { fragment: true, startsSentence: false })
    ).toBe(" the vault ");
  });
});

describe("shortenCut", () => {
  it("keeps about three in five sentences", () => {
    const text = "One. Two. Three. Four. Five.";
    expect(text.slice(0, shortenCut(text) ?? text.length)).toBe(
      "One. Two. Three."
    );
  });

  it("has nothing to cut in one sentence", () => {
    expect(shortenCut("Just one.")).toBeNull();
  });
});
