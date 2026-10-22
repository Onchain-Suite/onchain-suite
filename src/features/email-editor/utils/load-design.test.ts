import { describe, expect, it } from "vitest";

import { DEFAULT_FOOTER } from "../data/merge-tags";
import { EMAIL_DOC_FORMAT } from "../types/email-doc";
import { legacyBlocksToDoc, loadDesign, textWithTags } from "./load-design";

describe("loadDesign", () => {
  it("opens this editor's own document as saved", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    const out = loadDesign({
      json: { format: EMAIL_DOC_FORMAT, doc, footer: "Custom footer" },
    });
    expect(out).toEqual({ kind: "doc", doc, footer: "Custom footer" });
  });

  it("falls back to HTML when there is no usable JSON", () => {
    expect(loadDesign({ json: { foo: 1 }, html: "<p>Hi</p>" })).toEqual({
      kind: "html",
      html: "<p>Hi</p>",
      footer: DEFAULT_FOOTER,
    });
  });

  it("starts a new email when there is nothing", () => {
    const out = loadDesign({});
    expect(out.kind).toBe("blank");
  });
});

describe("legacyBlocksToDoc", () => {
  it("converts the in-house v2 block document", () => {
    const doc = legacyBlocksToDoc({
      version: 2,
      root: "r",
      blocks: {
        r: { type: "EmailLayout", data: { childrenIds: ["h", "t", "b", "c"] } },
        h: {
          type: "Heading",
          data: {
            props: { text: "Welcome", level: "h1" },
            style: { textAlign: "center" },
          },
        },
        t: {
          type: "Text",
          data: {
            props: { text: "Hi {{ first_name }}\nline two\n\nNext para" },
            style: {},
          },
        },
        b: {
          type: "Button",
          data: {
            props: { text: "Go", url: "https://x.y" },
            style: { textAlign: "center" },
          },
        },
        c: {
          type: "ColumnsContainer",
          data: {
            props: { columns: [{ childrenIds: ["i"] }, { childrenIds: [] }] },
            style: {},
          },
        },
        i: {
          type: "Image",
          data: {
            props: { url: "https://x.y/a.png", alt: "A", linkHref: null },
            style: {},
          },
        },
      },
    });
    expect(doc?.content?.map((n) => n.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "emailButton",
      "columns",
    ]);
    expect(doc?.content?.[0].attrs).toMatchObject({
      level: 1,
      textAlign: "center",
    });
    const firstPara = doc?.content?.[1].content ?? [];
    expect(firstPara.map((n) => n.type)).toEqual([
      "text",
      "mergeTag",
      "hardBreak",
      "text",
    ]);
    expect(doc?.content?.[3].attrs).toMatchObject({
      label: "Go",
      href: "https://x.y",
      align: "center",
    });
    // An empty column still needs a block to be valid.
    expect(doc?.content?.[4].content?.[1].content?.[0].type).toBe("paragraph");
  });

  it("converts the hosted builder's flat block map", () => {
    const doc = legacyBlocksToDoc({
      root: { type: "EmailLayout", data: { childrenIds: ["a", "b"] } },
      a: { type: "Divider", data: { props: {} } },
      b: {
        type: "Social",
        data: {
          props: { links: [{ platform: "x", url: "https://x.com/acme" }] },
          style: {},
        },
      },
    });
    expect(doc?.content?.map((n) => n.type)).toEqual([
      "horizontalRule",
      "socialLinks",
    ]);
    expect(doc?.content?.[1].attrs?.links).toEqual([
      { label: "X", url: "https://x.com/acme" },
    ]);
  });

  it("survives a design whose blocks loop", () => {
    const doc = legacyBlocksToDoc({
      version: 2,
      root: "r",
      blocks: {
        r: { type: "EmailLayout", data: { childrenIds: ["c"] } },
        c: {
          type: "Container",
          data: { props: { childrenIds: ["c"] }, style: {} },
        },
      },
    });
    expect(doc).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("ignores anything that isn't a block document", () => {
    expect(legacyBlocksToDoc(null)).toBeNull();
    expect(legacyBlocksToDoc({ html: "<p/>" })).toBeNull();
  });
});

describe("textWithTags", () => {
  it("turns known tags into chips, keeping their default", () => {
    expect(textWithTags('Hey {{ name | default: "friend" }}!')).toEqual([
      { type: "text", text: "Hey " },
      { type: "mergeTag", attrs: { key: "name", fallback: "friend" } },
      { type: "text", text: "!" },
    ]);
  });

  it("leaves unknown tags as text", () => {
    expect(textWithTags("{{ claim_url }}")).toEqual([
      { type: "text", text: "{{ claim_url }}" },
    ]);
  });
});
