import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoopRow } from "../utils/loop-rows";
import { LoopsTable } from "./loops-table";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: unknown;
    children: React.ReactNode;
  }) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

const row = (over: Partial<LoopRow> = {}): LoopRow =>
  ({
    id: "loop_1",
    name: "Welcome series",
    status: "active",
    triggerLabel: "Joins a list",
    entries: 120,
    optInEmailsSent: 0,
    completionRate: 42,
    conversions: 9,
    lastTriggered: new Date().toISOString(),
    ...over,
  }) as LoopRow;

describe("LoopsTable", () => {
  beforeEach(() => router.push.mockReset());

  it("duplicates a Loop from its row without opening it", () => {
    const onDuplicate = vi.fn();
    render(
      <LoopsTable rows={[row()]} onDuplicate={onDuplicate} onDelete={vi.fn()} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Duplicate Welcome series" })
    );

    expect(onDuplicate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "loop_1" })
    );
    // The click is the row action's alone: the row itself does not open.
    expect(router.push).not.toHaveBeenCalled();
  });

  it("holds every Duplicate while one copy is being made", () => {
    render(
      <LoopsTable
        rows={[row(), row({ id: "loop_2", name: "Win-back" })]}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        duplicatingId="loop_1"
      />
    );

    expect(
      screen.getByRole("button", { name: "Duplicate Welcome series" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Duplicate Win-back" })
    ).toBeDisabled();
  });

  it("still deletes from the row", () => {
    const onDelete = vi.fn();
    render(
      <LoopsTable rows={[row()]} onDuplicate={vi.fn()} onDelete={onDelete} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Welcome series" })
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "loop_1" })
    );
  });
});
