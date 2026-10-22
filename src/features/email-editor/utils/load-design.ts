import { isJsonObject } from "@/lib/utils";

import {
  DEFAULT_FOOTER,
  defaultFallback,
  findMergeTag,
} from "../data/merge-tags";
import {
  type DocNode,
  EMAIL_DOC_FORMAT,
  type SavedEmailDesign,
} from "../types/email-doc";

/**
 * Opening a saved design in the editor, whatever made it:
 *  1. this editor's own document (`format: "os-email-doc@1"`): opened as is;
 *  2. the older block builders' JSON - the in-house editor's
 *     `{ version: 2, root, blocks }` or the hosted builder's flat
 *     `{ root: { type: "EmailLayout" }, "<id>": block }` - converted block by
 *     block, so those designs keep their structure;
 *  3. HTML only (library templates, pasted designs): handed to the editor to
 *     parse, which keeps headings, paragraphs, lists, links and images;
 *  4. nothing: a starter email.
 */

export type LoadedDesign =
  | { kind: "doc"; doc: DocNode; footer: string }
  | { kind: "legacy"; doc: DocNode; footer: string }
  | { kind: "html"; html: string; footer: string }
  | { kind: "blank"; doc: DocNode; footer: string };

/** A fresh email: a headline, one personalised line and a button. */
export function starterDoc(): DocNode {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1, textAlign: null },
        content: [{ type: "text", text: "Your headline" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hi " },
          {
            type: "mergeTag",
            attrs: { key: "name", fallback: defaultFallback("name") },
          },
          {
            type: "text",
            text: ", say what this email is about and why it matters to them.",
          },
        ],
      },
      {
        type: "emailButton",
        attrs: { label: "Open the app", href: "", align: "left" },
      },
    ],
  };
}

const isDesign = (json: unknown): json is SavedEmailDesign =>
  isJsonObject(json) &&
  json.format === EMAIL_DOC_FORMAT &&
  isJsonObject(json.doc) &&
  json.doc.type === "doc";

export function loadDesign(content: {
  json?: unknown;
  html?: unknown;
}): LoadedDesign {
  const { json } = content;
  if (isDesign(json)) {
    return {
      kind: "doc",
      doc: json.doc,
      footer:
        typeof json.footer === "string" && json.footer.trim()
          ? json.footer
          : DEFAULT_FOOTER,
    };
  }
  const legacy = legacyBlocksToDoc(json);
  if (legacy) return { kind: "legacy", doc: legacy, footer: DEFAULT_FOOTER };
  const html = typeof content.html === "string" ? content.html.trim() : "";
  if (html) return { kind: "html", html, footer: DEFAULT_FOOTER };
  return { kind: "blank", doc: starterDoc(), footer: DEFAULT_FOOTER };
}

/* ---------------- merge tags inside legacy text ---------------- */

const TOKEN =
  /\{\{\s*([a-z_][a-z0-9_.]*)\s*(?:\|\s*default:\s*["']?([^"'}]*?)["']?\s*)?\}\}/gi;

/** Plain text with `{{ key }}` tokens: known keys become chips, the rest stays text. */
export function textWithTags(text: string): DocNode[] {
  const out: DocNode[] = [];
  let last = 0;
  const push = (t: string) => {
    if (t) out.push({ type: "text", text: t });
  };
  for (const m of text.matchAll(TOKEN)) {
    const [, key] = m;
    if (!findMergeTag(key)) continue;
    push(text.slice(last, m.index));
    out.push({
      type: "mergeTag",
      attrs: { key, fallback: m[2] ?? defaultFallback(key) },
    });
    last = (m.index ?? 0) + m[0].length;
  }
  push(text.slice(last));
  return out;
}

/** A text block's lines: a blank line starts a paragraph, a newline is a break. */
function paragraphs(text: string, textAlign: unknown): DocNode[] {
  const align =
    textAlign === "center" || textAlign === "right" ? textAlign : null;
  return text.split(/\n{2,}/).map((para) => {
    const content: DocNode[] = [];
    para.split("\n").forEach((line, i) => {
      if (i > 0) content.push({ type: "hardBreak" });
      content.push(...textWithTags(line));
    });
    return {
      type: "paragraph",
      attrs: { textAlign: align },
      ...(content.length ? { content } : {}),
    };
  });
}

/* ---------------- legacy block JSON ---------------- */

type Blocks = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const props = (b: Record<string, unknown>) =>
  isJsonObject(b.data) && isJsonObject(b.data.props) ? b.data.props : {};
const style = (b: Record<string, unknown>) =>
  isJsonObject(b.data) && isJsonObject(b.data.style) ? b.data.style : {};
