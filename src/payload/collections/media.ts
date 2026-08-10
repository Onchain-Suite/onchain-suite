import type { CollectionConfig } from "payload";

import { isCmsUser, isPublisher, publicRead } from "@/payload/access";

/**
 * Uploads. Files are stored in Cloudinary via the adapter wired up in
 * payload.config.ts (see src/payload/storage/cloudinary-adapter.ts) - nothing is
 * written to local disk, which matters because serverless deploys have no
 * persistent filesystem.
 *
 * No `imageSizes` are defined on purpose: Cloudinary generates responsive
 * variants from transformation URLs, so pre-rendering a fixed set of derivatives
 * at upload time would cost build/upload latency and storage for nothing.
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    group: "Content",
  },
  access: {
    // Media is referenced by public blog posts, so it must be publicly readable.
    read: publicRead,
    create: isCmsUser,
    update: isCmsUser,
    delete: isPublisher,
  },
  upload: {
    mimeTypes: ["image/*"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        description:
          "Describe the image for screen readers and when it fails to load. Required.",
      },
    },
    {
      name: "caption",
      type: "text",
      admin: {
        description: "Optional caption rendered beneath the image.",
      },
    },
  ],
};
