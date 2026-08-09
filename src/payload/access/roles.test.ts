/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  canAccessCms,
  canPublish,
  isSuperAdminRole,
  normalizeRole,
} from "@/payload/access/roles";

const JUNK = [
  null,
  undefined,
  "",
  "   ",
  0,
  1,
  true,
  {},
  [],
  ["admin"],
  { role: "admin" },
];

/** Roles that look like an approved one but must never be authorised. */
const LOOKALIKES = [
  "NOT_ADMIN",
  "ADMIN_ASSISTANT",
  "SUPER_ADMINISTRATOR",
  "ADMINS",
  "READONLY_ADMIN",
  "superadmin",
  "NOT_EDITOR",
  "EDITOR_IN_CHIEF",
  "EDITORS",
];

describe("canAccessCms", () => {
  it("allows all three CMS roles", () => {
    // Stored values are lowercase; both spellings must work.
    for (const role of ["editor", "admin", "super_admin"]) {
      expect(canAccessCms(role)).toBe(true);
      expect(canAccessCms(role.toUpperCase())).toBe(true);
    }
  });

  it("denies roles that belong to the product, not the CMS", () => {
    // The product has its own OWNER/ADMIN/EDITOR/VIEWER org roles and a
    // USER/GUEST system enum. Only CMS roles grant CMS access.
    expect(canAccessCms("viewer")).toBe(false);
    expect(canAccessCms("owner")).toBe(false);
    expect(canAccessCms("user")).toBe(false);
    expect(canAccessCms("guest")).toBe(false);
  });

  it("fails closed on junk and lookalikes", () => {
    for (const value of JUNK) {
      expect(canAccessCms(value)).toBe(false);
    }
    for (const value of LOOKALIKES) {
      expect(canAccessCms(value)).toBe(false);
    }
  });
});

describe("canPublish", () => {
  it("allows admins and super admins", () => {
    expect(canPublish("admin")).toBe(true);
    expect(canPublish("ADMIN")).toBe(true);
    expect(canPublish("super_admin")).toBe(true);
    expect(canPublish("Super Admin")).toBe(true);
  });

  it("does NOT allow editors — this is the whole point of the role", () => {
    expect(canPublish("editor")).toBe(false);
    expect(canPublish("EDITOR")).toBe(false);
    expect(canPublish("Editor")).toBe(false);
  });

  it("fails closed on junk and lookalikes", () => {
    for (const value of JUNK) {
      expect(canPublish(value)).toBe(false);
    }
    for (const value of LOOKALIKES) {
      expect(canPublish(value)).toBe(false);
    }
  });
});

describe("isSuperAdminRole", () => {
  it("is true only for super_admin", () => {
    expect(isSuperAdminRole("super_admin")).toBe(true);
    expect(isSuperAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isSuperAdminRole("super-admin")).toBe(true);
  });

  it("is false for admin and editor — managing accounts is separate", () => {
    expect(isSuperAdminRole("admin")).toBe(false);
    expect(isSuperAdminRole("editor")).toBe(false);
  });

  it("fails closed on junk and lookalikes", () => {
    for (const value of JUNK) {
      expect(isSuperAdminRole(value)).toBe(false);
    }
    for (const value of LOOKALIKES) {
      expect(isSuperAdminRole(value)).toBe(false);
    }
  });
});

describe("role hierarchy is consistent", () => {
  it("every publisher can also access the CMS", () => {
    for (const role of ["admin", "super_admin"]) {
      expect(canPublish(role) && canAccessCms(role)).toBe(true);
    }
  });

  it("a super admin can publish — never accounts-only", () => {
    expect(canPublish("super_admin")).toBe(true);
  });

  it("an editor can access the CMS but not publish", () => {
    expect(canAccessCms("editor")).toBe(true);
    expect(canPublish("editor")).toBe(false);
    expect(isSuperAdminRole("editor")).toBe(false);
  });
});

describe("normalizeRole", () => {
  it("upcases and converts separators to underscores", () => {
    expect(normalizeRole("super admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("super-admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("Super_Admin")).toBe("SUPER_ADMIN");
    expect(normalizeRole("editor")).toBe("EDITOR");
  });

  it("returns null for anything not a usable string", () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole("  ")).toBeNull();
    expect(normalizeRole(42)).toBeNull();
  });
});
