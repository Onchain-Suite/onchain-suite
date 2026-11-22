import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MessagesInFlow } from "./messages-in-flow";
import { buildMessageRows } from "@/features/automation/utils/message-stats";

const nodes = [{ id: "e1", type: "send_email", data: { subject: "Welcome" } }];

describe("MessagesInFlow", () => {
  it("puts clicks before opens and shows opens as a range", () => {
    const rows = buildMessageRows(nodes, {
      messages: [
        {
          nodeId: "e1",
          sent: 100,
          delivered: 98,
          opened: 60,
          clicked: 9,
          humanClicks: 7,
          humanClickRate: 7.14,
          opens: {
            humanEstimateLow: 20,
            humanEstimateHigh: 50,
            apple: 35,
            machine: 5,
            raw: 60,
            rates: {
              humanEstimateLow: 20.4,
              humanEstimateHigh: 51,
              apple: 35.7,
              machine: 5.1,
              raw: 61.2,
            },
          },
        },
      ],
    });
    render(<MessagesInFlow rows={rows} />);
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).toEqual(["Message", "Sent", "Clicked", "Opened / Viewed"]);
    expect(screen.getByText("20.4–51% (estimate)")).toBeInTheDocument();
    expect(screen.getByText("9 incl. scanners")).toBeInTheDocument();
    expect(
      screen.getByText(/Apple 35 · machine 5 · raw 60/)
    ).toBeInTheDocument();
  });

  it("shows plain counts for older data", () => {
    const rows = buildMessageRows(nodes, {
      messages: [
        { nodeId: "e1", sent: 3, delivered: 3, opened: 2, clicked: 1 },
      ],
    });
    render(<MessagesInFlow rows={rows} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
