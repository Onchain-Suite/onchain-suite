/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  canManageBlog,
  isSuperAdminRole,
  normalizeRole,
} from "@/payload/access/roles";

describe("canManageBlog", () => {
  it("allows both CMS roles", () => {
    // Stored values are lowercase; both spellings must work.
    expect(canManageBlog("admin")).toBe(true);
    expect(canManageBlog("super_admin")).toBe(true);
    expect(canManageBlog("ADMIN")).toBe(true);
    expect(canManageBlog("SUPER_ADMIN")).toBe(true);
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
    expect(canManageBlog(["admin"])).toBe(false);
  });

  it("denies roles that no longer exist or never did", () => {
    // `editor` was removed deliberately: the blog is admin-only. If it ever
    // reappears in data, it must not grant access.
    expect(canManageBlog("editor")).toBe(false);
    expect(canManageBlog("viewer")).toBe(false);
    expect(canManageBlog("user")).toBe(false);
    expect(canManageBlog("guest")).toBe(false);
    expect(canManageBlog("owner")).toBe(false);
  });

  it("tolerates casing and separator variants", () => {
    expect(canManageBlog("Admin")).toBe(true);
    expect(canManageBlog("super-admin")).toBe(true);
    expect(canManageBlog("Super Admin")).toBe(true);
    expect(canManageBlog("  admin  ")).toBe(true);
  });

  it("does not authorise roles that merely contain an approved word", () => {
    // Guards against a substring check sneaking in during a refactor.
    expect(canManageBlog("NOT_ADMIN")).toBe(false);
    expect(canManageBlog("ADMIN_ASSISTANT")).toBe(false);
    expect(canManageBlog("SUPER_ADMINISTRATOR")).toBe(false);
    expect(canManageBlog("ADMINS")).toBe(false);
    expect(canManageBlog("READONLY_ADMIN")).toBe(false);
    expect(canManageBlog("superadmin")).toBe(false);
  });
});

describe("isSuperAdminRole", () => {
  it("is true only for super_admin", () => {
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(isSuperAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdminRole("Super Admin")).toBe(true);
  });

  it("is false for a plain admin — managing accounts is a separate privilege", () => {
    expect(isSuperAdminRole("admin")).toBe(false);
    expect(isSuperAdminRole("ADMIN")).toBe(false);
  });

  it("fails closed on junk", () => {
    expect(isSuperAdminRole(null)).toBe(false);
    expect(isSuperAdminRole(undefined)).toBe(false);
    expect(isSuperAdminRole("")).toBe(false);
    expect(isSuperAdminRole("SUPER_ADMINISTRATOR")).toBe(false);
    expect(isSuperAdminRole("superadmin")).toBe(false);
    expect(isSuperAdminRole({ role: "super_admin" })).toBe(false);
  });

  it("implies blog management", () => {
    // A super admin must never be able to manage accounts but not content.
    expect(canManageBlog("super_admin")).toBe(true);
  });
});

describe("normalizeRole", () => {
  it("upcases and converts separators to underscores", () => {
    expect(normalizeRole("super admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("super-admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("Super_Admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("admin")).toBe("ADMIN");
  });

  it("returns null for anything not a usable string", () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole("  ")).toBeNull();
    expect(normalizeRole(42)).toBeNull();
  });
});
