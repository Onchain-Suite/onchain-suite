import { revalidatePath, revalidateTag } from "next/cache";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Payload,
} from "payload";

import { POSTS_CACHE_TAG } from "@/payload/cache-tags";

/**
 * On-demand revalidation: the mechanism that makes edits show up "instantly"
 * without giving up static rendering.
 *
 * The public blog routes use no dynamic APIs, so Next prerenders them and serves
 * them from cache (fast LCP, per CLAUDE.md §12). These hooks run in-process
 * right after a write commits and drop exactly the affected cache entries, so
 * the next request re-renders with fresh content. Because Payload lives in the
 * same Next app, this needs no webhook, no shared secret and no network hop.
 */

/** Explicit opt-out, for bulk writes that would otherwise thrash the cache. */
function shouldSkip(context: { disableRevalidate?: unknown }): boolean {
  return context.disableRevalidate === true;
}

/**
 * Revalidation must never be able to fail a write.
 *
 * `revalidateTag`/`revalidatePath` throw "Invariant: static generation store
 * missing" when called outside a Next request or render context — which is
 * exactly what happens when the Local API is driven from a seed script, a data
 * migration, the `payload` CLI or a standalone cron job. Without this guard, an
 * unrelated script creating a post would have its `create()` call throw *after*
 * the row was already committed.
 *
 * Swallowing is correct rather than merely convenient: outside a Next server
 * there is no cache in this process to invalidate, so there is nothing to
 * recover. The write is the durable thing; the cache catches up on next request.
 */
function safely(action: () => void, payload: Payload | undefined): void {
  try {
    action();
  } catch (error) {
    payload?.logger.warn(
      `Skipped blog cache revalidation (no Next.js request context): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function revalidatePost(slug: unknown, payload?: Payload): void {
  safely(() => {
    // Next 16 requires a cache-life profile alongside the tag. "max" is correct
    // for CMS content: entries stay valid until an editor changes something, at
    // which point this hook is exactly what expires them. Any time-based profile
    // would add pointless re-renders on top of event-based invalidation.
    revalidateTag(POSTS_CACHE_TAG, "max");
    revalidatePath("/blog");

    if (typeof slug === "string" && slug.length > 0) {
      revalidatePath(`/blog/${slug}`);
    }
  }, payload);
}

export const revalidatePostAfterChange: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (shouldSkip(context)) {
    return doc;
  }

  revalidatePost(doc?.slug, payload);

  // A rename leaves the old URL cached and serving stale content, so the
  // previous slug has to be purged too.
  if (
    typeof previousDoc?.slug === "string" &&
    previousDoc.slug.length > 0 &&
    previousDoc.slug !== doc?.slug
  ) {
    safely(() => revalidatePath(`/blog/${previousDoc.slug}`), payload);
  }

  return doc;
};

export const revalidatePostAfterDelete: CollectionAfterDeleteHook = ({
  doc,
  req: { payload, context },
}) => {
  if (shouldSkip(context)) {
    return doc;
  }

  revalidatePost(doc?.slug, payload);

  return doc;
};
