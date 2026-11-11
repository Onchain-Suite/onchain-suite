import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { pillTabId, PillTabs } from "./pill-tabs";

const TABS = [
  { key: "contacts", label: "Contacts", count: 1200 },
  { key: "segments", label: "Segments" },
] as const;

describe("PillTabs", () => {
  it("marks the active tab and reports a click on another", () => {
    const onChange = vi.fn();
    render(
      <PillTabs
        name="audience"
        label="Audience"
        tabs={[...TABS]}
        value="contacts"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("tablist", { name: "Audience" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Contacts/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    fireEvent.click(screen.getByRole("tab", { name: "Segments" }));
    expect(onChange).toHaveBeenCalledWith("segments");
  });

  it("shows a count once it is known, and nothing before", () => {
    render(
      <PillTabs
        name="audience"
        label="Audience"
        tabs={[...TABS]}
        value="contacts"
        onChange={() => undefined}
      />
    );
    expect(screen.getByRole("tab", { name: /Contacts/ })).toHaveTextContent(
      "1,200"
    );
    expect(screen.getByRole("tab", { name: "Segments" })).toHaveTextContent(
      /^Segments$/
    );
  });

  it("gives each tab the id its panel points back to", () => {
    render(
      <PillTabs
        name="integrations"
        label="Integrations section"
        tabs={[...TABS]}
        value="segments"
        onChange={() => undefined}
      />
    );
    expect(screen.getByRole("tab", { name: "Segments" })).toHaveAttribute(
      "id",
      pillTabId("integrations", "segments")
    );
  });
});
