import {
  findMergeTag,
  MERGE_TAGS,
  TAG_TOKEN,
  tagToken,
} from "../data/merge-tags";
import type { DocMark, DocNode } from "../types/email-doc";
import { sectionRule, sectionShows } from "./doc-text";
import { safeHref, safeSrc, sanitizeEmailHtml } from "./email-safety";

/**
 * Turns the email document into inbox HTML.
 *
 * Every send goes through the backend's sanitizer (onchain-backend
 * common/utils/sanitize.util.ts) before it reaches an inbox, and it keeps far
 * less than a browser would. This renderer only emits what survives it:
 *  - no `<style>`, classes, ids, data-* or comments (all stripped), so there are
 *    no media queries and no Outlook conditional comments;
 *  - only longhand inline styles from its allow-list: `font-family`,
 *    `font-size`, `font-weight`, `line-height` rather than the `font:` shorthand,
 *    which it drops (taking the typography with it), and sizes with units;
 *  - no `<s>`: strikethrough is a `text-decoration` span.
 * It also leaves out the preheader in `send` mode: the backend injects one from
 * the campaign's preview text, and a second would show twice.
 */

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const INK = "#010f31";
const BODY = "#3b4252";
const MUTED = "#6b7280";
const RULE = "#e3e6ec";
export const DEFAULT_ACCENT = "#1727e0";

