import type {
  Adapter,
  GenerateURL,
  HandleDelete,
  HandleUpload,
  StaticHandler,
} from "@payloadcms/plugin-cloud-storage/types";
import { v2 as cloudinary } from "cloudinary";

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

/** Folder all Payload-managed blog assets live under, inside the Cloudinary account. */
const CLOUDINARY_FOLDER = "onchainsuite/blog";

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

let configured = false;

/**
 * Configure the SDK lazily and exactly once. Doing this at module scope would
 * throw during `next build` on machines without Cloudinary credentials, which
 * would break builds that never touch an upload.
 */
function configureCloudinary(): void {
  if (configured) {
    return;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
}

/** Cloudinary public IDs carry no file extension for image/video resources. */
function publicIdFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./]+$/, "");
  return `${CLOUDINARY_FOLDER}/${withoutExtension}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Prefer the id Cloudinary actually returned (persisted on the document) over
 * one re-derived from the filename — the two diverge as soon as Cloudinary
 * normalises or de-duplicates a name.
 */
function resolvePublicId(data: unknown, filename: string): string {
  return (
    readString((data as CloudinaryDocumentData | null)?.cloudinaryPublicId) ??
    publicIdFromFilename(filename)
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
          folder: CLOUDINARY_FOLDER,
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
 * Redirect rather than proxy. Streaming bytes through our own server would add
 * a hop, burn serverless execution time and defeat Cloudinary's CDN edge
 * caching for no benefit — these assets are public by design.
 */
const staticHandler: StaticHandler = (_req, { params }) => {
  configureCloudinary();

  return Response.redirect(
    cloudinary.url(publicIdFromFilename(params.filename), { secure: true }),
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
