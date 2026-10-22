/* eslint-disable no-script-url -- these tests feed script URLs to the sanitizer on purpose */
import { describe, expect, it } from "vitest";

import { DEFAULT_FOOTER } from "../data/merge-tags";
import type { DocNode } from "../types/email-doc";
import { renderEmailHtml, renderEmailText } from "./render-email";

const p = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const t = (text: string, marks?: DocNode["marks"]): DocNode => ({
  type: "text",
  text,
  ...(marks ? { marks } : {}),
});
const tag = (key: string, fallback = ""): DocNode => ({
  type: "mergeTag",
  attrs: { key, fallback },
});

const DOC: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [t("Season 2 is live")] },
    p(
      t("Hi "),
      tag("name", "there"),
      t(", "),
      t("bold", [{ type: "bold" }]),
      t(" "),
      t("gone", [{ type: "strike" }]),
      t(" "),
      t("site", [{ type: "link", attrs: { href: "https://acme.xyz" } }])
    ),
    {
      type: "emailButton",
      attrs: {
        label: "Open Acme",
        href: "https://acme.xyz/s2",
        align: "center",
      },
    },
    {
      type: "emailImage",
      attrs: {
        src: "https://cdn.acme.xyz/art.png",
        alt: "Key art",
        caption: "Season 2",
        href: "",
      },
    },
    { type: "spacer", attrs: { height: 24 } },
    { type: "horizontalRule" },
    {
      type: "columns",
      content: [
        { type: "column", content: [p(t("Left"))] },
        { type: "column", content: [p(t("Right"))] },
      ],
    },
    {
      type: "tagSection",
      attrs: { tag: "vip", mode: "only" },
      content: [p(t("VIPs only"))],
    },
    {
      type: "tagSection",
      attrs: { tag: "vip", mode: "except" },
      content: [p(t("Not VIPs"))],
    },
  ],
};

/*
 * A mirror of the style allow-list in onchain-backend
 * src/common/utils/sanitize.util.ts (sanitizeEmailTemplateHtml). Anything the
 * send renderer emits outside it is silently dropped before the inbox.
 */
const BOX =
  /^(auto|-?\d+(\.\d+)?(px|em|rem|%|pt)?)(\s+(auto|-?\d+(\.\d+)?(px|em|rem|%|pt)?)){0,3}$/;
const COLOR = /^(#[0-9A-Fa-f]{3,8}|rgb\(.+\)|rgba\(.+\)|[a-zA-Z]+)$/;
const BORDER = /^\S+(\s+\S+){0,2}$/;
const ALLOWED: Record<string, RegExp> = {
  color: COLOR,
  "background-color": COLOR,
  background: COLOR,
  "font-size": /^\d+(\.\d+)?(px|em|rem|%|pt)$/,
  "font-family": /^[\w\s,"'-]+$/,
  "font-weight": /^(normal|bold|bolder|lighter|\d{3})$/,
  "font-style": /^(normal|italic|oblique)$/,
  "text-align": /^(left|right|center|justify)$/,
  "text-decoration": /^(none|underline|overline|line-through)(\s+\S+){0,3}$/,
  "line-height": /^\d+(\.\d+)?(px|em|rem|%)?$/,
  "vertical-align":
    /^(baseline|top|middle|bottom|text-top|text-bottom|sub|super)$/,
  margin: BOX,
  padding: BOX,
  "padding-left": BOX,
  "padding-right": BOX,
  border: BORDER,
  "border-top": BORDER,
  "border-left": BORDER,
  "border-radius": BOX,
  "max-width": /^\d+(px|%)$/,
  width: /^\d+(px|%)$/,
  height: /^\d+(px|%)$/,
  display: /^(block|inline|inline-block|table|table-cell|table-row|none)$/,
};

describe("renderEmailHtml (send)", () => {
  const html = renderEmailHtml(DOC, { footer: DEFAULT_FOOTER, mode: "send" });

  it("emits only styles the backend sanitizer keeps", () => {
    const styles = [...html.matchAll(/style="([^"]*)"/g)].map((m) => m[1]);
    expect(styles.length).toBeGreaterThan(10);
    for (const decl of styles.flatMap((s) => s.split(";")).filter(Boolean)) {
      const i = decl.indexOf(":");
      const prop = decl.slice(0, i).trim();
      const value = decl.slice(i + 1).trim();
      expect(
        ALLOWED[prop],
        `property "${prop}" would be stripped`
      ).toBeDefined();
      expect(value, `${prop}: ${value}`).toMatch(ALLOWED[prop]);
    }
  });

  it("uses nothing the sanitizer strips wholesale", () => {
    expect(html).not.toMatch(/<style|<!--|class=|data-|<s>|font:/);
  });

  it("writes recipient tags with a default and compliance tags without", () => {
    expect(html).toContain('{{ name | default: "there" }}');
    expect(html).toContain("{{ postal_address }}");
    expect(html).not.toContain("postal_address | default");
  });

  it("links the unsubscribe and preference tags with readable labels", () => {
    expect(html).toContain('href="{{ unsubscribe_url }}"');
    expect(html).toMatch(/>Unsubscribe<\/a>/);
    expect(html).toMatch(/>Manage preferences<\/a>/);
  });

  it("turns tag sections into per-recipient conditions", () => {
    expect(html).toContain("{% if 'vip' in profile.tags %}");
    expect(html).toContain("{% if not 'vip' in profile.tags %}");
    expect(html).toContain("{% endif %}");
  });

  it("leaves the preheader to the backend", () => {
    const withPre = renderEmailHtml(DOC, {
      footer: DEFAULT_FOOTER,
      mode: "send",
      preheader: "Read me",
    });
    expect(withPre).not.toContain("Read me");
  });

  it("renders strikethrough as a text-decoration span", () => {
    expect(html).toContain(
      '<span style="text-decoration:line-through">gone</span>'
    );
  });
});

describe("renderEmailHtml (preview)", () => {
  it("fills samples and shows the preheader", () => {
    const html = renderEmailHtml(DOC, {
      footer: DEFAULT_FOOTER,
      mode: "preview",
      preheader: "Read me",
    });
    expect(html).not.toContain("{{");
    expect(html).toContain("Read me");
  });

  it("shows only the sections a contact would get", () => {
    const vip = renderEmailHtml(DOC, {
      footer: DEFAULT_FOOTER,
      mode: "preview",
      contactTags: ["vip"],
    });
    expect(vip).toContain("VIPs only");
    expect(vip).not.toContain("Not VIPs");
    const everyone = renderEmailHtml(DOC, {
      footer: DEFAULT_FOOTER,
      mode: "preview",
      contactTags: null,
    });
    expect(everyone).toContain("VIPs only");
    expect(everyone).toContain("Not VIPs");
  });

  it("drops unsafe links", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        p(t("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])),
      ],
    };
    expect(renderEmailHtml(doc, { footer: "", mode: "send" })).toContain(
      'href="#"'
    );
  });
});

describe("renderEmailText", () => {
  it("keeps tags, sections and links in step with the HTML", () => {
    const text = renderEmailText(DOC, DEFAULT_FOOTER);
    expect(text).toContain('Hi {{ name | default: "there" }}');
    expect(text).toContain("site (https://acme.xyz)");
    expect(text).toContain("Open Acme: https://acme.xyz/s2");
    expect(text).toContain("{% if 'vip' in profile.tags %}");
    expect(text).toContain("{{ unsubscribe_url }}");
  });
});
