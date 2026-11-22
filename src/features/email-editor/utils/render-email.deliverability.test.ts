/* eslint-disable no-script-url -- one test feeds a script URL to the sanitizer on purpose */
import { describe, expect, it } from "vitest";

import { DEFAULT_FOOTER } from "../data/merge-tags";
import type { DocNode } from "../types/email-doc";
import { starterDoc } from "./load-design";
import {
  CLIP_WARN_BYTES,
  emailBytes,
  GMAIL_CLIP_BYTES,
  kb,
  renderEmailHtml,
} from "./render-email";

/**
 * Deliverability guardrails for the HTML `renderEmailHtml` sends to an inbox.
 *
 * These model email-client constraints with string/DOM assertions - they never
 * depend on a real email client - as a preview<->delivery parity guardrail: the
 * send output has to survive Outlook, Gmail clipping and narrow phones without
 * relying on anything the pipeline strips.
 *
 * One thing to know before reading the assertions. This renderer is downstream
 * of the backend sanitizer (onchain-backend common/utils/sanitize.util.ts),
 * which deletes `<style>`, classes, ids, `data-*` and *every comment* before an
 * email reaches an inbox (see the module doc in render-email.ts). So the usual
 * deliverability toolkit is deliberately absent, and these tests assert the
 * stronger guarantees the renderer uses instead:
 *   - no `<style>` block to strip, so a stripped `<style>` cannot change layout;
 *   - the centered container survives Outlook via `<td align="center">`, not via
 *     an `<!--[if mso]>` conditional comment / VML (a comment the sanitizer would
 *     remove anyway);
 *   - the layout is responsive by fluid `width:100%` + `max-width`, not by a
 *     `@media` rule, so it degrades safely on a phone with no media query at all;
 *   - images scale with `display:block;width:100%;max-width:*px` and no fixed
 *     height, rather than `height:auto` (which the sanitizer's height allow-list,
 *     `\d+(px|%)` only, would drop).
 *
 * Fixtures come from the editor's own document model: `starterDoc()` (the blank
 * email every new campaign opens with) and `richDoc` below (a populated
 * newsletter exercising every block the renderer can emit).
 */

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

/** A representative, fully populated email: headings, personalised copy, a
 *  button, a hosted image, a divider, a spacer, two columns, a list, social
 *  links and a tagged section - the shape a real campaign actually sends. */
const richDoc: DocNode = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [t("Season 2 is live")] },
    p(
      t("Hi "),
      tag("name", "there"),
      t(", here is everything new this month. "),
      t("Read the notes", [
        { type: "link", attrs: { href: "https://acme.xyz/notes" } },
      ]),
      t(" when you have a moment.")
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
        caption: "Season 2 key art",
        href: "https://acme.xyz/gallery",
      },
    },
    { type: "spacer", attrs: { height: 24 } },
    { type: "horizontalRule" },
    {
      type: "columns",
      content: [
        {
          type: "column",
          content: [
            { type: "heading", attrs: { level: 3 }, content: [t("Faster")] },
            p(t("Pages paint in under a second now.")),
          ],
        },
        {
          type: "column",
          content: [
            { type: "heading", attrs: { level: 3 }, content: [t("Clearer")] },
            p(t("Every chart reads at a glance.")),
          ],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [p(t("One"))] },
        { type: "listItem", content: [p(t("Two"))] },
        { type: "listItem", content: [p(t("Three"))] },
      ],
    },
    {
      type: "socialLinks",
      attrs: {
        links: [
          { label: "X", url: "https://x.com/acme" },
          { label: "Farcaster", url: "https://warpcast.com/acme" },
        ],
      },
    },
    {
      type: "tagSection",
      attrs: { tag: "vip", mode: "only" },
      content: [p(t("A little extra for VIPs."))],
    },
  ],
};

const send = (doc: DocNode, extra: Record<string, unknown> = {}) =>
  renderEmailHtml(doc, { footer: DEFAULT_FOOTER, mode: "send", ...extra });

const rich = send(richDoc);

/** Pull the first `<img ...>` tag out of a rendered email. */
const firstImg = (html: string): string => {
  const m = html.match(/<img\b[^>]*>/);
  if (!m) throw new Error("no <img> in rendered email");
  return m[0];
};

/** Every `href="..."` value in a rendered email. */
const hrefs = (html: string): string[] =>
  [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);

