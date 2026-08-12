/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/*
 * NOTE: this lives at /cms-api, not Payload's default /api.
 *
 * A catch-all at src/app/(payload)/api/[...slug]/route.ts would resolve the
 * same paths as the existing (frontend)-era handlers /api/waitlist,
 * /api/upload/* and /api/v1/*, which Next.js rejects as conflicting routes.
 * The folder name here must stay in sync with `routes.api` in payload.config.ts.
 */
import config from "@payload-config";
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from "@payloadcms/next/routes";

import "@payloadcms/next/css";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
