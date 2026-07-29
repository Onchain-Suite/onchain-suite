import type { CollectionConfig } from "payload";

/**
 * Payload's own admin users — the accounts that log in at /admin.
 *
 * Deliberately independent of the app's other two identity systems: the
 * client-only better-auth setup in src/lib/auth-client.ts and the external
 * Render backend's sessions. Content editing is a different trust boundary from
 * product access, and unifying them would mean giving the CMS a way to mint
 * product sessions.
 *
 * This repo has no middleware.ts, so nothing guards /admin at the edge — the
 * access control here and Payload's own auth are the boundary. src/app/robots.ts
 * keeps both /admin and /cms-api out of search indexes.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["name", "email", "role"],
    group: "Admin",
  },
  access: {
    // Any authenticated editor can read the user list (needed to populate the
    // author relationship picker), but only admins can change membership.
    read: ({ req: { user } }) => Boolean(user),
    create: ({ req: { user } }) => user?.role === "admin",
    update: ({ req: { user }, id }) =>
      user?.role === "admin" || user?.id === id,
    delete: ({ req: { user } }) => user?.role === "admin",
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
      defaultValue: "editor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      access: {
        // Editors must not be able to promote themselves.
        update: ({ req: { user } }) => user?.role === "admin",
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
      admin: {
        description: "Optional. Shown on the author byline.",
      },
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
      admin: {
        description: "Optional X handle, without the leading @.",
      },
    },
  ],
};
