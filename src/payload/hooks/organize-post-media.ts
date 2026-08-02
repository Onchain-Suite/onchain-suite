import type { CollectionAfterChangeHook } from "payload";

import { collectMediaIds, describeError } from "@/payload/hooks/media-refs";
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
