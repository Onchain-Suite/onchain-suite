import type { Access } from "payload";

import { canManageBlog } from "@/payload/access/roles";

/**
 * Blog management is restricted to the backend's ADMIN and SUPER_ADMIN roles.
 *
 * `req.user` is populated by the backend session strategy, which already refuses
 * to attach a user for any other role — so this is defence in depth rather than
 * the only gate. It matters because the Local API can be driven from server code
 * with a user attached, and because access rules are what Payload uses to decide
 * whether to render write controls in the admin UI at all.
 */
export const isBlogManager: Access = ({ req: { user } }) =>
  canManageBlog((user as { role?: unknown } | null)?.role);

/**
 * Content the public site reads.
 *
 * Managers see everything (they need drafts in the admin panel). Everyone else
 * is narrowed to published documents by a *query constraint* rather than a
 * boolean, so the filter runs in the database and a draft cannot leak through
 * the Local API, REST or GraphQL.
 */
export const publishedOrManager: Access = ({ req: { user } }) => {
  if (canManageBlog((user as { role?: unknown } | null)?.role)) {
    return true;
  }
  return { _status: { equals: "published" } };
};

/**
 * Categories and media are referenced by published posts, so they stay publicly
 * readable. They carry no unpublished state of their own — a category is just a
 * label — so there is nothing to hide here.
 */
export const publicRead: Access = () => true;
