import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TeamSeats } from "./team-seats";
import { seatUsage } from "@/features/billing/seat-pricing";

const usage = (members: number, pendingInvites: number, limit: number) => {
  const u = seatUsage({ members, pendingInvites, limit });
  if (!u) throw new Error("no usage");
  return u;
};

describe("TeamSeats", () => {
  it("shows what is taken and says nothing more while a seat is free", () => {
    render(<TeamSeats usage={usage(1, 0, 4)} pendingInvites={0} />);

    expect(screen.getByText("1 of 4 taken")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  // It used to say an invite would add a seat and bill it. The backend
  // refuses the invite instead, so the way forward is Billing.
  it("sends them to Billing first when every seat is taken", () => {
    render(<TeamSeats usage={usage(2, 0, 2)} pendingInvites={0} />);

    expect(screen.getByText(/All 2 seats are taken/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "add a seat in Billing" })
    ).toHaveAttribute("href", "/settings?tab=billing");
    expect(screen.queryByText(/billed on your next invoice/)).toBeNull();
  });

  it("says when an invite that was never accepted is holding the last seat", () => {
    render(<TeamSeats usage={usage(1, 1, 2)} pendingInvites={1} />);

    expect(
      screen.getByText(/1 by an invite not accepted yet/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/or cancel an invite you no longer need/)
    ).toBeInTheDocument();
  });

  it("mentions a pending invite holding a seat before the seats run out", () => {
    render(<TeamSeats usage={usage(1, 1, 4)} pendingInvites={1} />);

    expect(
      screen.getByText("1 invite is holding a seat until it is accepted.")
    ).toBeInTheDocument();
  });
});
