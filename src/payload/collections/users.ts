import type { CollectionConfig } from "payload";

import { isBlogManager, isSuperAdmin } from "@/payload/access";

/**
 * CMS accounts — the logins for /admin.
 *
 * Payload owns authentication and sessions here: its own email + password
 * strategy, its own session cookie, its own user table. This is deliberately
 * independent of the product's better-auth setup and the Render backend's
 * sessions.
 *
 * The tradeoff, stated plainly: administrator access lives in two places, so
 * offboarding someone means removing them here as well as in the product. The
 * upside is that the CMS keeps working when the backend does not, and that
 * nothing about /admin depends on the shape of a backend response.
 *
 * There is no editor role. The blog is for system administrators to publish
 * content the public reads, so every account here is an administrator:
 *
 *   - `admin`       manages blog content (posts, categories, media)
 *   - `super_admin` additionally manages CMS accounts themselves
 *
 * This repo has no middleware.ts, so nothing guards /admin at the edge — these
 * rules and Payload's auth are the boundary. src/app/robots.ts keeps both
 * /admin and /cms-api out of search indexes.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role"],
    group: "Admin",
  },
  access: {
    // Any signed-in administrator can read the list — the author picker on
    // posts needs it.
    read: isBlogManager,
    // Only a super admin may add or remove CMS accounts. Granting blog access
    // is a different privilege from using it.
    create: isSuperAdmin,
    delete: isSuperAdmin,
    // A super admin may edit anyone; everyone else only their own profile
    // (bio, avatar, handles). The role field itself is locked down separately
    // below so this cannot be used to self-promote.
    update: ({ req: { user }, id }) => {
      if (!user) {
        return false;
      }
      if (isSuperAdminUser(user)) {
        return true;
      }
      return user.id === id;
    },
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "admin",
      options: [
        { label: "Super Admin", value: "super_admin" },
        { label: "Admin", value: "admin" },
      ],
      access: {
        // Without this, the self-update rule above would let any admin promote
        // themselves to super admin.
        update: ({ req: { user } }) => isSuperAdminUser(user),
      },
      admin: {
        description:
          "Admins manage blog content. Super admins additionally manage CMS accounts.",
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

/** Local helper so the field-level rule and the collection rules agree. */
function isSuperAdminUser(user: unknown): boolean {
  const role = (user as { role?: unknown } | null | undefined)?.role;
  return typeof role === "string" && role.toUpperCase() === "SUPER_ADMIN";
}