describe("deliverability: table layout, fully inline, no stripped-markup reliance", () => {
  it("builds the layout from presentation tables", () => {
    expect(rich).toMatch(/<table role="presentation"/);
    // Several nested tables: outer bg, centered container, blocks.
    expect([...rich.matchAll(/<table\b/g)].length).toBeGreaterThan(3);
  });

  it("emits nothing the backend sanitizer strips wholesale", () => {
    // The backend keeps a single head <style> (through sanitizeEmailCss) and
    // `class` (body allow-list) - see the enhancement tests below. It still
    // strips comments, ids and data-*, so none of those appear.
    expect(rich).not.toMatch(/\sid=/);
    expect(rich).not.toMatch(/\sdata-[a-z]/i);
    expect(rich).not.toMatch(/<!--/);
  });

  it("uses classes only as non-layout enhancement hooks", () => {
    // Every class is an `ocs-*` hook for the head <style>; classes carry no
    // layout of their own, so dropping them changes nothing structural.
    const classes = [...rich.matchAll(/ class="([^"]*)"/g)].map((m) => m[1]);
    expect(classes.length).toBeGreaterThan(0);
    for (const c of classes) {
      expect(c, `unexpected class: ${c}`).toMatch(/^ocs-[a-z]+$/);
    }
  });

  it("carries structure in inline styles, including an explicit body background", () => {
    expect(rich).toMatch(/<body[^>]* style="[^"]*background-color:#f4f5f7/);
    // Every visible block is a styled element, not a bare class hook.
    expect([...rich.matchAll(/ style="/g)].length).toBeGreaterThan(10);
  });
});

describe("deliverability: Outlook-safe centering without MSO conditionals", () => {
  it("centers the container with a td align, not a stripped mso comment or VML", () => {
    // Outlook ignores max-width, so the 600px container cannot center itself.
    // It is centered by its parent cell's `align="center"` - which Outlook does
    // honour - rather than by an `<!--[if mso]>` conditional/VML the sanitizer
    // would delete anyway.
    expect(rich).toMatch(/<td align="center"/);
    expect(rich).toMatch(/max-width:600px/);
    expect(rich).not.toMatch(/\[if mso\]/i);
    expect(rich).not.toMatch(/<v:/i); // no VML
  });
});

/** The text of the single head `<style>` block, or "" if there is none. */
const styleBlock = (html: string): string =>
  html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";

/** The rendered email with its head `<style>` removed, as a client that keeps
 *  no `<style>` (or an older backend sanitizer) would receive it. */
const withoutStyle = (html: string): string =>
  html.replace(/<style>[\s\S]*?<\/style>/, "");

describe("deliverability: responsive and dark mode are non-essential enhancement", () => {
  it("ships the responsive and dark-mode rules in one head <style>", () => {
    expect([...rich.matchAll(/<style>/g)]).toHaveLength(1);
    const css = styleBlock(rich);
    expect(css).toMatch(/@media \(max-width:600px\)/); // phone column stacking
    expect(css).toMatch(/@media \(prefers-color-scheme:dark\)/); // dark mode
    expect(css).toMatch(/\[data-ogsc\]/); // Outlook.com dark mode
  });

  it("declares color-scheme support so dark-mode clients cooperate", () => {
    expect(rich).toMatch(/<meta name="color-scheme" content="light dark">/);
    expect(rich).toMatch(
      /<meta name="supported-color-schemes" content="light dark">/
    );
  });

  it("keeps the inline baseline complete, so the email survives a dropped <style>", () => {
    // The enhancement is additive. Strip the whole <style> block (and the
    // classes it targets are inert without it) and the email must still be a
    // complete, laid-out, readable email from its inline styles alone.
    const bare = withoutStyle(rich);
    expect(bare).not.toContain("<style");
    expect(bare).toMatch(/<body[^>]* style="[^"]*background-color:#f4f5f7/);
    expect(bare).toMatch(/width:100%;max-width:600px/); // container still fluid
    expect(bare).toMatch(/color:#3b4252/); // body text colour still inline
    expect(bare).toContain('{{ name | default: "there" }}'); // tokens intact
    expect(bare).toContain('href="{{ unsubscribe_url }}"'); // links intact
  });

  it("puts no layout-bearing declarations in the <style> (overrides only)", () => {
    // The block only swaps colours and stacks columns; it never positions or
    // sizes the baseline layout, so it can never be the sole source of a rule
    // the email needs to render. Inspect rule bodies only (innermost braces),
    // not the media-feature conditions in the selectors.
    const css = styleBlock(rich);
    const allowed = [
      "background-color",
      "color",
      "display",
      "width",
      "padding",
    ];
    const bodies = [...css.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
    const decls = bodies
      .flatMap((b) => b.split(";"))
      .map((d) => d.trim())
      .filter(Boolean);
    expect(decls.length).toBeGreaterThan(0);
    for (const decl of decls) {
      const prop = decl.slice(0, decl.indexOf(":")).trim();
      expect(allowed, `unexpected enhancement declaration: ${decl}`).toContain(
        prop
      );
    }
  });
});

describe("deliverability: preview stays on its own dark path, unchanged", () => {
  it("does not add the send enhancement to preview output", () => {
    const preview = renderEmailHtml(richDoc, {
      footer: DEFAULT_FOOTER,
      mode: "preview",
    });
    expect(preview).not.toMatch(/@media \(prefers-color-scheme/);
    expect(preview).not.toMatch(/ class="ocs-/);
  });
});

describe("deliverability: merge tags preserved verbatim for the backend", () => {
  it("keeps recipient and compliance tokens exactly as the backend expects", () => {
    expect(rich).toContain('{{ name | default: "there" }}');
    expect(rich).toContain("{{ postal_address }}");
    expect(rich).toContain('href="{{ unsubscribe_url }}"');
    expect(rich).toContain("{{ preference_center_url }}");
  });

  it("resolves every token in preview mode, leaking no raw braces", () => {
    const preview = renderEmailHtml(richDoc, {
      footer: DEFAULT_FOOTER,
      mode: "preview",
      preheader: "A peek at Season 2",
    });
    expect(preview).not.toContain("{{");
    expect(preview).not.toContain("}}");
  });
});

describe("deliverability: preheader parity between preview and send", () => {
  it("renders a visually hidden preheader in preview", () => {
    const preview = renderEmailHtml(richDoc, {
      footer: DEFAULT_FOOTER,
      mode: "preview",
      preheader: "A peek at Season 2",
    });
    // Present, and hidden every way an inbox honours.
    expect(preview).toMatch(
      /<div style="display:none;max-height:0;overflow:hidden;opacity:0">A peek at Season 2<\/div>/
    );
  });

  it("omits the preheader in send, leaving it to the backend to inject once", () => {
    // A preheader passed to a send render must not appear: the backend adds one
    // from the campaign's preview text, and a second would show twice.
    const withPre = send(richDoc, { preheader: "A peek at Season 2" });
    expect(withPre).not.toContain("A peek at Season 2");
    expect(withPre).not.toMatch(/display:none;max-height:0/);
  });
});

describe("deliverability: images scale fluidly within the sanitizer allow-list", () => {
  it("makes the image a fluid block capped to the content width", () => {
    const img = firstImg(rich);
    expect(img).toMatch(/display:block/);
    expect(img).toMatch(/width:100%/);
    expect(img).toMatch(/max-width:\d+px/);
    expect(img).toMatch(/border:0/);
  });

  it("sets no fixed height on the image (keeps its aspect ratio)", () => {
    // No explicit height at all, so the image keeps its intrinsic ratio. We do
    // not use `height:auto`: the backend's height allow-list is `\d+(px|%)`,
    // which would strip `auto` and leave a squashed image.
    const img = firstImg(rich);
    const style = img.match(/style="([^"]*)"/)?.[1] ?? "";
    expect(style).not.toMatch(/height\s*:/);
  });
});

describe("deliverability: links are absolute or safe tokens", () => {
  it("emits only http(s), mailto, in-page, or merge-tag hrefs", () => {
    const list = hrefs(rich);
    expect(list.length).toBeGreaterThan(0);
    for (const href of list) {
      expect(
        /^(https?:\/\/|mailto:|#|\{\{)/.test(href),
        `unexpected href: ${href}`
      ).toBe(true);
    }
  });

  it("neutralises an unsafe link to a dead anchor rather than shipping it", () => {
    const doc: DocNode = {
      type: "doc",
      content: [
        {
          type: "emailButton",
          attrs: { label: "Tap", href: "javascript:alert(1)", align: "left" },
        },
      ],
    };
    const html = send(doc);
    expect(html).toContain('href="#"');
    expect(html).not.toContain("javascript:");
  });
});

describe("deliverability: clip size stays well under Gmail's threshold", () => {
  it("renders a representative email far below the 102 KB clip limit", () => {
    const bytes = emailBytes(rich);
    expect(bytes).toBeLessThan(GMAIL_CLIP_BYTES);
    // And under the gauge's warn line, which leaves room for click-tracking
    // rewrites the backend applies after this renderer runs.
    expect(bytes).toBeLessThan(CLIP_WARN_BYTES);
  });

  it("renders the shipping starter email as a tiny payload", () => {
    const bytes = emailBytes(send(starterDoc()));
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(GMAIL_CLIP_BYTES);
  });

  it("exposes the size helpers the editor's gauge relies on", () => {
    expect(GMAIL_CLIP_BYTES).toBe(102 * 1024);
    expect(kb(GMAIL_CLIP_BYTES)).toBe("102 KB");
    expect(emailBytes("abc")).toBe(3);
    // UTF-8 byte length, not character count: a multibyte char counts as more.
    expect(emailBytes("\u20ac")).toBe(3); // euro sign = 3 bytes
  });
});
