import { describe, expect, it } from "vitest";

import { buildMessageRows } from "./message-stats";

const nodes = [
  { id: "t", type: "trigger" },
  { id: "e1", type: "send_email", data: { subject: "Welcome" } },
  { id: "p1", type: "send_inapp", data: {} },
];

describe("buildMessageRows", () => {
  it("joins send steps to their counts, human block included", () => {
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
    expect(rows.map((r) => r.id)).toEqual(["e1", "p1"]);
    expect(rows[0].title).toBe("Welcome");
    expect(rows[0].counts?.human.humanClicks).toBe(7);
    expect(rows[0].counts?.human.opens?.rates.humanEstimateHigh).toBe(51);
    expect(rows[1].counts).toBeNull();
    expect(rows[1].title).toBe("In-app push");
  });

  it("keeps working on older data without the human fields", () => {
    const rows = buildMessageRows(nodes, {
      messages: [
        { nodeId: "e1", sent: 1, delivered: 1, opened: 1, clicked: 0 },
      ],
    });
    expect(rows[0].counts?.human).toEqual({
      humanClicks: null,
      humanClickRate: null,
      opens: null,
    });
  });
});