/** Text content: `"` is left alone so `{{ x | default: "y" }}` tokens survive. */
const escText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => escText(s).replace(/"/g, "&quot;");

const font = (size: number, weight = 400, lh = 1.6) =>
  `font-family:${FONT};font-size:${size}px;font-weight:${weight};line-height:${lh}`;

export interface RenderOptions {
  footer: string;
  /** `send`: merge tags as backend tokens, tag sections as `{% if %}` blocks.
   *  `preview`: sample values, and only the sections `contactTags` would see. */
  mode: "send" | "preview";
  /** Preview only: shown as the hidden preheader. */
  preheader?: string;
  /** Preview only: the contact's tags, or null for "everyone". */
  contactTags?: string[] | null;
  accent?: string;
  /** Preview only: as a mail app in dark mode that inverts colours. */
  dark?: boolean;
}

const SAMPLES: Record<string, string> = Object.fromEntries(
  MERGE_TAGS.map((t) => [t.key, t.sample])
);

/** Preview: replace any `{{ key }}` token in a string with its sample value. */
const fillSamples = (s: string) =>
  s.replace(TAG_TOKEN, (match, key: string) => SAMPLES[key] ?? match);

const isLinkTag = (key: string) =>
  key === "unsubscribe_url" || key === "preference_center_url";

export function renderEmailHtml(doc: DocNode, opts: RenderOptions): string {
  const accent = opts.accent ?? DEFAULT_ACCENT;
  const preview = opts.mode === "preview";
  const fill = (s: string) => (preview ? fillSamples(s) : s);
  const href = (raw: unknown) => escAttr(fill(safeHref(raw)));

  const marks = (html: string, list: DocMark[] | undefined): string => {
    let out = html;
    for (const m of list ?? []) {
      if (m.type === "bold") out = `<strong>${out}</strong>`;
      else if (m.type === "italic") out = `<em>${out}</em>`;
      else if (m.type === "underline") out = `<u>${out}</u>`;
      else if (m.type === "strike")
        out = `<span style="text-decoration:line-through">${out}</span>`;
      else if (m.type === "code")
        out = `<code style="font-family:Menlo,Consolas,monospace;font-size:14px;background-color:#f1f3f6;padding:1px 4px;border-radius:3px">${out}</code>`;
      else if (m.type === "link")
        out = `<a href="${href(m.attrs?.href ?? "#")}" style="color:${accent};text-decoration:underline">${out}</a>`;
    }
    return out;
  };

  const mergeTag = (n: DocNode): string => {
    const key = String(n.attrs?.key ?? "");
    const fallback = String(n.attrs?.fallback ?? "");
    if (preview) return escText(SAMPLES[key] ?? fallback);
    return tagToken(key, fallback);
  };

  const inline = (nodes: DocNode[] = []): string =>
    nodes
      .map((n) => {
        if (n.type === "text")
          return marks(escText(fill(n.text ?? "")), n.marks);
        if (n.type === "mergeTag") return marks(mergeTag(n), n.marks);
        if (n.type === "hardBreak") return "<br>";
        return "";
      })
      .join("");

  const align = (n: DocNode) => {
    const a = n.attrs?.textAlign;
    return a === "center" || a === "right" ? `text-align:${a};` : "";
  };

  const fullWidth = (inner: string, style = "") =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"${style ? ` style="${style}"` : ""}><tr><td>${inner}</td></tr></table>`;

  const block = (n: DocNode): string => {
    switch (n.type) {
      case "paragraph":
        return `<p style="margin:0 0 16px;${font(16)};color:${BODY};${align(n)}">${inline(n.content) || "&nbsp;"}</p>`;
      case "heading": {
        const lvl = Number(n.attrs?.level ?? 2);
        const size = lvl === 1 ? 28 : lvl === 2 ? 22 : 18;
        return `<h${lvl} style="margin:0 0 12px;${font(size, 600, 1.25)};color:${INK};${align(n)}">${inline(n.content)}</h${lvl}>`;
      }
      case "bulletList":
      case "orderedList": {
        const tag = n.type === "bulletList" ? "ul" : "ol";
        const items = (n.content ?? [])
          .map(
            (li) =>
              `<li style="margin:0 0 6px">${(li.content ?? [])
                .map((c) =>
                  c.type === "paragraph" ? inline(c.content) : block(c)
                )
                .join("")}</li>`
          )
          .join("");
        return `<${tag} style="margin:0 0 16px;padding-left:24px;${font(16)};color:${BODY}">${items}</${tag}>`;
      }
      case "blockquote":
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px"><tr><td style="border-left:3px solid ${accent};padding:4px 0 4px 16px;${font(16)};font-style:italic;color:${BODY}">${(n.content ?? []).map(block).join("")}</td></tr></table>`;
      case "codeBlock":
        return `<pre style="margin:0 0 16px;padding:12px 14px;background-color:#f1f3f6;border-radius:6px;font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.5;color:${INK}">${escText((n.content ?? []).map((c) => c.text ?? "").join(""))}</pre>`;
      case "horizontalRule":
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px"><tr><td style="border-top:1px solid ${RULE};font-size:0px;line-height:0">&nbsp;</td></tr></table>`;
      case "spacer": {
        const h = Math.max(4, Math.min(120, Number(n.attrs?.height ?? 24)));
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="${h}" style="height:${h}px;font-size:0px;line-height:0">&nbsp;</td></tr></table>`;
      }
      case "emailButton": {
        const label = escText(fill(String(n.attrs?.label ?? "Open")));
        const where = n.attrs?.align === "center" ? "center" : "left";
        /* A coloured cell with the link inside: every client, Outlook included,
           paints the cell, and nothing here depends on stripped markup. */
        return (
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px"><tr><td align="${where}">` +
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${accent}" style="background-color:${accent};border-radius:6px;padding:12px 24px">` +
          `<a href="${href(String(n.attrs?.href ?? "").trim() ? n.attrs?.href : "#")}" style="color:#ffffff;${font(15, 600, 1.2)};text-decoration:none;display:inline-block">${label}</a>` +
          `</td></tr></table></td></tr></table>`
        );
      }
      case "emailImage": {
        const src = safeSrc(n.attrs?.src);
        const alt = escAttr(fill(String(n.attrs?.alt ?? "")));
        const caption = String(n.attrs?.caption ?? "");
        const link = n.attrs?.href ? safeHref(n.attrs.href) : "";
        const img = src
          ? `<img src="${escAttr(src)}" alt="${alt}" width="552" style="display:block;width:100%;max-width:552px;border:0;border-radius:6px">`
          : `<div style="padding:48px 16px;background-color:#eef1fb;border-radius:6px;text-align:center;${font(13, 500)};color:${accent}">${alt || "Image"}</div>`;
        /* The link goes inside the cell: Outlook ignores links wrapped around tables. */
        const linked = link
          ? `<a href="${escAttr(fill(link))}" style="text-decoration:none">${img}</a>`
          : img;
        const cap = caption
          ? `<p style="margin:8px 0 0;${font(13, 400, 1.5)};color:${MUTED};text-align:center">${escText(fill(caption))}</p>`
          : "";
        return fullWidth(linked + cap, "margin:0 0 20px");
      }
      case "columns": {
        const cols = n.content ?? [];
        const w = Math.floor(100 / Math.max(cols.length, 1));
        const cells = cols
          .map((c, i) => {
            const pad =
              i === 0
                ? "padding-right:12px"
                : i === cols.length - 1
                  ? "padding-left:12px"
                  : "padding:0 6px";
            return `<td width="${w}%" valign="top" style="vertical-align:top;${pad}">${(c.content ?? []).map(block).join("")}</td>`;
          })
          .join("");
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr>${cells}</tr></table>`;
      }
      case "socialLinks": {
        const links =
          (n.attrs?.links as { label: string; url: string }[] | undefined) ??
          [];
        const parts = links.map(
          (l) =>
            `<a href="${href(l.url)}" style="color:${accent};text-decoration:none;font-weight:600">${escText(l.label)}</a>`
        );
        return `<p style="margin:0 0 16px;${font(14)};color:${MUTED};text-align:center">${parts.join(" &nbsp;·&nbsp; ")}</p>`;
      }
      case "htmlBlock":
        return sanitizeEmailHtml(String(n.attrs?.html ?? "")).html;
      case "tagSection": {
        const body = (n.content ?? []).map(block).join("");
        const { tag, mode } = sectionRule(n.attrs);
        if (preview)
          return sectionShows(n.attrs, opts.contactTags ?? null) ? body : "";
        if (!tag) return body;
        /* The backend evaluates this per recipient (campaign.service evalCondition). */
        const safeTag = tag.replace(/['%{}]/g, "");
        return `{% if ${mode === "except" ? "not " : ""}'${safeTag}' in profile.tags %}${body}{% endif %}`;
      }
      default:
        return (n.content ?? []).map(block).join("");
    }
  };

  const footer = renderFooter(opts.footer, preview);
  const pre =
    preview && opts.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escText(fillSamples(opts.preheader))}</div>`
      : "";
  const head = preview
    ? `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${
        opts.dark
          ? "<style>html{background:#111}body{filter:invert(1) hue-rotate(180deg)}img{filter:invert(1) hue-rotate(180deg)}</style>"
          : ""
      }</head>`
    : `<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`;

  return (
    `<!doctype html><html lang="en">${head}` +
    `<body style="margin:0;padding:0;background-color:#f4f5f7">${pre}` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f5f7" style="background-color:#f4f5f7"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px"><tr><td style="padding:24px">${(
      doc.content ?? []
    )
      .map(block)
      .join(
        ""
      )}</td></tr><tr><td style="padding:16px 24px 24px;border-top:1px solid ${RULE};${font(12)};color:${MUTED}">${footer}</td></tr></table>` +
    `</td></tr></table></body></html>`
  );
}

/**
 * The footer, line by line. Unsubscribe and preference tags become links with
 * a readable label (the URL itself is long and per-recipient), other tags
 * become their tokens, and plain web addresses become links.
 */
function renderFooter(footer: string, preview: boolean): string {
  return footer
    .split("\n")
    .map((line) => {
      let out = "";
      let last = 0;
      for (const m of line.matchAll(TAG_TOKEN)) {
        out += linkify(escText(line.slice(last, m.index)));
        const [, key] = m;
        const tag = findMergeTag(key);
        if (isLinkTag(key)) {
          const url = preview ? (tag?.sample ?? "#") : `{{ ${key} }}`;
          const label =
            key === "unsubscribe_url" ? "Unsubscribe" : "Manage preferences";
          out += `<a href="${escAttr(url)}" style="color:${MUTED};text-decoration:underline">${label}</a>`;
        } else if (preview) {
          out += escText(tag?.sample ?? "");
        } else {
          out += tagToken(key, tag?.fallback ?? "");
        }
        last = (m.index ?? 0) + m[0].length;
      }
      out += linkify(escText(line.slice(last)));
      return out;
    })
    .join("<br>");
}

const linkify = (escaped: string) =>
  escaped.replace(
    /https?:\/\/[^\s<·]+/g,
    (url) =>
      `<a href="${url}" style="color:${MUTED};text-decoration:underline">${url}</a>`
  );

/**
 * The plain-text part, kept in step with the HTML. The backend keeps whatever
 * text was saved last (an empty one can't clear it), so a stale text part
 * would otherwise go out with a new design.
 */
export function renderEmailText(doc: DocNode, footer: string): string {
  const lines: string[] = [];
  const inlineText = (nodes: DocNode[] = []): string =>
    nodes
      .map((n) => {
        if (n.type === "text") {
          const link = n.marks?.find((m) => m.type === "link");
          const text = n.text ?? "";
          return link ? `${text} (${String(link.attrs?.href ?? "")})` : text;
        }
        if (n.type === "mergeTag")
          return tagToken(
            String(n.attrs?.key ?? ""),
            String(n.attrs?.fallback ?? "")
          );
        if (n.type === "hardBreak") return "\n";
        return "";
      })
      .join("");
  const walk = (n: DocNode) => {
    switch (n.type) {
      case "paragraph":
      case "heading":
        lines.push(inlineText(n.content));
        return;
      case "bulletList":
      case "orderedList":
        (n.content ?? []).forEach((li, i) => {
          const text = (li.content ?? [])
            .map((c) => inlineText(c.content))
            .join(" ");
          lines.push(`${n.type === "orderedList" ? `${i + 1}.` : "-"} ${text}`);
        });
        return;
      case "emailButton":
        lines.push(
          `${String(n.attrs?.label ?? "")}: ${String(n.attrs?.href ?? "")}`
        );
        return;
      case "horizontalRule":
        lines.push("---");
        return;
      case "tagSection": {
        const { tag, mode } = sectionRule(n.attrs);
        const safeTag = tag.replace(/['%{}]/g, "");
        if (tag)
          lines.push(
            `{% if ${mode === "except" ? "not " : ""}'${safeTag}' in profile.tags %}`
          );
        (n.content ?? []).forEach(walk);
        if (tag) lines.push("{% endif %}");
        return;
      }
      case "emailImage":
      case "spacer":
      case "htmlBlock":
      case "socialLinks":
        return;
      default:
        (n.content ?? []).forEach(walk);
    }
  };
  walk(doc);
  const body = lines
    .filter((l, i, all) => l.trim() || (i > 0 && all[i - 1].trim()))
    .join("\n\n");
  const foot = footer.replace(TAG_TOKEN, (_m, key: string) =>
    isLinkTag(key)
      ? `{{ ${key} }}`
      : tagToken(key, findMergeTag(key)?.fallback ?? "")
  );
  return `${body.trim()}\n\n--\n${foot}`;
}

/** Gmail clips any message over 102KB, hiding the rest (footer included). */
export const GMAIL_CLIP_BYTES = 102 * 1024;
/** Where the gauge starts warning: leave room for click-tracking rewrites. */
export const CLIP_WARN_BYTES = 90 * 1024;

export const emailBytes = (html: string): number =>
  new TextEncoder().encode(html).length;

export const kb = (bytes: number): string =>
  `${Math.max(1, Math.round(bytes / 1024))} KB`;
