/**
 * In-repo email block model. A campaign email is a flat list of blocks; the
 * editor edits the list and renders it to email-safe HTML on save (the same
 * `{ html, json, textVersion }` contract the send path already consumes).
 *
 * This is the monorepo replacement for the external iframe builder — a first
 * pass with the core block types; extend as needed.
 */

export type EmailBlock =
  | { id: string; type: "heading"; content: string }
  | { id: string; type: "text"; content: string }
  | { id: string; type: "button"; content: string; url: string }
  | { id: string; type: "image"; src: string; alt: string }
  | { id: string; type: "divider" }
  | { id: string; type: "spacer"; size: number };

export type EmailBlockType = EmailBlock["type"];

export interface EmailDocument {
  version: 1;
  blocks: EmailBlock[];
}

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
  return { version: 1, blocks: parsed };
}

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Newlines → <br> for text blocks (content is escaped first). */
const escMultiline = (value: string) => esc(value).replace(/\n/g, "<br />");

function renderBlock(block: EmailBlock, accent: string): string {
  switch (block.type) {
    case "heading":
      return `<h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;font-weight:700;color:#111111;">${escMultiline(
        block.content
      )}</h1>`;
    case "text":
      return `<p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#333333;">${escMultiline(
        block.content
      )}</p>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr><td style="border-radius:8px;background:${esc(
        accent
      )};"><a href="${esc(
        block.url || "#"
      )}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(
        block.content
      )}</a></td></tr></table>`;
    case "image":
      return block.src
        ? `<img src="${esc(block.src)}" alt="${esc(
            block.alt
          )}" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:8px 0;" />`
        : `<div style="margin:8px 0;padding:40px;text-align:center;background:#f2f3f5;color:#9aa0a6;font-size:13px;border-radius:8px;">Image</div>`;
    case "divider":
      return `<hr style="border:0;border-top:1px solid #e6e8eb;margin:16px 0;" />`;
    case "spacer":
      return `<div style="height:${Math.max(
        0,
        Math.min(120, block.size)
      )}px;line-height:1px;font-size:1px;">&nbsp;</div>`;
  }
}

/**
 * Render the block list to a full, email-safe HTML document (600px centered
 * canvas, inline styles). `accent` colours buttons.
 */
export function renderDocumentToHtml(doc: EmailDocument, accent = "#4f46e5") {
  const body = doc.blocks.map((b) => renderBlock(b, accent)).join("\n");
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;">
<tr><td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${body}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text fallback for deliverability. */
export function renderDocumentToText(doc: EmailDocument): string {
  return doc.blocks
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
}
