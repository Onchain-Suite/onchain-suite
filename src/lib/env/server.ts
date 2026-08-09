import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    ARCJET_KEY: z.string().min(1).optional(),
    R3TAIN_INFRA_URL: z
      .string()
      .url()
      .default("https://r3tain-infra.onrender.com"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // --- PayloadCMS (blog) ---
    // Optional so the app still boots without a CMS (e.g. a frontend-only
    // preview deploy); the blog routes fail loudly instead of the whole build.
    // payload.config.ts reads these from process.env directly, since the Payload
    // CLI loads it outside Next's module graph.
    DATABASE_URI: z.string().url().optional(),
    PAYLOAD_SECRET: z.string().min(32).optional(),
    PAYLOAD_PREVIEW_SECRET: z.string().min(16).optional(),

    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: process.env,
});
