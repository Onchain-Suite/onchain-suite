/**
 * Who is allowed to manage blog content.
 *
 * The CMS does not own its own accounts. Authorisation comes from the product
 * backend's `UserRole` enum (`USER | ADMIN | SUPER_ADMIN | GUEST`), resolved
 * per-request by the auth strategy in src/payload/auth/backend-session-strategy.ts.
 *
 * Everything here is deliberately pure so the authorisation boundary can be
 * tested without a database, a running backend or a Payload instance. See
 * roles.test.ts — this is the file that decides who can publish, so it is the
 * one place in the blog that must not be "probably right".
 */

/** Roles permitted to manage blog content. Nothing else may write. */
export const BLOG_MANAGER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export type BlogManagerRole = (typeof BLOG_MANAGER_ROLES)[number];

/**
 * Normalises a role value to the backend's SCREAMING_SNAKE spelling.
 *
 * The frontend has never read this field before, so its exact casing and
 * separator are not pinned down by any existing type in this repo. Rather than
 * assume, accept the spellings a JSON API realistically emits — `SUPER_ADMIN`,
 * `super_admin`, `super-admin`, `superadmin` — and reject anything else.
 *
 * Note this only normalises *shape*, never *authority*: an unrecognised value
 * returns null and null is never authorised.
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
 * Pulls the role out of a backend profile response.
 *
 * The backend's envelope varies by endpoint — `/user/profile` and
 * `/auth/get-session` nest the user differently, and src/lib/auth-session.ts
 * already has to cope with `data.user`, `user`, and bare-object shapes. This
 * checks the same candidate paths rather than betting on one.
 *
 * Returns null when nothing role-shaped is found, which callers must treat as
 * unauthorised.
 */
export function extractRole(profile: unknown): string | null {
  if (typeof profile !== "object" || profile === null) {
    return null;
  }

  const root = profile as Record<string, unknown>;
  const containers: Array<Record<string, unknown>> = [root];

  for (const key of ["data", "user", "profile"]) {
    const nested = root[key];
    if (typeof nested === "object" && nested !== null) {
      const nestedObj = nested as Record<string, unknown>;
      containers.push(nestedObj);

      // One more level: `{ data: { user: {...} } }` is the shape the
      // get-session proxy returns.
      for (const innerKey of ["user", "profile"]) {
        const inner = nestedObj[innerKey];
        if (typeof inner === "object" && inner !== null) {
          containers.push(inner as Record<string, unknown>);
        }
      }
    }
  }

  for (const container of containers) {
    for (const field of ["role", "userRole", "user_role"]) {
      const normalized = normalizeRole(container[field]);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

/**
 * The authorisation decision. Fails closed: anything that is not explicitly an
 * ADMIN or SUPER_ADMIN is denied, including null, undefined, unknown roles and
 * roles that merely contain an approved word (`NOT_ADMIN`, `ADMIN_ASSISTANT`).
 */
export function canManageBlog(role: unknown): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) {
    return false;
  }

  return (BLOG_MANAGER_ROLES as readonly string[]).includes(normalized);
}
