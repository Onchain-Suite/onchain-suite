import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MIGRATIONS } from "../../data/migrations";
import { MigrateList } from "./migrate-list";

vi.mock("../../hooks/use-connections", () => ({
  useConnections: () => ({
    connections: [{ connector: "mailchimp", verified: true, config: {} }],
    isLoading: false,
  }),
}));

// The dialog connects and runs a migration; the list only has to open it.
vi.mock("./migrate-dialog", () => ({
  MigrateDialog: ({ migration }: { migration: { name: string } | null }) =>
    migration ? <div role="dialog">Migrate from {migration.name}</div> : null,
}));

const card = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("MigrateList", () => {
  it("lists every tool under its category, with a rail to narrow them", () => {
    render(<MigrateList />);

    const rail = within(
      screen.getByRole("navigation", { name: "Migration categories" })
    );
    expect(rail.getByRole("button", { name: /All/ })).toHaveTextContent(
      String(MIGRATIONS.length)
    );

    fireEvent.click(rail.getByRole("button", { name: /^CRM/ }));
    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument();
    expect(card("HubSpot")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Mailchimp/ })).toBeNull();
  });

  it("says before anything starts whether data stays behind", () => {
    render(<MigrateList />);

    // Mailchimp has an importer and leaves campaign history behind.
    expect(card("Mailchimp")).toHaveTextContent("Some data stays behind");
    expect(within(card("Mailchimp")).getByLabelText("Connected")).toBeTruthy();
    // No importer: it comes in as a file, so nothing is promised.
    expect(card("Substack")).toHaveTextContent("Comes in as a CSV export");
    expect(card("Substack")).not.toHaveTextContent("Everything comes across");
    // Klaviyo, Customer.io, Braze and Paragraph have importers on the server.
    for (const name of ["Klaviyo", "Customer.io", "Braze", "Paragraph"]) {
      expect(card(name)).not.toHaveTextContent("Comes in as a CSV export");
    }
  });

  it("searches across categories and hides the rail while it does", () => {
    render(<MigrateList />);

    fireEvent.change(screen.getByLabelText("Search tools to migrate from"), {
      target: { value: "hubspot" },
    });
    expect(screen.getByRole("heading", { name: "1 tool" })).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Migration categories" })
    ).toBeNull();
  });

  it("offers the CSV route when nothing matches", () => {
    render(<MigrateList />);

    fireEvent.change(screen.getByLabelText("Search tools to migrate from"), {
      target: { value: "zzzmail" },
    });
    expect(
      screen.getByRole("heading", { name: /No migration built for/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ask for zzzmail" })
    ).toBeTruthy();
    expect(card("CSV file")).toBeInTheDocument();
  });

  it("opens the tool's dialog from its card", () => {
    render(<MigrateList />);

    fireEvent.click(card("Mailchimp"));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Migrate from Mailchimp"
    );
  });
});