const ids = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Locate the block map and the root's children in either legacy shape. */
function legacyShape(
  json: unknown
): { blocks: Blocks; rootChildren: string[] } | null {
  if (!isJsonObject(json)) return null;
  // In-house v2: { version: 2, root: "<id>", blocks: { ... } }
  if (typeof json.root === "string" && isJsonObject(json.blocks)) {
    const root = json.blocks[json.root];
    if (
      isJsonObject(root) &&
      root.type === "EmailLayout" &&
      isJsonObject(root.data)
    ) {
      return { blocks: json.blocks, rootChildren: ids(root.data.childrenIds) };
    }
  }
  // Hosted builder: { root: { type: "EmailLayout", data: { childrenIds } }, "<id>": block }
  if (
    isJsonObject(json.root) &&
    json.root.type === "EmailLayout" &&
    isJsonObject(json.root.data)
  ) {
    return { blocks: json, rootChildren: ids(json.root.data.childrenIds) };
  }
  return null;
}

const SOCIAL_LABELS: Record<string, string> = {
  x: "X",
  farcaster: "Farcaster",
  discord: "Discord",
  telegram: "Telegram",
  instagram: "Instagram",
  youtube: "YouTube",
  github: "GitHub",
  tiktok: "TikTok",
  reddit: "Reddit",
  medium: "Medium",
  lens: "Lens",
  website: "Website",
  email: "Email",
};

export function legacyBlocksToDoc(json: unknown): DocNode | null {
  const shape = legacyShape(json);
  if (!shape) return null;
  const { blocks } = shape;
  const seen = new Set<string>();

  const convert = (id: string): DocNode[] => {
    // A malformed design can loop; each block converts once.
    if (seen.has(id)) return [];
    seen.add(id);
    const b = blocks[id];
    if (!isJsonObject(b)) return [];
    const p = props(b);
    const s = style(b);
    switch (b.type) {
      case "Heading": {
        const level = str(p.level) === "h1" ? 1 : str(p.level) === "h3" ? 3 : 2;
        const align =
          s.textAlign === "center" || s.textAlign === "right"
            ? s.textAlign
            : null;
        const content = textWithTags(str(p.text));
        return [
          {
            type: "heading",
            attrs: { level, textAlign: align },
            ...(content.length ? { content } : {}),
          },
        ];
      }
      case "Text":
        return paragraphs(str(p.text), s.textAlign);
      case "Button":
        return [
          {
            type: "emailButton",
            attrs: {
              label: str(p.text) || "Open",
              href: str(p.url),
              align: s.textAlign === "center" ? "center" : "left",
            },
          },
        ];
      case "Image":
        return [
          {
            type: "emailImage",
            attrs: {
              src: str(p.url),
              alt: str(p.alt),
              caption: "",
              href: str(p.linkHref),
            },
          },
        ];
      case "Avatar":
        return [
          {
            type: "emailImage",
            attrs: {
              src: str(p.imageUrl),
              alt: str(p.alt),
              caption: "",
              href: "",
            },
          },
        ];
      case "Video":
        return [
          {
            type: "emailImage",
            attrs: {
              src: str(p.thumbnailUrl),
              alt: str(p.alt),
              caption: "",
              href: str(p.videoUrl),
            },
          },
        ];
      case "Divider":
        return [{ type: "horizontalRule" }];
      case "Spacer":
        return [{ type: "spacer", attrs: { height: Number(p.height) || 24 } }];
      case "Html":
        return str(p.contents).trim()
          ? [{ type: "htmlBlock", attrs: { html: str(p.contents) } }]
          : [];
      case "List": {
        const items = Array.isArray(p.items)
          ? p.items.map(str).filter(Boolean)
          : [];
        if (!items.length) return [];
        return [
          {
            type: p.ordered ? "orderedList" : "bulletList",
            content: items.map((it) => ({
              type: "listItem",
              content: [{ type: "paragraph", content: textWithTags(it) }],
            })),
          },
        ];
      }
      case "Social": {
        const links = (Array.isArray(p.links) ? p.links : [])
          .filter(isJsonObject)
          .map((l) => ({
            label: SOCIAL_LABELS[str(l.platform)] ?? str(l.platform),
            url: str(l.url),
          }))
          .filter((l) => l.url);
        return links.length ? [{ type: "socialLinks", attrs: { links } }] : [];
      }
      case "Menu": {
        const links = (Array.isArray(p.items) ? p.items : [])
          .filter(isJsonObject)
          .map((l) => ({ label: str(l.label), url: str(l.url) }))
          .filter((l) => l.label && l.url);
        return links.length ? [{ type: "socialLinks", attrs: { links } }] : [];
      }
      case "Container":
        return ids(p.childrenIds).flatMap(convert);
      case "ColumnsContainer": {
        const cols = (Array.isArray(p.columns) ? p.columns : [])
          .filter(isJsonObject)
          .slice(0, 3);
        if (cols.length < 2)
          return cols.flatMap((c) => ids(c.childrenIds).flatMap(convert));
        return [
          {
            type: "columns",
            content: cols.map((c) => {
              const inner = ids(c.childrenIds).flatMap(convert);
              return {
                type: "column",
                content: inner.length ? inner : [{ type: "paragraph" }],
              };
            }),
          },
        ];
      }
      default:
        return [];
    }
  };

  const content = shape.rootChildren.flatMap(convert);
  return {
    type: "doc",
    content: content.length ? content : [{ type: "paragraph" }],
  };
}
