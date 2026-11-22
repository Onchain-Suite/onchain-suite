import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { readHumanStats } from "../../utils/human-engagement";
import { HumanEngagementStats } from "./human-engagement-stats";

const stats = readHumanStats({
  humanClicks: 41,
  humanClickRate: 3.12,
  opens: {
    humanEstimateLow: 180,
    humanEstimateHigh: 512,
    apple: 361,
    machine: 27,
    raw: 540,
    rates: {
      humanEstimateLow: 13.69,
      humanEstimateHigh: 38.94,
      apple: 27.45,
      machine: 2.05,
      raw: 41.06,
    },
  },
});

describe("HumanEngagementStats", () => {
  it("leads with human clicks and click rate, then opens as a range", () => {
    render(<HumanEngagementStats stats={stats} />);
    const labels = screen
      .getAllByText(/^(Human clicks|Click rate|Open rate)$/)
      .map((el) => el.textContent?.trim());
    expect(labels).toEqual(["Human clicks", "Click rate", "Open rate"]);
    expect(screen.getByText("41")).toBeInTheDocument();
    expect(screen.getByText("3.1%")).toBeInTheDocument();
    expect(screen.getByText("13.7–38.9% (estimate)")).toBeInTheDocument();
  });

  it("shows Apple and machine opens apart, and raw opens on expand", () => {
    render(<HumanEngagementStats stats={stats} />);
    expect(screen.getByText(/Apple Mail opens: 361/)).toBeInTheDocument();
    expect(screen.getByText(/Machine opens: 27/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Raw opens"));
    expect(screen.getByText(/540 \(41.1%\)/)).toBeInTheDocument();
  });

  it("explains the open range on the info button", () => {
    render(<HumanEngagementStats stats={stats} />);
    expect(
      screen.getByRole("button", { name: "About open rate" })
    ).toBeInTheDocument();
  });

  it("renders nothing for older data", () => {
    const { container } = render(
      <HumanEngagementStats stats={readHumanStats({ uniqueOpens: 3 })} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
