import { describe, expect, it } from "vitest";

import {
  flattenSections,
  isBranchRowActive,
  isRowActive,
  type NavItem,
  resolveActiveNavUrl,
} from "./nav-utils";

const items: NavItem[] = [
  { title: "Dashboard", url: "/" },
  { title: "Intelligence", url: "/intelligence" },
  { title: "Analytics", url: "/intelligence/analytics" },
  { title: "Settings", url: "/settings" },
];

describe("resolveActiveNavUrl", () => {
  it("picks the most specific match - Analytics wins over Intelligence on its route", () => {
    expect(resolveActiveNavUrl("/intelligence/analytics", items)).toBe(
      "/intelligence/analytics"
    );
  });

  it("keeps Intelligence active on its own route and deeper chat routes", () => {
    expect(resolveActiveNavUrl("/intelligence", items)).toBe("/intelligence");
    // A child of intelligence that ISN'T analytics still belongs to Intelligence.
    expect(resolveActiveNavUrl("/intelligence/segments/create", items)).toBe(
      "/intelligence"
    );
  });

  it("Dashboard ('/') only matches exactly, never as a prefix", () => {
    expect(resolveActiveNavUrl("/", items)).toBe("/");
    expect(resolveActiveNavUrl("/settings", items)).toBe("/settings");
  });

  it("only the resolved row reports active", () => {
    const activeUrl = resolveActiveNavUrl("/intelligence/analytics", items);
    expect(isRowActive({ url: "/intelligence" }, activeUrl)).toBe(false);
    expect(isRowActive({ url: "/intelligence/analytics" }, activeUrl)).toBe(
      true
    );
  });

  it("a placeholder (#) row falls back to its explicit isActive flag", () => {
    const activeUrl = resolveActiveNavUrl("/intelligence", items);
    expect(isRowActive({ url: "#", isActive: true }, activeUrl)).toBe(true);
    expect(isRowActive({ url: "#" }, activeUrl)).toBe(false);
  });

  it("a collapsible parent is branch-active when a child is the active route", () => {
    const child = { title: "Segments", url: "/customers/segments" };
    const parent: NavItem = {
      title: "Customers",
      url: "/customers",
      items: [child],
    };
    const activeUrl = resolveActiveNavUrl("/customers/segments", [parent]);
    expect(isBranchRowActive(parent, activeUrl)).toBe(true);
    // The parent row itself is not the most-specific match…
    expect(isRowActive(parent, activeUrl)).toBe(false);
    // …but the child is.
    expect(isRowActive(child, activeUrl)).toBe(true);
  });
});

describe("query-aware rows (Audience: Contacts vs Segments)", () => {
  const audience: NavItem[] = [
    {
      title: "Audience",
      url: "/audience",
      items: [
        { title: "Contacts", url: "/audience" },
        { title: "Segments", url: "/audience?tab=segments" },
      ],
    },
  ];

  it("lights Segments only on its tab", () => {
    expect(resolveActiveNavUrl("/audience", audience, "?tab=segments")).toBe(
      "/audience?tab=segments"
    );
  });

  it("falls back to Contacts on the plain page and on other tabs", () => {
    expect(resolveActiveNavUrl("/audience", audience, "")).toBe("/audience");
    expect(resolveActiveNavUrl("/audience", audience, "?tab=lists")).toBe(
      "/audience"
    );
  });

  it("keeps Contacts for a contact's own page", () => {
    expect(resolveActiveNavUrl("/audience/abc", audience, "")).toBe(
      "/audience"
    );
  });
});

describe("flattenSections", () => {
  it("joins every section's rows in order", () => {
    expect(
      flattenSections([
        { items: [{ title: "Home", url: "/dashboard" }] },
        { label: "Engage", items: [{ title: "Forms", url: "/forms" }] },
      ]).map((i) => i.title)
    ).toEqual(["Home", "Forms"]);
  });
});
