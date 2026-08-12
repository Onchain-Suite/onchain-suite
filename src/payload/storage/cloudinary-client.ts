import { v2 as cloudinary } from "cloudinary";

/**
 * Shared Cloudinary SDK setup.
 *
 * Extracted so the adapter and the folder-filing path configure the SDK exactly
 * once between them, rather than each keeping its own `configured` flag.
 */

let configured = false;

/**
 * Configure the SDK lazily and exactly once. Doing this at module scope would
 * throw during `next build` on machines without Cloudinary credentials, which
 * would break builds that never touch an upload.
 */
export function configureCloudinary(): void {
  if (configured) {
    return;
  }

  cloudinary.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    secure: true,
  });

  configured = true;
}

/**
 * Whether credentials are present at all.
 *
 * Only used to skip *optional* work (folder filing). The upload path does not
 * check this - an upload without credentials must fail loudly rather than
 * silently drop the file.
 */
export function hasCloudinaryCredentials(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}
