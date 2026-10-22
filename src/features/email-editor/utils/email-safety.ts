/**
 * What an email may carry: links that are safe to send, and custom HTML with
 * everything inboxes block (or that could break the email) removed. Used both
 * when showing a block in the editor and when rendering what is sent, so the
 * two can never disagree.
 */

/**
 * True for links an email may carry: web, mail, in-page, relative, or a merge
 * tag the sending service fills in. Whitespace and control characters are
 * stripped first, because browsers ignore them inside a scheme:
 * "java\tscript:" is still javascript:.
 */
export function isSafeUrl(raw: string, { images = false } = {}): boolean {
  // eslint-disable-next-line no-control-regex
  const u = raw.replace(/[\u0000- \u007f-\u009f]/g, "").toLowerCase();
  if (!u) return true;
  if (/^(https?:|mailto:|#|\/(?!\/)|\{\{)/.test(u)) return true;
  if (images && /^data:image\/(png|jpe?g|gif|webp);/.test(u)) return true;
  // No scheme at all is a relative link, which is harmless.
  return !/^[a-z][a-z0-9+.-]*:/.test(u) && !u.startsWith("//");
}

/** The link to put in the email: the original if safe, a dead "#" if not. */
export const safeHref = (raw: unknown): string =>
  isSafeUrl(String(raw ?? "")) ? String(raw ?? "") : "#";

/** An image source to put in the email, or "" if it is not safe. */
export const safeSrc = (raw: unknown): string =>
  isSafeUrl(String(raw ?? ""), { images: true }) ? String(raw ?? "") : "";

const BLOCKED = [
  "script",
  "style",
  "iframe",
  "video",
  "audio",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "link",
  "meta",
  "base",
  "frame",
  "frameset",
  "svg",
  "canvas",
];

const URL_ATTRS = [
  "href",
  "src",
  "xlink:href",
  "action",
  "formaction",
  "background",
  "poster",
];

/**
 * Strips what inboxes block or what could break the email: scripts, frames,
 * media, forms, event handlers and javascript: links. Returns the clean HTML
 * and how many things were removed.
 */
export function sanitizeEmailHtml(html: string): {
  html: string;
  removed: number;
} {
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    "text/html"
  );
  let removed = 0;
  doc.body.querySelectorAll(BLOCKED.join(",")).forEach((el) => {
    el.remove();
    removed++;
  });
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const name = a.name.toLowerCase();
      const isUrl = URL_ATTRS.includes(name);
      const bad =
        name.startsWith("on") ||
        name === "srcdoc" ||
        (isUrl && !isSafeUrl(a.value, { images: name === "src" }));
      if (bad) {
        el.removeAttribute(a.name);
        removed++;
      }
    }
  });
  return { html: doc.body.innerHTML, removed };
}

/**
 * HTML pasted or copied out of Google Docs: Docs wraps everything in
 * `<b id="docs-internal-guid-…" style="font-weight:normal">`, so a naive paste
 * turns the whole document bold, and it expresses bold and italic as inline
 * styles on spans rather than tags. This unwraps the one and converts the
 * other, so a draft written in Docs lands with its formatting and nothing extra.
 */
export function cleanGoogleDocsHtml(html: string): string {
  if (!/docs-internal-guid/.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll('b[id^="docs-internal-guid"]')
    .forEach((b) => b.replaceWith(...Array.from(b.childNodes)));
  doc.querySelectorAll("span[style]").forEach((span) => {
    const st = span.getAttribute("style") ?? "";
    let inner: Node[] = Array.from(span.childNodes);
    const wrap = (tag: string) => {
      const el = doc.createElement(tag);
      inner.forEach((n) => el.appendChild(n));
      inner = [el];
    };
    if (/font-weight:\s*(700|bold)/.test(st)) wrap("strong");
    if (/font-style:\s*italic/.test(st)) wrap("em");
    if (/text-decoration[^;]*underline/.test(st)) wrap("u");
    if (/text-decoration[^;]*line-through/.test(st)) wrap("s");
    span.replaceWith(...inner);
  });
  return doc.body.innerHTML;
}
