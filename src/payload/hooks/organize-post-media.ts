import type { CollectionAfterChangeHook } from "payload";

import {
  postFolderSegment,
  shouldMove,
  targetPublicId,
} from "@/payload/storage/cloudinary-folders";
import { renameCloudinaryAsset } from "@/payload/storage/cloudinary-move";

/**
 * Moves a post's media into that post's own Cloudinary folder.
 *
 * Uploads cannot know their destination — Payload's upload drawer creates the
 * media document independently, usually before the post exists — so assets land
 * in `blog/_unassigned` and are filed here, when a post that references them is
 * saved. See src/payload/storage/cloudinary-folders.ts for the layout and the
 * move policy.
 *
 * Never throws. Filing is housekeeping; a Cloudinary hiccup must not fail a
 * publish, and the row is already committed by the time an afterChange hook
 * runs, so throwing would report failure for a save that succeeded. Same
 * reasoning as revalidate-post.ts.
 */

/**
 * Renders an unknown thrown value as something worth reading in a log.
 *
 * The Cloudinary SDK rejects with a plain object (`{ message, http_code }`), not
 * an Error, so `String(error)` yields "[object Object]" — which is exactly the
 * message you get on an auth failure, and exactly when you need detail.
 */
function describeError(error: unknown): string {
  return redactCredentials(rawErrorMessage(error));
}

/**
 * Keeps credentials out of the log.
 *
 * Cloudinary echoes the offending key back on an auth failure ("Unknown API key
 * 1234..."), and these warnings can end up in a third-party log aggregator. The
 * key and secret are masked by exact match, which is precise — no guessing at
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
 * nests upload nodes arbitrarily deep — inside blocks, quotes or list items —
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

export const organizePostMedia: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const { payload } = req;

  try {
    const mediaIds = collectMediaIds(doc);
    if (mediaIds.length === 0) {
      return doc;
    }

    const segment = postFolderSegment({
      id: doc?.id as number | string | undefined,
      slug: doc?.slug,
    });

    await Promise.all(
      mediaIds.map(async (id) => {
        try {
          const media = await payload.findByID({
            collection: "media",
            id,
            depth: 0,
            overrideAccess: true,
          });

          const publicId = media?.cloudinaryPublicId;
          if (typeof publicId !== "string" || !publicId) {
            return;
          }
          if (!shouldMove(publicId, segment)) {
            return;
          }

          const destination = targetPublicId(publicId, segment);
          const moved = await renameCloudinaryAsset({
            from: publicId,
            resourceType: media?.cloudinaryResourceType,
            to: destination,
          });

          if (!moved) {
            return;
          }

          // The stored public id is what generateURL builds every URL from, so
          // updating it is what actually repoints the asset.
          await payload.update({
            collection: "media",
            id,
            data: { cloudinaryPublicId: moved },
            depth: 0,
            overrideAccess: true,
          });
        } catch (error) {
          payload.logger.warn(
            `Could not file media ${String(id)} into ${segment}: ${describeError(error)}`
          );
        }
      })
    );
  } catch (error) {
    payload.logger.warn(
      `Skipped filing media for post ${String(doc?.id)}: ${describeError(error)}`
    );
  }

  return doc;
};
