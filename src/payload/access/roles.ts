/**
 * Who is allowed to do what in the CMS.
 *
 * Roles come from the `role` field on the CMS's own users collection
 * (src/payload/collections/users.ts), which Payload authenticates.
 *
 *   - `editor`      writes drafts; cannot publish, unpublish or delete
 *   - `admin`       everything an editor can do, plus publishing and deleting
 *   - `super_admin` all of the above, plus creating and deleting CMS accounts
 *
 * Everything here is pure so the authorisation boundary can be tested without a
 * database or a Payload instance. See roles.test.ts - this is the file that
 * decides who can put content on the public site, so it is the one place in the
 * blog that must not be "probably right".
 *
 * Comparisons are case- and separator-insensitive rather than a bare `===`. The
 * stored values are lowercase, but this module is handed role values off a `user`
 * object typed as loosely as Payload types it, and a silent mismatch here would
 * either lock out every admin or admit the wrong one.
 */

/** Every role that may sign into /admin at all. */
export const CMS_ROLES = ["EDITOR", "ADMIN", "SUPER_ADMIN"] as const;

/** Roles that may put content on the public site, or take it down. */
export const PUBLISHER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/** The role that may manage CMS accounts. */
export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

export type CmsRole = (typeof CMS_ROLES)[number];

/**
 * Normalises a role value to a canonical SCREAMING_SNAKE spelling, accepting the
 * spellings this value realistically arrives in - `super_admin`, `Super Admin`,
 * `super-admin`.
 *
 * Note this only normalises *shape*, never *authority*: an unrecognised value
 * returns null, and null is never authorised.
 */
export function normalizeRole(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toUpperCase().replace(/[\s-]+/g, "_");
}

/**
 * May sign in and work in the CMS - any of the three roles.
 *
 * This is the *read* boundary: it is what lets an editor see unpublished drafts
 * in the admin panel. It is deliberately not the write boundary for publishing.
 */
export function canAccessCms(role: unknown): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) {
    return false;
  }

  return (CMS_ROLES as readonly string[]).includes(normalized);
}

/**
 * May publish, unpublish or delete content.
 *
 * Editors are excluded on purpose: nothing reaches the public site without an
 * admin. Fails closed - anything unrecognised is denied, including roles that
 * merely *contain* an approved word (`NOT_ADMIN`, `SUPER_ADMINISTRATOR`).
 */
export function canPublish(role: unknown): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) {
    return false;
  }

  return (PUBLISHER_ROLES as readonly string[]).includes(normalized);
}

/** Whether a role may manage CMS accounts. Fails closed, same as above. */
export function isSuperAdminRole(role: unknown): boolean {
  return normalizeRole(role) === SUPER_ADMIN_ROLE;
}
