/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  canManageBlog,
  extractRole,
  normalizeRole,
} from "@/payload/access/roles";

describe("canManageBlog", () => {
  it("allows the two management roles", () => {
    expect(canManageBlog("ADMIN")).toBe(true);
    expect(canManageBlog("SUPER_ADMIN")).toBe(true);
  });

  it("denies every other backend UserRole", () => {
    // The backend enum is USER | ADMIN | SUPER_ADMIN | GUEST.
    expect(canManageBlog("USER")).toBe(false);
    expect(canManageBlog("GUEST")).toBe(false);
  });

  it("denies absent or non-string roles rather than throwing", () => {
    expect(canManageBlog(null)).toBe(false);
    expect(canManageBlog(undefined)).toBe(false);
    expect(canManageBlog("")).toBe(false);
    expect(canManageBlog("   ")).toBe(false);
    expect(canManageBlog(0)).toBe(false);
    expect(canManageBlog(1)).toBe(false);
    expect(canManageBlog(true)).toBe(false);
    expect(canManageBlog({})).toBe(false);
    expect(canManageBlog([])).toBe(false);
    expect(canManageBlog(["ADMIN"])).toBe(false);
  });

  it("accepts the casing and separator variants a JSON API may emit", () => {
    expect(canManageBlog("admin")).toBe(true);
    expect(canManageBlog("Admin")).toBe(true);
    expect(canManageBlog("super_admin")).toBe(true);
    expect(canManageBlog("super-admin")).toBe(true);
    expect(canManageBlog("Super Admin")).toBe(true);
    expect(canManageBlog("  ADMIN  ")).toBe(true);
  });

  it("does not authorise roles that merely contain an approved word", () => {
    // Guards against a substring check sneaking in during a refactor.
    expect(canManageBlog("NOT_ADMIN")).toBe(false);
    expect(canManageBlog("ADMIN_ASSISTANT")).toBe(false);
    expect(canManageBlog("SUPER_ADMINISTRATOR")).toBe(false);
    expect(canManageBlog("ADMINS")).toBe(false);
    expect(canManageBlog("READONLY_ADMIN")).toBe(false);
  });

  it("does not treat 'superadmin' spelled without a separator as unknown", () => {
    // Normalisation collapses spaces/hyphens but cannot invent an underscore,
    // so this documents the real behaviour instead of asserting a guess.
    expect(canManageBlog("superadmin")).toBe(false);
  });
});

describe("normalizeRole", () => {
  it("upcases and converts separators to underscores", () => {
    expect(normalizeRole("super admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("super-admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("Super_Admin")).toBe("SUPER_ADMIN");
  });

  it("returns null for anything not a usable string", () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole("  ")).toBeNull();
    expect(normalizeRole(42)).toBeNull();
  });
});

describe("extractRole", () => {
  it("finds the role at the top level", () => {
    expect(extractRole({ role: "ADMIN" })).toBe("ADMIN");
  });

  it("finds the role under the envelope shapes this backend uses", () => {
    // Mirrors the shapes src/lib/auth-session.ts already has to normalise.
    expect(extractRole({ data: { role: "ADMIN" } })).toBe("ADMIN");
    expect(extractRole({ user: { role: "SUPER_ADMIN" } })).toBe("SUPER_ADMIN");
    expect(extractRole({ data: { user: { role: "ADMIN" } } })).toBe("ADMIN");
    expect(
      extractRole({ success: true, data: { user: { role: "GUEST" } } })
    ).toBe("GUEST");
  });

  it("accepts alternate field names", () => {
    expect(extractRole({ userRole: "ADMIN" })).toBe("ADMIN");
    expect(extractRole({ user_role: "ADMIN" })).toBe("ADMIN");
    expect(extractRole({ data: { userRole: "SUPER_ADMIN" } })).toBe(
      "SUPER_ADMIN"
    );
  });

  it("returns null when no role is present, so the caller denies", () => {
    expect(extractRole({})).toBeNull();
    expect(extractRole({ user: { email: "a@b.c" } })).toBeNull();
    expect(extractRole(null)).toBeNull();
    expect(extractRole(undefined)).toBeNull();
    expect(extractRole("ADMIN")).toBeNull();
    expect(extractRole(123)).toBeNull();
  });

  it("does not confuse an organisation role with the system role", () => {
    // The product also has org roles (OWNER/ADMIN/EDITOR/VIEWER) on a
    // different field. Only `role`-shaped system fields are read, so an
    // org-only payload yields nothing and access is denied.
    expect(extractRole({ user: { organizationRole: "OWNER" } })).toBeNull();
    expect(extractRole({ orgRole: "ADMIN" })).toBeNull();
  });

  it("composes with canManageBlog end to end", () => {
    const allow = { success: true, data: { user: { role: "super_admin" } } };
    const deny = { success: true, data: { user: { role: "user" } } };
    expect(canManageBlog(extractRole(allow))).toBe(true);
    expect(canManageBlog(extractRole(deny))).toBe(false);
  });
});
