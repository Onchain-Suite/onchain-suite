/**
 * In-repo email block model. A campaign email is a flat list of blocks plus a
 * compliance footer; the editor edits both and renders them to email-safe HTML
 * on save (the same `{ html, json, textVersion }` contract the send path
 * already consumes).
 *
 * The HTML is table-based with inline styles and Outlook (MSO) fallbacks so it
 * renders consistently in Gmail, Outlook (desktop/365), and Apple Mail. Every
 * block is its own table row; buttons use `mso-padding-alt` so Outlook keeps
 * the padded pill; the spacer is a real table row, not a bare div.
 */

export type EmailBlock =
  | { id: string; type: "heading"; content: string }
  | { id: string; type: "text"; content: string }
  | { id: string; type: "button"; content: string; url: string }
  | { id: string; type: "image"; src: string; alt: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: number };

export type EmailBlockType = EmailBlock["type"];

/**
 * The always-on compliance footer. Address / unsubscribe / manage-preferences
 * resolve per-recipient at send time via merge tags, so the editor only owns
 * the opt-in reason line and whether the footer is present (removing it flips
 * the compliance badge to a warning — it should effectively always stay on).
 */
export interface EmailFooter {
  enabled: boolean;
  /** Opt-in reason line; may contain merge tags (e.g. {{ sender_name }}). */
  optInReason: string;
}

export interface EmailDocument {
  version: 1;
  blocks: EmailBlock[];
  footer: EmailFooter;
}

export const DEFAULT_FOOTER: EmailFooter = {
  enabled: true,
  optInReason:
    "You're receiving this because you opted in at {{ sender_name }}.",
};

/** Merge tags offered in the inspector; resolved per-recipient at send time. */
export const MERGE_TAGS: { label: string; token: string }[] = [
  { label: "First name", token: "first_name" },
  { label: "ENS or wallet", token: "ens_or_wallet" },
  { label: "Wallet (short)", token: "wallet_short" },
  { label: "Sender name", token: "sender_name" },
  { label: "Postal address", token: "postal_address" },
  { label: "Sender email", token: "sender_email" },
  { label: "Campaign name", token: "campaign_name" },
  { label: "Unsubscribe link", token: "unsubscribe_url" },
  { label: "Manage preferences", token: "manage_preferences_url" },
];

let idCounter = 0;
export function newBlockId(): string {
  idCounter += 1;
  return `blk_${idCounter}_${Math.floor(idCounter * 2654435761) % 100000}`;
}

export function createBlock(type: EmailBlockType): EmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading":
      return { id, type, content: "New heading" };
    case "text":
      return { id, type, content: "Write your message here." };
    case "button":
      return { id, type, content: "Click here", url: "https://" };
    case "image":
      return { id, type, src: "", alt: "" };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, size: 24 };
  }
}

export function defaultDocument(): EmailDocument {
  return {
    version: 1,
    blocks: [
      { id: newBlockId(), type: "heading", content: "New heading" },
      {
        id: newBlockId(),
        type: "text",
        content: "Write your message here.",
      },
      { id: newBlockId(), type: "button", content: "Open", url: "https://" },
    ],
    footer: { ...DEFAULT_FOOTER },
  };
}

/** Parse a saved document; returns null if it isn't our block format. */
export function parseDocument(raw: unknown): EmailDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const blocks = Array.isArray(obj.blocks) ? obj.blocks : null;
  if (!blocks) return null;
  const parsed = blocks.filter(
    (b): b is EmailBlock =>
      Boolean(b) &&
      typeof (b as EmailBlock).id === "string" &&
      typeof (b as EmailBlock).type === "string"
  );
  const footerRaw =
    obj.footer && typeof obj.footer === "object"
      ? (obj.footer as Record<string, unknown>)
      : null;
  const footer: EmailFooter = footerRaw
    ? {
        enabled: footerRaw.enabled !== false,
        optInReason:
          typeof footerRaw.optInReason === "string"
            ? footerRaw.optInReason
            : DEFAULT_FOOTER.optInReason,
      }
    : { ...DEFAULT_FOOTER };
  return { version: 1, blocks: parsed, footer };
}

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Newlines → <br> for text blocks (content is escaped first). */
const escMultiline = (value: string) => esc(value).replace(/\n/g, "<br />");

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** The inner HTML for a single block (goes inside its own <td>). */
function renderBlockInner(block: EmailBlock, accent: string): string {
  switch (block.type) {
    case "heading":
      return `<h1 style="margin:0;font-family:${FONT_STACK};font-size:24px;line-height:1.3;font-weight:700;color:#111111;">${escMultiline(
        block.content
      )}</h1>`;
    case "text":
      return `<p style="margin:0;font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:#333333;">${escMultiline(
        block.content
      )}</p>`;
    case "button": {
      const href = esc(block.url || "#");
      const label = esc(block.content);
      // Background on the <td> + mso-padding-alt keeps the padded pill in
      // Outlook (which ignores padding on the inner <a>).
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${esc(
        accent
      )}" style="border-radius:8px;background:${esc(
        accent
      )};mso-padding-alt:12px 24px;"><a href="${href}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a></td></tr></table>`;
    }
    case "image":
      return block.src
        ? `<img src="${esc(block.src)}" alt="${esc(
            block.alt
          )}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;outline:none;text-decoration:none;" />`
        : `<div style="padding:40px;text-align:center;background:#f2f3f5;color:#9aa0a6;font-family:${FONT_STACK};font-size:13px;border-radius:8px;">Image</div>`;
    case "divider":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e6e8eb;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;
    case "spacer": {
      const h = Math.max(0, Math.min(120, block.size));
      return `<div style="height:${h}px;line-height:${h}px;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</div>`;
    }
  }
}

