import type { BlogPost } from "../blog.types";

/**
 * The article outline, derived from the Lexical body.
 *
 * One pass over the tree gives every heading a stable, unique `id` (so any
 * section can be linked to) and collects the H2/H3s for the "On this page"
 * outline. The rich-text renderer reads ids back through `idFor`, keyed on the
 * node object itself, so the outline and the rendered headings can never
 * disagree about an id, even when two headings share the same text.
 */

export type OutlineItem = {
  id: string;
  text: string;
  /** 2 for an H2, 3 for an H3 (indented under its H2). */
  level: 2 | 3;
};

export type ArticleOutline = {
  items: OutlineItem[];
  /** The id given to a heading node, or undefined for any other node. */
  idFor: (node: unknown) => string | undefined;
};

/** Fewer sections than this and an outline is noise, so it is not shown. */
export const MIN_OUTLINE_ITEMS = 3;

type LexicalNode = {
  type?: unknown;
  tag?: unknown;
  text?: unknown;
  children?: unknown;
};

const ANCHORED_TAGS = new Set(["h2", "h3", "h4"]);

/** URL-safe fragment from heading text: "Why it's 2x faster" -> "why-its-2x-faster". */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 80)
    .replace(/-+$/, "");

  return slug || "section";
}

/** All text under a node, concatenated (links and formatting included). */
export function nodeText(node: unknown): string {
  if (!node || typeof node !== "object") {
    return "";
  }

  const candidate = node as LexicalNode;
  const own = typeof candidate.text === "string" ? candidate.text : "";
  const children = Array.isArray(candidate.children)
    ? candidate.children.map(nodeText).join("")
    : "";

  return own + children;
}

export function buildOutline(content: BlogPost["content"]): ArticleOutline {
  const ids = new WeakMap<object, string>();
  const used = new Set<string>();
  const items: OutlineItem[] = [];

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }

    const candidate = node as LexicalNode;
    const tag = typeof candidate.tag === "string" ? candidate.tag : "";

    if (candidate.type === "heading" && ANCHORED_TAGS.has(tag)) {
      const text = nodeText(node).replace(/\s+/g, " ").trim();

      if (!text) {
        return;
      }

      const base = slugifyHeading(text);
      let id = base;
      for (let n = 2; used.has(id); n += 1) {
        id = `${base}-${n}`;
      }
      used.add(id);
      ids.set(node, id);

      if (tag === "h2" || tag === "h3") {
        items.push({ id, text, level: tag === "h2" ? 2 : 3 });
      }
      return;
    }

    if (Array.isArray(candidate.children)) {
      candidate.children.forEach(visit);
    }
  };

  visit(content?.root);

  return {
    items,
    idFor: (node) =>
      node && typeof node === "object" ? ids.get(node) : undefined,
  };
}
