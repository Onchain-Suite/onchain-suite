import type { CollectionAfterDeleteHook, PayloadRequest } from "payload";

import { collectMediaIds, describeError } from "@/payload/hooks/media-refs";

/**
 * Deletes a post's media when the post itself is deleted.
 *
 * Deleting the media *document* is what removes the file from Cloudinary — the
 * cloud-storage plugin's own afterDelete hook calls the adapter, so this never
 * talks to Cloudinary directly.
 *
 * The whole difficulty is that media is shared. The same image can sit on the
 * cover of one post and inside the body of another, so "this post is gone" does
 * not imply "its images are unused". Every candidate is therefore checked against
 * every surviving post before it is deleted; anything still referenced is kept.
 *
 * Erring towards keeping files: an orphaned image in Cloudinary costs a little
 * storage, while deleting one that is still in use breaks a live page and the
 * original is gone.
 */

/**
 * How many posts to examine per page while looking for surviving references.
 *
 * Rich text has to be read to find embedded uploads, so this walks posts rather
 * than issuing a query — there is no index for "mentions media id 7 somewhere in
 * a Lexical tree". Deletes are rare enough that the scan is affordable.
 */
const SCAN_PAGE_SIZE = 200;

/** Refuse to scan forever. At this point something is wrong, or the blog is huge. */
const MAX_SCAN_PAGES = 25;

/**
 * Every media id still referenced by a post other than the one just deleted.
 *
 * Returns null when the scan could not be completed — the caller must then delete
 * nothing, because an incomplete reference set would look exactly like "unused".
 */
async function collectSurvivingMediaIds(
  req: PayloadRequest,
  deletedPostId: unknown
): Promise<Set<number | string> | null> {
  const { payload } = req;
  const referenced = new Set<number | string>();

  for (let page = 1; page <= MAX_SCAN_PAGES; page++) {
    const result = await payload.find({
      collection: "posts",
      depth: 0,
      // Drafts count: an unpublished post still legitimately references its
      // images, and deleting them would break it on publish.
      draft: true,
      limit: SCAN_PAGE_SIZE,
      overrideAccess: true,
      page,
      // Joining the caller's transaction is not optional: an afterDelete hook
      // runs while the delete transaction still holds locks on `posts`, so a
      // query on its own connection waits on those locks and deadlocks.
      req,
      where: { id: { not_equals: deletedPostId } },
    });

    for (const post of result.docs) {
      for (const id of collectMediaIds(post)) {
        referenced.add(id);
      }
    }

    if (!result.hasNextPage) {
      return referenced;
    }
  }

  payload.logger.warn(
    `Stopped scanning for media references after ${
      MAX_SCAN_PAGES * SCAN_PAGE_SIZE
    } posts; leaving media from the deleted post in place rather than risk deleting something still in use.`
  );
  return null;
}

export const cleanupPostMedia: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const { payload } = req;

  try {
    const candidates = collectMediaIds(doc);
    if (candidates.length === 0) {
      return doc;
    }

    const surviving = await collectSurvivingMediaIds(req, doc?.id);
    if (surviving === null) {
      return doc;
    }

    const orphaned = candidates.filter((id) => !surviving.has(id));
    if (orphaned.length === 0) {
      return doc;
    }

    await Promise.all(
      orphaned.map(async (id) => {
        try {
          // Deleting the document triggers the storage plugin, which removes the
          // file from Cloudinary through the adapter's handleDelete.
          await payload.delete({
            collection: "media",
            id,
            overrideAccess: true,
            req,
          });
        } catch (error) {
          payload.logger.warn(
            `Could not delete unused media ${String(id)}: ${describeError(
              error
            )}`
          );
        }
      })
    );

    payload.logger.info(
      `Deleted ${orphaned.length} unused media item(s) after removing post ${String(
        doc?.id
      )}.`
    );
  } catch (error) {
    payload.logger.warn(
      `Skipped media cleanup for deleted post ${String(doc?.id)}: ${describeError(
        error
      )}`
    );
  }

  return doc;
};