/** Wrap a block's inner HTML in its own spaced table row. */
function renderBlockRow(block: EmailBlock, accent: string): string {
  const pad = block.type === "spacer" ? 0 : 12;
  return `<tr><td style="padding-bottom:${pad}px;">${renderBlockInner(
    block,
    accent
  )}</td></tr>`;
}

/** The compliance footer row (physical address + unsubscribe + manage prefs). */
function renderFooterRow(footer: EmailFooter): string {
  if (!footer.enabled) return "";
  const reason = escMultiline(footer.optInReason);
  return `<tr><td style="padding:24px 32px;border-top:1px solid #e6e8eb;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:#8a9099;">${reason}<br />{{ sender_name }} · {{ postal_address }}<br /><a href="{{ unsubscribe_url }}" target="_blank" style="color:#8a9099;text-decoration:underline;">Unsubscribe</a> · <a href="{{ manage_preferences_url }}" target="_blank" style="color:#8a9099;text-decoration:underline;">Manage preferences</a></td></tr>`;
}

/**
 * Render the block list + footer to a full, email-safe HTML document (600px
 * centered canvas, inline styles, MSO fallbacks). `accent` colours buttons.
 */
export function renderDocumentToHtml(doc: EmailDocument, accent = "#4f46e5") {
  const rows = doc.blocks.map((b) => renderBlockRow(b, accent)).join("\n");
  const footer = renderFooterRow(doc.footer ?? DEFAULT_FOOTER);
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light dark" />
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  html,body{margin:0!important;padding:0!important;width:100%!important;}
  *{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
  a{text-decoration:none;}
  @media only screen and (max-width:600px){.ocs-container{width:100%!important;}}
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="ocs-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;">
<tr><td style="padding:32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows}
</table>
</td></tr>
${footer}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text fallback for deliverability. */
export function renderDocumentToText(doc: EmailDocument): string {
  const body = doc.blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
        case "text":
          return b.content;
        case "button":
          return `${b.content}: ${b.url}`;
        case "image":
          return b.alt || "";
        case "divider":
          return "----";
        case "spacer":
          return "";
      }
    })
    .filter((line) => line.length > 0)
    .join("\n\n");
  const footer = doc.footer?.enabled
    ? `\n\n----\n${doc.footer.optInReason}\n{{ sender_name }} · {{ postal_address }}\nUnsubscribe: {{ unsubscribe_url }} · Manage preferences: {{ manage_preferences_url }}`
    : "";
  return `${body}${footer}`;
}

/**
 * Best-effort HTML → block document parser for the Import HTML flow. Runs in
 * the browser (uses DOMParser); walks the parsed body and maps common elements
 * to blocks. Anything it can't classify becomes a text block so no copy is
 * lost. Falls back to a single text block if parsing yields nothing.
 */
export function parseHtmlToDocument(html: string): EmailDocument {
  const blocks: EmailBlock[] = [];
  const pushText = (raw: string) => {
    const text = raw.replace(/\s+/g, " ").trim();
    if (text) blocks.push({ id: newBlockId(), type: "text", content: text });
  };

  if (typeof DOMParser === "undefined") {
    // Non-browser fallback: strip tags into one text block.
    pushText(html.replace(/<[^>]+>/g, " "));
    return { version: 1, blocks, footer: { ...DEFAULT_FOOTER } };
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const root = parsed.body ?? parsed.documentElement;

  const isButtonLike = (a: HTMLAnchorElement) => {
    const style = (a.getAttribute("style") ?? "").toLowerCase();
    const role = (a.getAttribute("role") ?? "").toLowerCase();
    return (
      role === "button" ||
      style.includes("background") ||
      style.includes("border-radius") ||
      style.includes("padding")
    );
  };

  const textFromBr = (el: Element) =>
    el.innerHTML
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim();

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        const content = child.textContent?.trim() ?? "";
        if (content)
          blocks.push({ id: newBlockId(), type: "heading", content });
      } else if (tag === "p") {
        const content = textFromBr(child);
        if (content) blocks.push({ id: newBlockId(), type: "text", content });
      } else if (tag === "img") {
        const src = child.getAttribute("src") ?? "";
        if (src)
          blocks.push({
            id: newBlockId(),
            type: "image",
            src,
            alt: child.getAttribute("alt") ?? "",
          });
      } else if (tag === "hr") {
        blocks.push({ id: newBlockId(), type: "divider" });
      } else if (tag === "a") {
        const a = child as HTMLAnchorElement;
        const label = a.textContent?.trim() ?? "";
        if (label && isButtonLike(a)) {
          blocks.push({
            id: newBlockId(),
            type: "button",
            content: label,
            url: a.getAttribute("href") ?? "#",
          });
        } else if (label) {
          pushText(label);
        }
      } else if (child.querySelector("img, a, h1, h2, h3, p, hr")) {
        // Container (table, div, td…): recurse to find real content.
        walk(child);
      } else {
        pushText(child.textContent ?? "");
      }
    }
  };

  walk(root);

  if (blocks.length === 0) pushText(root.textContent ?? "");
  return { version: 1, blocks, footer: { ...DEFAULT_FOOTER } };
}
