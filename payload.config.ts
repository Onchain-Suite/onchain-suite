import { postgresAdapter } from "@payloadcms/db-postgres";
import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { Categories } from "@/payload/collections/categories";
import { Media } from "@/payload/collections/media";
import { Posts } from "@/payload/collections/posts";
import { Users } from "@/payload/collections/users";
import { cloudinaryAdapter } from "@/payload/storage/cloudinary-adapter";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Environment is read straight from process.env here, NOT through
 * src/lib/env (@t3-oss/env-nextjs).
 *
 * This file is also loaded by the Payload CLI (`payload migrate`,
 * `generate:types`) outside Next's module graph, where the t3-env client/server
 * split and its build-time validation do not apply. App code should still go
 * through src/lib/env.
 */
export default buildConfig({
  // Must stay in sync with the folder name at
  // src/app/(payload)/cms-api — Payload's default of /api would collide with
  // the app's existing /api/v1/*, /api/upload/* and /api/waitlist handlers,
  // which Next rejects as conflicting routes.
  routes: {
    api: "/cms-api",
  },
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: "· OnchainSuite CMS",
    },
  },
  collections: [Posts, Categories, Media, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "",
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? "",
    },
    // Isolates every Payload table in its own Postgres schema. The separate
    // Render backend owns `waitlist`/`campaigns`/`subscribers` in the public
    // schema (see backend/schema.sql); this guarantees the two can share a
    // database without ever colliding on a table name.
    schemaName: "payload",
  }),
  // Enables the admin panel's crop and focal-point tools. No `imageSizes` are
  // configured on the media collection, so sharp never generates derivatives —
  // Cloudinary transformation URLs handle responsive variants instead.
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
  plugins: [
    seoPlugin({
      collections: ["posts"],
      uploadsCollection: "media",
      generateTitle: ({ doc }) => `${doc?.title ?? "Blog"} · OnchainSuite`,
      generateDescription: ({ doc }) => doc?.excerpt ?? "",
      generateURL: ({ doc }) =>
        `${process.env.NEXT_PUBLIC_SERVER_URL ?? ""}/blog/${doc?.slug ?? ""}`,
    }),
    cloudStoragePlugin({
      collections: {
        media: {
          adapter: cloudinaryAdapter,
          // Cloudinary is the only copy; nothing is written to local disk,
          // which serverless deploys would lose on every cold start anyway.
          disableLocalStorage: true,
        },
      },
    }),
  ],
});
