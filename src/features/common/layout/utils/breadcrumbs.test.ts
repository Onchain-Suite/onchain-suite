import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { breadcrumbsFor } from "./breadcrumbs";

const labels = (path: string) => breadcrumbsFor(path).map((c) => c.label);

/** Every page route under the (dashboard) group, as a concrete path. */
function dashboardRoutes(): string[] {
  const root = join(process.cwd(), "src/app/(dashboard)");
  const out: string[] = [];
  const walk = (dir: string, route: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        // Route groups add no segment; a dynamic segment becomes a sample id.
        const segment = name.startsWith("(")
          ? ""
          : name.startsWith("[")
            ? "/abc123"
            : `/${name}`;
        walk(full, `${route}${segment}`);
      } else if (name === "page.tsx") {
        out.push(route);
      }
    }
  };
  walk(root, "");
  return out;
}

describe("breadcrumbsFor", () => {
  it("is the single word on Home, not Home / Home", () => {
    expect(breadcrumbsFor("/dashboard")).toEqual([{ label: "Home" }]);
  });

  it("starts every other page with a link home", () => {
    expect(breadcrumbsFor("/campaigns")).toEqual([
      { label: "Home", href: "/dashboard" },
      { label: "Campaigns" },
    ]);
  });

  it("names the sections the way the sidebar does", () => {
    expect(labels("/automations")).toEqual(["Home", "Loops"]);
    expect(labels("/integrations")).toEqual(["Home", "Integrations"]);
    expect(labels("/analytics")).toEqual(["Home", "Analytics"]);
    expect(labels("/inbox")).toEqual(["Home", "Inbox"]);
  });

  it("links the section from a page inside it", () => {
    expect(breadcrumbsFor("/audience/abc123")).toEqual([
      { label: "Home", href: "/dashboard" },
      { label: "Audience", href: "/audience" },
      { label: "Contact" },
    ]);
    expect(labels("/audience/import-export")).toEqual([
      "Home",
      "Audience",
      "Import and export",
    ]);
    expect(labels("/campaigns/new")).toEqual([
      "Home",
      "Campaigns",
      "New campaign",
    ]);
    expect(labels("/campaigns/abc123")).toEqual([
      "Home",
      "Campaigns",
      "Campaign",
    ]);
    expect(labels("/automations/new")).toEqual(["Home", "Loops", "New Loop"]);
    expect(labels("/automations/abc123")).toEqual(["Home", "Loops", "Loop"]);
    expect(labels("/forms/abc123")).toEqual(["Home", "Forms", "Form"]);
    expect(labels("/settings/company")).toEqual([
      "Home",
      "Settings",
      "Company",
    ]);
    expect(labels("/intelligence/segments/create")).toEqual([
      "Home",
      "Intelligence",
      "New segment",
    ]);
    expect(labels("/intelligence/reports/abc123")).toEqual([
      "Home",
      "Intelligence",
      "Report",
    ]);
  });

  it("treats a tab in the address as the section itself", () => {
    expect(labels("/analytics/all")).toEqual(["Home", "Analytics"]);
    expect(labels("/intelligence/analytics")).toEqual(["Home", "Intelligence"]);
  });

  it("does not let one section claim another that shares its opening letters", () => {
    expect(labels("/formsets")).toEqual(["Home"]);
  });

  it("ignores a trailing slash", () => {
    expect(labels("/campaigns/")).toEqual(["Home", "Campaigns"]);
  });

  it("still offers the way home on a route no section claims", () => {
    expect(breadcrumbsFor("/somewhere-new")).toEqual([
      { label: "Home", href: "/dashboard" },
    ]);
  });

  it("gives every dashboard route a named trail", () => {
    const routes = dashboardRoutes();
    expect(routes.length).toBeGreaterThan(10);
    for (const route of routes) {
      const trail = breadcrumbsFor(route);
      const current = trail[trail.length - 1];
      // The page you are on is named and is not a link to itself.
      expect(current.href, route).toBeUndefined();
      expect(trail[0].label, route).toBe("Home");
      for (const crumb of trail.slice(0, -1)) {
        expect(crumb.href, route).toBeTruthy();
      }
    }
  });
});
