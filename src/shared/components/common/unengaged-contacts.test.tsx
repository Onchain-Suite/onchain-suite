import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UnengagedContactsToggle } from "./unengaged-contacts";

describe("UnengagedContactsToggle", () => {
  it("explains the default and asks before including unengaged contacts", async () => {
    const onChange = vi.fn();
    render(
      <UnengagedContactsToggle
        checked={false}
        onChange={onChange}
        excludedCount={42}
      />
    );
    expect(
      screen.getByText(/180 days, or 11 sends in a row/)
    ).toBeInTheDocument();
    expect(
      screen.getByText("42 unengaged contacts are skipped.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /Include unengaged/ }));
    expect(onChange).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Include unengaged contacts?")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Include them" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not include them when the sender backs out", async () => {
    const onChange = vi.fn();
    render(<UnengagedContactsToggle checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: /Include unengaged/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Keep skipping them" })
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("turns off without a confirm", () => {
    const onChange = vi.fn();
    render(<UnengagedContactsToggle checked onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: /Include unengaged/ }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
