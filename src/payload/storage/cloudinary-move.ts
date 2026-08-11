import { v2 as cloudinary } from "cloudinary";

import {
  configureCloudinary,
  hasCloudinaryCredentials,
} from "@/payload/storage/cloudinary-client";

/**
 * Moves an asset to a new public id (Cloudinary's "rename" is a move - the
 * folder is part of the id).
 *
 * Isolated from the adapter so the filing hook can be reasoned about and mocked
 * without pulling in the whole upload path.
 *
 * Returns the new public id on success, or null when the move did not happen.
 * Returning null rather than throwing lets the caller treat filing as
 * best-effort: an unfiled asset still works, it is just in the wrong folder.
 */
export async function renameCloudinaryAsset({
  from,
  resourceType,
  to,
}: {
  from: string;
  resourceType?: unknown;
  to: string;
}): Promise<string | null> {
  // Without credentials every call would fail with an auth error. Local
  // development frequently runs without them, and filing is optional, so skip
  // quietly instead of logging noise on every save.
  if (!hasCloudinaryCredentials()) {
    return null;
  }

  configureCloudinary();

  const result = (await cloudinary.uploader.rename(from, to, {
    // Purge the CDN copy at the old URL; without this the old path can keep
    // serving from cache after the asset has moved.
    invalidate: true,
    resource_type:
      resourceType === "video" || resourceType === "raw"
        ? resourceType
        : "image",
  })) as { public_id?: unknown } | null;

  const publicId = result?.public_id;
  return typeof publicId === "string" && publicId ? publicId : null;
}
