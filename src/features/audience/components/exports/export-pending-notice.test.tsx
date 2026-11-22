import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExportPendingNotice } from "./export-pending-notice";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("ExportPendingNotice", () => {
  it("says the export waits for another admin and links to the requests", () => {
    render(<ExportPendingNotice estimatedRows={48210} />);
    expect(
      screen.getByText("Export waiting for approval by another admin")
    ).toBeInTheDocument();
    expect(screen.getByText(/48,210 contacts/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See export requests" })
    ).toHaveAttribute("href", "/settings?tab=exports");
  });
});
