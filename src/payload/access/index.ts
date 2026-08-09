import type { Access } from "payload";

import {
  canAccessCms,
  canPublish,
  isSuperAdminRole,
} from "@/payload/access/roles";

const roleOf = (user: unknown): unknown =>
  (user as { role?: unknown } | null | undefined)?.role;

/** Any signed-in CMS user: editor, admin or super admin. */
export const isCmsUser: Access = ({ req: { user } }) =>
  canAccessCms(roleOf(user));

/** Admins and super admins — may publish, unpublish and delete. */
export const isPublisher: Access = ({ req: { user } }) =>
  canPublish(roleOf(user));

/** Super admins only — managing who has CMS access. */
export const isSuperAdmin: Access = ({ req: { user } }) =>
  isSuperAdminRole(roleOf(user));

/**
 * Who may modify a post.
 *
 * Publishers may edit anything. Editors are restricted to documents that are not
 * currently live, expressed as a **query constraint** rather than a boolean, so
 * Postgres enforces it and it cannot be bypassed through the Local API, REST or
 * GraphQL.
 *
 * This is the other half of "editors cannot publish". Blocking the publish action
 * alone would not be enough: if an editor could edit an already-published post,
 * their text would appear on the public site immediately, which is publishing by
 * another name. Restricting them to non-live documents closes that.
 *
 * The consequence, which is intended but worth knowing: an editor cannot fix a
 * typo on a post that is already live — an admin has to. See docs/blog.md.
 */
export const canEditPost: Access = ({ req: { user } }) => {
  const role = roleOf(user);
  if (canPublish(role)) {
    return true;
  }
  if (!canAccessCms(role)) {
    return false;
  }
  return { _status: { not_equals: "published" } };
};

/**
 * Content the public site reads.
 *
 * Any CMS user sees everything — editors need their drafts visible in the admin
 * panel. Everyone else is narrowed to published documents by a query constraint,
 * so the filter runs in the database and a draft cannot leak through the Local
 * API, REST or GraphQL.
 */
export const publishedOrCmsUser: Access = ({ req: { user } }) => {
  if (canAccessCms(roleOf(user))) {
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
