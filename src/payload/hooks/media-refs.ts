/**
 * Shared helpers for the media hooks: which media a post references, and how to
 * describe a failure without leaking credentials.
 *
 * Extracted so the filing hook (organize-post-media.ts) and the cleanup hook
 * (cleanup-post-media.ts) agree on what "a post's media" means. If the two ever
 * disagreed, cleanup would delete something filing had just moved, or leave
 * something behind forever.
 */

/**
 * Renders an unknown thrown value as something worth reading in a log.
 *
 * The Cloudinary SDK rejects with a plain object (`{ message, http_code }`), not
 * an Error, so `String(error)` yields "[object Object]" - which is exactly the
 * message you get on an auth failure, and exactly when you need detail.
 */
export function describeError(error: unknown): string {
  return redactCredentials(rawErrorMessage(error));
}

/**
 * Keeps credentials out of the log.
 *
 * Cloudinary echoes the offending key back on an auth failure ("Unknown API key
 * 1234..."), and these warnings can end up in a third-party log aggregator. The
 * key and secret are masked by exact match, which is precise - no guessing at
 * what a credential looks like.
 */
function redactCredentials(message: string): string {
  let safe = message;
  for (const secret of [
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ]) {
    if (secret && secret.length > 3) {
      safe = safe.split(secret).join("[redacted]");
    }
  }
  return safe;
}

function rawErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    const { http_code: httpCode, message } = error as {
      http_code?: unknown;
      message?: unknown;
    };
    const parts = [
      typeof message === "string" ? message : null,
      httpCode === undefined ? null : `HTTP ${String(httpCode)}`,
    ].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" ");
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "unserialisable error";
    }
  }
  return String(error);
}

/** Media relationship values arrive as an id or as a populated document. */
function idOf(value: unknown): number | string | null {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    const { id } = value as { id?: unknown };
    if (typeof id === "number" || typeof id === "string") {
      return id;
    }
  }
  return null;
}

/**
 * Every media document a post points at: the cover image, the SEO image, and any
 * upload node embedded in the rich text.
 *
 * The rich text is walked rather than read from known paths because Lexical
 * nests upload nodes arbitrarily deep - inside blocks, quotes or list items -
 * and a fixed path would silently miss them.
 *
 * Exported for testing: this is the part that decides which assets get filed, so
 * a miss here means media quietly left behind in `_unassigned`.
 */
export function collectMediaIds(doc: unknown): Array<number | string> {
  const ids = new Set<number | string>();

  const addFrom = (value: unknown) => {
    const id = idOf(value);
    if (id !== null) {
      ids.add(id);
    }
  };

  const post = (doc ?? {}) as Record<string, unknown>;
  addFrom(post.coverImage);

  const meta = post.meta as Record<string, unknown> | undefined;
  if (meta) {
    addFrom(meta.image);
  }

  const walk = (node: unknown, depth: number) => {
    // Lexical trees are shallow in practice; the cap only stops a pathological
    // or circular structure from spinning.
    if (depth > 30 || !node || typeof node !== "object") {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, depth + 1));
      return;
    }

    const record = node as Record<string, unknown>;
    if (record.type === "upload" && record.relationTo === "media") {
      addFrom(record.value);
    }

    Object.values(record).forEach((child) => walk(child, depth + 1));
  };

  walk(post.content, 0);

  return [...ids];
}
