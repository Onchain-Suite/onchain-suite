import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntryTools } from "./entry-tools";

const tools = (over: Partial<Parameters<typeof EntryTools>[0]> = {}) => {
  const onSetSplit = vi.fn();
  render(
    <EntryTools
      count={1}
      split={false}
      canUnsplit
      onSetSplit={onSetSplit}
      addMenu={<button type="button">Add another way in</button>}
      {...over}
    />
  );
  return onSetSplit;
};

describe("EntryTools", () => {
  it("with one way in, says so and offers another, with nothing to choose", () => {
    tools();
    expect(screen.getByText("People start when")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add another way in" })
    ).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("with several, asks whether they share their first steps", () => {
    const onSetSplit = tools({ count: 2 });
    expect(
      screen.getByText("People start when any of these happen")
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("radio", { name: "Different first steps for each" })
    );
    expect(onSetSplit).toHaveBeenCalledWith(true);
  });

  it("will not merge the first steps back while any of them holds a step", () => {
    tools({ count: 2, split: true, canUnsplit: false });
    expect(
      screen.getByRole("radio", { name: "Same steps for everyone" })
    ).toBeDisabled();
  });

  it("leaves the add button out at the limit", () => {
    tools({ count: 3, addMenu: null });
    expect(screen.queryByRole("button", { name: /way in/ })).toBeNull();
  });
});
