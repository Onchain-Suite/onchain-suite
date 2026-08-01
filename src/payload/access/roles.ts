/**
 * Who is allowed to manage blog content.
 *
 * Roles come from the `role` field on the CMS's own users collection
 * (src/payload/collections/users.ts), which Payload authenticates. There is no
 * editor role — every CMS account is an administrator:
 *
 *   - `admin`       manages blog content
 *   - `super_admin` additionally manages CMS accounts
 *
 * Everything here is pure so the authorisation boundary can be tested without a
 * database or a Payload instance. See roles.test.ts — this is the file that
 * decides who can publish, so it is the one place in the blog that must not be
 * "probably right".
 *
 * Comparisons are case- and separator-insensitive rather than a bare `===`. The
 * stored values are `admin` / `super_admin`, but this module is also handed role
 * values from a `user` object typed as loosely as Payload types it, and a silent
 * mismatch here would either lock out every admin or admit the wrong one.
 */

/** Roles permitted to manage blog content. Nothing else may write. */
export const BLOG_MANAGER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/** The role permitted to manage CMS accounts. */
export const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

export type BlogManagerRole = (typeof BLOG_MANAGER_ROLES)[number];

/**
 * Normalises a role value to a canonical SCREAMING_SNAKE spelling, accepting the
 * spellings this value realistically arrives in — `super_admin`, `Super Admin`,
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
 * The authorisation decision for managing blog content. Fails closed: anything
 * that is not explicitly `admin` or `super_admin` is denied, including null,
 * undefined, unknown roles, and roles that merely *contain* an approved word
 * (`NOT_ADMIN`, `ADMIN_ASSISTANT`).
 */
export function canManageBlog(role: unknown): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) {
    return false;
  }

  return (BLOG_MANAGER_ROLES as readonly string[]).includes(normalized);
}

/** Whether a role may manage CMS accounts. Fails closed, same as above. */
export function isSuperAdminRole(role: unknown): boolean {
  return normalizeRole(role) === SUPER_ADMIN_ROLE;
}
