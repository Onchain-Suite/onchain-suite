import type { Access } from "payload";

import { canManageBlog, isSuperAdminRole } from "@/payload/access/roles";

const roleOf = (user: unknown): unknown =>
  (user as { role?: unknown } | null | undefined)?.role;

/**
 * Signed-in CMS administrators — `admin` or `super_admin`.
 *
 * Every account in the users collection is an administrator by design (there is
 * no editor role), so in practice this is "is signed in". It is written as an
 * explicit role check anyway: it keeps the rule true if a lesser role is ever
 * added, and it is the behaviour the tests in roles.test.ts pin down.
 */
export const isBlogManager: Access = ({ req: { user } }) =>
  canManageBlog(roleOf(user));

/** Super admins only — managing who has CMS access. */
export const isSuperAdmin: Access = ({ req: { user } }) =>
  isSuperAdminRole(roleOf(user));

/**
 * Content the public site reads.
 *
 * Administrators see everything (they need drafts in the admin panel). Everyone
 * else is narrowed to published documents by a *query constraint* rather than a
 * boolean, so the filter runs in the database and a draft cannot leak through
 * the Local API, REST or GraphQL.
 */
export const publishedOrManager: Access = ({ req: { user } }) => {
  if (canManageBlog(roleOf(user))) {
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
