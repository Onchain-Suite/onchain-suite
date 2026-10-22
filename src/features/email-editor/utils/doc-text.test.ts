import { describe, expect, it } from "vitest";

import { DEFAULT_FOOTER } from "../data/merge-tags";
import type { DocNode } from "../types/email-doc";
import {
  hiddenSections,
  missingRequiredTags,
  recipientTags,
  sectionShows,
  sectionTags,
} from "./doc-text";

const tag = (key: string, fallback = ""): DocNode => ({
  type: "mergeTag",
  attrs: { key, fallback },
});
const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });

describe("missingRequiredTags", () => {
  it("is satisfied by the standard footer", () => {
    expect(missingRequiredTags(doc(), DEFAULT_FOOTER)).toEqual([]);
  });

  it("lists what a reworded footer dropped", () => {
    expect(missingRequiredTags(doc(), "Thanks for reading")).toEqual([
      "unsubscribe_url",
      "postal_address",
    ]);
  });

  it("doesn't count a tag only some recipients see", () => {
    const body = doc({
      type: "tagSection",
      attrs: { tag: "vip" },
      content: [{ type: "paragraph", content: [tag("postal_address")] }],
    });
    expect(missingRequiredTags(body, "{{ unsubscribe_url }}")).toEqual([
      "postal_address",
    ]);
  });
});

describe("recipientTags", () => {
  it("lists each recipient tag once with its fallback", () => {
    const body = doc({
      type: "paragraph",
      content: [
        tag("name", "there"),
        tag("wallet_short", "your wallet"),
        tag("postal_address"),
      ],
    });
    expect(recipientTags(body)).toEqual([
      { key: "name", fallback: "there" },
      { key: "wallet_short", fallback: "your wallet" },
    ]);
  });

  it("flags a tag that has no fallback somewhere", () => {
    const body = doc({
      type: "paragraph",
      content: [tag("name", "there"), tag("name", "")],
    });
    expect(recipientTags(body)).toEqual([{ key: "name", fallback: "" }]);
  });
});

describe("sections", () => {
  it("collects the tags sections are keyed on", () => {
    const body = doc(
      { type: "tagSection", attrs: { tag: "vip", mode: "only" }, content: [] },
      { type: "tagSection", attrs: { tag: "vip", mode: "except" }, content: [] }
    );
    expect(sectionTags(body)).toEqual(["vip"]);
  });

  it("shows a section by its rule", () => {
    expect(sectionShows({ tag: "vip", mode: "only" }, ["vip"])).toBe(true);
    expect(sectionShows({ tag: "vip", mode: "only" }, [])).toBe(false);
    expect(sectionShows({ tag: "vip", mode: "except" }, [])).toBe(true);
    expect(sectionShows({ tag: "vip", mode: "only" }, null)).toBe(true);
    expect(sectionShows({ tag: "", mode: "only" }, [])).toBe(true);
  });

  it("describes the sections a contact misses", () => {
    const body = doc(
      { type: "tagSection", attrs: { tag: "vip", mode: "only" }, content: [] },
      { type: "tagSection", attrs: { tag: "vip", mode: "except" }, content: [] }
    );
    expect(hiddenSections(body, [])).toEqual(["only vip"]);
    expect(hiddenSections(body, ["vip"])).toEqual(["everyone except vip"]);
    expect(hiddenSections(body, null)).toEqual([]);
  });
});
