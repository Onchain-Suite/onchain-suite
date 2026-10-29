import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TOUR } from "../data/tour";
import { endTour, resetTour, startTour } from "../hooks/use-tour";
import { ProductTour } from "./product-tour";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/dashboard",
}));

const mockMode = vi.fn();
vi.mock("../hooks/use-workspace-mode", () => ({
  useWorkspaceMode: () => mockMode(),
}));

// No session in the test, so the first stop keeps its plain title (not the by-name welcome).
vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: undefined }),
}));

beforeEach(() => {
  localStorage.clear();
  resetTour();
  mockMode.mockReturnValue({ mode: "live", isLoading: false, signals: {} });
});

afterEach(() => {
  endTour();
  vi.clearAllMocks();
});

describe("ProductTour", () => {
  it("renders nothing until started", () => {
    const { container } = render(<ProductTour />);
    expect(container).toBeEmptyDOMElement();
  });

  it("auto-starts once for an empty workspace", () => {
    mockMode.mockReturnValue({ mode: "empty", isLoading: false, signals: {} });
    render(<ProductTour />);
    expect(screen.getByText(TOUR[0].title)).toBeInTheDocument();
    expect(screen.getByText(`1 of ${TOUR.length}`)).toBeInTheDocument();
  });

  it("does not auto-start for a live workspace", () => {
    const { container } = render(<ProductTour />);
    expect(container).toBeEmptyDOMElement();
  });

  it("advances through stops and navigates on a route change", () => {
    startTour();
    render(<ProductTour />);
    expect(screen.getByText(TOUR[0].title)).toBeInTheDocument();
    // Stop 2 is the getting-started checklist on the same /dashboard route - no navigation.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(TOUR[1].title)).toBeInTheDocument();
    // Stop 3 (Campaigns) is a different route, so it navigates.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(TOUR[2].title)).toBeInTheDocument();
    expect(push).toHaveBeenCalledWith(TOUR[2].to);
  });

  it("ends when Skip is clicked and stays done", () => {
    startTour();
    const { container, rerender } = render(<ProductTour />);
    fireEvent.click(screen.getByRole("button", { name: /skip tour/i }));
    expect(container).toBeEmptyDOMElement();
    // Done persists, so an empty workspace no longer auto-starts it.
    mockMode.mockReturnValue({ mode: "empty", isLoading: false, signals: {} });
    rerender(<ProductTour />);
    expect(container).toBeEmptyDOMElement();
  });
});
