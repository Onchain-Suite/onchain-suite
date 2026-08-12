import type {
  Adapter,
  GenerateURL,
  HandleDelete,
  HandleUpload,
  StaticHandler,
} from "@payloadcms/plugin-cloud-storage/types";
import { v2 as cloudinary } from "cloudinary";

import { configureCloudinary } from "@/payload/storage/cloudinary-client";
import {
  folderFor,
  UNASSIGNED_SEGMENT,
} from "@/payload/storage/cloudinary-folders";

/**
 * Cloudinary storage adapter for Payload's first-party
 * `@payloadcms/plugin-cloud-storage`.
 *
 * Why hand-rolled: there is no official Payload 3 Cloudinary adapter.
 * `payload-cloudinary` peers `payload: ^2.0.0` (Payload 2, incompatible), and
 * `payload-storage-cloudinary` is a 1.x single-maintainer package. This
 * implements the plugin's own `GeneratedAdapter` contract against the official
 * `cloudinary` SDK, so there is no unvetted dependency in the upload path.
 *
 * Cloudinary is already this product's image CDN (see `res.cloudinary.com` in
 * next.config.ts `images.remotePatterns` and SITE_CONFIG's asset URLs), so blog
 * media lands on the same host as the rest of the site's imagery.
 */

/**
 * New uploads land in a holding folder, not directly in the blog root.
 *
 * The destination folder is a property of the *post*, and a post is not known at
 * upload time - the upload drawer creates the media document on its own, usually
 * before the post is saved. Assets are filed into `blog/<post-slug>/` when a post
 * referencing them is saved; see src/payload/hooks/organize-post-media.ts.
 */
const UPLOAD_FOLDER = folderFor(UNASSIGNED_SEGMENT);

type CloudinaryResourceType = "image" | "video" | "raw";

type CloudinaryUploadResult = {
  public_id: string;
  resource_type: string;
  secure_url: string;
};

/** Shape the adapter persists onto the upload document via `fields` below. */
type CloudinaryDocumentData = {
  cloudinaryPublicId?: unknown;
  cloudinaryResourceType?: unknown;
};

/**
 * Last-resort public id for a document that has none stored.
 *
 * Only correct for an asset still sitting in the holding folder: once a post
 * claims it the folder changes, and nothing about the filename reveals that. The
 * stored `cloudinaryPublicId` is always authoritative - this exists so a
 * half-written document degrades to a wrong URL rather than a crash.
 */
function fallbackPublicId(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./]+$/, "");
  return `${UPLOAD_FOLDER}/${withoutExtension}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Prefer the id Cloudinary actually returned (persisted on the document) over
 * one re-derived from the filename - the two diverge as soon as Cloudinary
 * normalises or de-duplicates a name.
 */
function resolvePublicId(data: unknown, filename: string): string {
  return (
    readString((data as CloudinaryDocumentData | null)?.cloudinaryPublicId) ??
    fallbackPublicId(filename)
  );
}

function resolveResourceType(data: unknown): CloudinaryResourceType {
  const stored = readString(
    (data as CloudinaryDocumentData | null)?.cloudinaryResourceType
  );

  return stored === "video" || stored === "raw" ? stored : "image";
}

const handleUpload: HandleUpload = async ({ data, file }) => {
  configureCloudinary();

  const result = await new Promise<CloudinaryUploadResult>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: UPLOAD_FOLDER,
          // `auto` lets Cloudinary route images, video and raw files correctly.
          resource_type: "auto",
          // Payload already guarantees a unique filename per document, so
          // overwriting keeps re-uploads idempotent instead of accumulating
          // Cloudinary's `_abc123` suffixed duplicates.
          public_id: file.filename.replace(/\.[^./]+$/, ""),
          overwrite: true,
        },
        (error, uploaded) => {
          if (error) {
            reject(error);
            return;
          }
          if (!uploaded) {
            reject(new Error("Cloudinary upload returned no result"));
            return;
          }
          resolve(uploaded as CloudinaryUploadResult);
        }
      );

      stream.end(file.buffer);
    }
  );

  // Persisted so generateURL and handleDelete never have to guess. The `url`
  // field itself is populated by the plugin through generateURL, so it is
  // deliberately not set here.
  data.cloudinaryPublicId = result.public_id;
  data.cloudinaryResourceType = result.resource_type;

  return data;
};

const handleDelete: HandleDelete = async ({ doc, filename }) => {
  configureCloudinary();

  await cloudinary.uploader.destroy(resolvePublicId(doc, filename), {
    resource_type: resolveResourceType(doc),
    invalidate: true,
  });
};

const generateURL: GenerateURL = ({ data, filename }) =>
  cloudinary.url(resolvePublicId(data, filename), {
    resource_type: resolveResourceType(data),
    secure: true,
  });

/**
 * Serves `/cms-api/media/file/<filename>` by redirecting to Cloudinary.
 *
 * With `disablePayloadAccessControl` enabled in payload.config.ts, media `url`
 * values point straight at Cloudinary, so this route is no longer on the hot
 * path - it only answers direct hits on the Payload file URL.
 *
 * The public id is looked up from the document rather than derived from the
 * filename. Deriving it only ever worked while every asset sat in one flat
 * folder: assets are now filed per post, and a filename says nothing about which
 * folder claimed it.
 *
 * Redirect rather than proxy - streaming bytes through our own server would add
 * a hop, burn serverless execution time and defeat Cloudinary's CDN edge caching
 * for no benefit. These assets are public by design.
 */
const staticHandler: StaticHandler = async (req, { params }) => {
  configureCloudinary();

  let publicId = fallbackPublicId(params.filename);
  let resourceType: CloudinaryResourceType = "image";

  try {
    const found = await req.payload.find({
      collection: params.collection as "media",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { filename: { equals: params.filename } },
    });

    const [doc] = found.docs;
    if (doc) {
      publicId = resolvePublicId(doc, params.filename);
      resourceType = resolveResourceType(doc);
    }
  } catch {
    // Fall through to the filename-derived id. A redirect that might 404 is
    // still better than a 500 on an image request.
  }

  return Response.redirect(
    cloudinary.url(publicId, { resource_type: resourceType, secure: true }),
    302
  );
};

export const cloudinaryAdapter: Adapter = () => {
  configureCloudinary();

  return {
    name: "cloudinary",
    fields: [
      {
        name: "cloudinaryPublicId",
        type: "text",
        admin: { hidden: true, readOnly: true },
      },
      {
        name: "cloudinaryResourceType",
        type: "text",
        admin: { hidden: true, readOnly: true },
      },
    ],
    generateURL,
    handleDelete,
    handleUpload,
    staticHandler,
  };
};
