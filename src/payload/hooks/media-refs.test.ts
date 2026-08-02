/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { collectMediaIds } from "@/payload/hooks/media-refs";

/** A Lexical upload node as the editor serialises it. */
const uploadNode = (value: unknown) => ({
  fields: {},
  id: "node-id",
  relationTo: "media",
  type: "upload",
  value,
});

describe("collectMediaIds", () => {
  it("finds the cover image", () => {
    expect(collectMediaIds({ coverImage: 4 })).toEqual([4]);
  });

  it("accepts either a raw id or a populated document", () => {
    // depth=0 gives an id; a populated read gives the whole doc.
    expect(collectMediaIds({ coverImage: 4 })).toEqual([4]);
    expect(collectMediaIds({ coverImage: { id: 4, alt: "x" } })).toEqual([4]);
    expect(collectMediaIds({ coverImage: "abc" })).toEqual(["abc"]);
  });

  it("finds the SEO image from the seo plugin", () => {
    expect(collectMediaIds({ meta: { image: 9 } })).toEqual([9]);
  });

  it("finds upload nodes nested deep in the rich text", () => {
    // Uploads can sit inside blocks, quotes or list items, so the tree is walked
    // rather than read from a fixed path.
    const doc = {
      content: {
        root: {
          children: [
            { type: "paragraph", children: [{ text: "hi", type: "text" }] },
            {
              children: [{ children: [uploadNode(11)], type: "listitem" }],
              type: "list",
            },
            {
              fields: { content: { root: { children: [uploadNode(12)] } } },
              type: "block",
            },
          ],
          type: "root",
        },
      },
    };
    expect(collectMediaIds(doc).sort()).toEqual([11, 12]);
  });

  it("collects everything a post references, without duplicates", () => {
    const doc = {
      content: {
        root: { children: [uploadNode(1), uploadNode(2), uploadNode(1)] },
      },
      coverImage: 1,
      meta: { image: 3 },
    };
    expect(collectMediaIds(doc).sort()).toEqual([1, 2, 3]);
  });

  it("ignores upload nodes pointing at other collections", () => {
    const doc = {
      content: {
        root: {
          children: [
            { relationTo: "documents", type: "upload", value: 99 },
            uploadNode(5),
          ],
        },
      },
    };
    expect(collectMediaIds(doc)).toEqual([5]);
  });

  it("returns nothing for a post with no media", () => {
    expect(collectMediaIds({ title: "text only" })).toEqual([]);
    expect(collectMediaIds({ coverImage: null, meta: {} })).toEqual([]);
    expect(collectMediaIds({})).toEqual([]);
    expect(collectMediaIds(null)).toEqual([]);
    expect(collectMediaIds(undefined)).toEqual([]);
  });

  it("survives malformed values instead of throwing", () => {
    // afterChange runs on whatever was saved; a crash here would log a scary
    // warning on an otherwise successful publish.
    expect(collectMediaIds({ coverImage: {} })).toEqual([]);
    expect(collectMediaIds({ coverImage: [] })).toEqual([]);
    expect(collectMediaIds({ meta: "not-an-object" })).toEqual([]);
    expect(collectMediaIds({ content: "not-a-tree" })).toEqual([]);
    expect(collectMediaIds({ content: { root: null } })).toEqual([]);
  });

  it("terminates on a circular content tree", () => {
    const node: Record<string, unknown> = { type: "paragraph" };
    node.self = node;
    expect(() => collectMediaIds({ content: node })).not.toThrow();
  });
});
