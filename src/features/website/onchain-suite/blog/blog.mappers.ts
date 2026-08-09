import type {
  BlogAuthor,
  BlogCategory,
  BlogPost,
  BlogPostSummary,
} from "./blog.types";
import type { Category, Media, Post, User } from "@/payload-types";

/**
 * Pure Payload-document -> view-model transforms.
 *
 * Deliberately separate from blog.service.ts: the service imports
 * `@payload-config`, which drags in the database adapter and cannot be bundled
 * for the browser. Live preview needs to run these same transforms client-side
 * on documents pushed over postMessage, so they live in a module with no
 * server-only imports.
 */

function isPopulated<T extends { id: number }>(
  value: number | T | null | undefined
): value is T {
  return typeof value === "object" && value !== null;
}

export function toMedia(
  value: number | Media | null | undefined
): Media | null {
  return isPopulated<Media>(value) ? value : null;
}

export function toAuthor(value: number | User): BlogAuthor | null {
  if (!isPopulated<User>(value)) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    bio: value.bio ?? null,
    walletAddress: value.walletAddress ?? null,
    farcaster: value.farcaster ?? null,
    x: value.x ?? null,
    avatar: toMedia(value.avatar),
  };
}

export function toCategory(value: number | Category): BlogCategory | null {
  if (!isPopulated<Category>(value)) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    slug: value.slug ?? null,
    description: value.description ?? null,
  };
}

const WORDS_PER_MINUTE = 225;

/**
 * Reading time from the Lexical tree. Walks the node graph counting `text`
 * nodes, so it ignores block/upload nodes that carry no prose.
 */
export function estimateReadingTime(content: Post["content"]): number {
  let words = 0;

  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") {
      return;
    }

    const candidate = node as { text?: unknown; children?: unknown };

    if (typeof candidate.text === "string") {
      words += candidate.text.trim().split(/\s+/).filter(Boolean).length;
    }

    if (Array.isArray(candidate.children)) {
      candidate.children.forEach(visit);
    }
  };

  visit(content?.root);

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function toSummary(doc: Post): BlogPostSummary {
  return {
    id: doc.id,
    title: doc.title,
    // Slug is optional in the schema but always derived by the slug field hook.
    // Falling back to the id keeps a malformed document linkable instead of
    // rendering an href of "/blog/undefined".
    slug: doc.slug ?? String(doc.id),
    excerpt: doc.excerpt,
    publishedAt: doc.publishedAt ?? null,
    coverImage: toMedia(doc.coverImage),
    authors: (doc.authors ?? []).map(toAuthor).filter(Boolean) as BlogAuthor[],
    categories: (doc.categories ?? [])
      .map(toCategory)
      .filter(Boolean) as BlogCategory[],
    tags: (doc.tags ?? []).map((entry) => entry.tag),
    readingTimeMinutes: estimateReadingTime(doc.content),
  };
}

export function toPost(doc: Post): BlogPost {
  return {
    ...toSummary(doc),
    content: doc.content,
    meta: {
      title: doc.meta?.title ?? null,
      description: doc.meta?.description ?? null,
      image: toMedia(doc.meta?.image),
    },
    updatedAt: doc.updatedAt,
  };
}
