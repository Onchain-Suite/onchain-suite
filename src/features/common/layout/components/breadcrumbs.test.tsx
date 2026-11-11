import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { breadcrumbsFor } from "../utils/breadcrumbs";
import { Breadcrumbs } from "./breadcrumbs";

describe("Breadcrumbs", () => {
  it("makes Home a real link and the current page plain text", () => {
    render(<Breadcrumbs crumbs={breadcrumbsFor("/campaigns")} />);
    const trail = within(
      screen.getByRole("navigation", { name: "Breadcrumb" })
    );

    expect(trail.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(trail.getByText("Campaigns")).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(trail.queryByRole("link", { name: "Campaigns" })).toBeNull();
  });

  it("links the section from a page inside it", () => {
    render(<Breadcrumbs crumbs={breadcrumbsFor("/audience/abc123")} />);
    const trail = within(
      screen.getByRole("navigation", { name: "Breadcrumb" })
    );

    expect(trail.getByRole("link", { name: "Audience" })).toHaveAttribute(
      "href",
      "/audience"
    );
    expect(trail.getByText("Contact")).toHaveAttribute("aria-current", "page");
  });

  it("shows the single word on Home, with nothing to click", () => {
    render(<Breadcrumbs crumbs={breadcrumbsFor("/dashboard")} />);
    const trail = within(
      screen.getByRole("navigation", { name: "Breadcrumb" })
    );

    expect(trail.getByText("Home")).toHaveAttribute("aria-current", "page");
    expect(trail.queryByRole("link")).toBeNull();
  });
});
