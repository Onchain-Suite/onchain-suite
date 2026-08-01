import type { CollectionConfig } from "payload";

import { isBlogManager } from "@/payload/access";
import { backendSessionStrategy } from "@/payload/auth/backend-session-strategy";

/**
 * Mirrors of product users who have signed into the CMS — not accounts.
 *
 * There are no blog credentials. Payload's local (email + password) strategy is
 * disabled and replaced by backendSessionStrategy, which validates the caller's
 * existing OnchainSuite session against the product backend and admits only the
 * ADMIN and SUPER_ADMIN roles. An admin signs in once, in the app, and /admin
 * follows.
 *
 * Rows here are created automatically on first successful sign-in. They exist so
 * Payload can bind `req.user` to a document and so `posts.authors` has something
 * to relate to; `email`, `name` and `role` are refreshed from the backend, which
 * remains the source of truth. Editing them by hand would be overwritten, which
 * is why every write is closed off below.
 *
 * This repo has no middleware.ts, so nothing guards /admin at the edge — the
 * strategy and these rules are the boundary. src/app/robots.ts keeps both /admin
 * and /cms-api out of search indexes.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    // No passwords in the blog database. This is the whole point: one login.
    disableLocalStrategy: true,
    strategies: [backendSessionStrategy],
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role"],
    group: "Admin",
    description:
      "Read-only mirror of OnchainSuite admins who have opened the CMS. Grant or revoke access in the backend, not here.",
  },
  access: {
    // Needed to populate the author picker on posts.
    read: isBlogManager,
    // Identity is owned by the backend. Allowing writes here would create rows
    // the backend does not know about, or edits the next sign-in silently reverts.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      // The join key back to the product's user. Indexed because the auth
      // strategy looks a user up by it on (nearly) every admin request.
      name: "backendUserId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: "The product backend's user id. Set automatically.",
      },
    },
    {
      name: "email",
      type: "email",
      required: true,
      admin: { readOnly: true },
    },
    {
      name: "name",
      type: "text",
      required: true,
      admin: { readOnly: true },
    },
    {
      // Mirrored from the backend's UserRole enum for visibility in the admin
      // list. It is NOT the authorisation source — every request re-checks the
      // live role via the strategy, so a role revoked in the backend takes
      // effect within the session cache TTL rather than persisting here.
      name: "role",
      type: "text",
      admin: {
        readOnly: true,
        description: "Mirrored from the backend. Change it there.",
      },
    },
    {
      name: "bio",
      type: "textarea",
      admin: {
        description: "Short author bio, shown on posts this user writes.",
      },
    },
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
    },
    // OnchainSuite is a wallet-first product, so an author byline can carry
    // onchain identity. Display-only: CLAUDE.md §0.5's wallet-first contract
    // governs contacts/audiences, not CMS authors.
    {
      name: "walletAddress",
      type: "text",
      admin: { description: "Optional. Shown on the author byline." },
    },
    {
      name: "farcaster",
      type: "text",
      admin: {
        description: "Optional Farcaster handle, without the leading @.",
      },
    },
    {
      name: "x",
      type: "text",
      admin: { description: "Optional X handle, without the leading @." },
    },
  ],
};
