import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { automationService } from "../automation.service";
import { protocolTemplates } from "../data/protocol-templates";
import { NewAutomationPage } from "./new";

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
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("../automation.service", () => ({
  automationService: { createAutomation: vi.fn() },
}));
vi.mock("../components/describe-loop-dialog", () => ({
  DescribeLoopDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Describe your Loop</div> : null,
}));

const create = vi.mocked(automationService.createAutomation);

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NewAutomationPage />
    </QueryClientProvider>
  );

describe("NewAutomationPage", () => {
  beforeEach(() => {
    router.push.mockReset();
    create.mockReset();
  });

  it("offers describe, scratch and every standard Loop under its group", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "New Loop" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Describe it/ })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Start from scratch/ })
    ).toBeTruthy();
    for (const group of [
      "Welcome and onboard",
      "Engage and grow",
      "Keep and win back",
    ]) {
      expect(screen.getByRole("heading", { name: group })).toBeTruthy();
    }
    for (const t of protocolTemplates) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${t.name}`) })
      ).toBeTruthy();
    }
  });

  it("creates the standard Loop and opens it in the builder", async () => {
    create.mockResolvedValue({ automationId: "auto_9" } as never);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Welcome series/ }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/automations/auto_9")
    );
    // A real draft: a trigger and its steps, not an empty shell.
    const body = create.mock.calls[0][0] as {
      name: string;
      trigger?: { type: string };
      flowGraph?: { nodes: unknown[] };
    };
    expect(body.name).toBe("Welcome series");
    expect(body.trigger?.type).toBe("list_joined");
    expect(body.flowGraph?.nodes.length).toBeGreaterThan(1);
  });

  it("creates one Loop however many cards are clicked while it is in flight", async () => {
    create.mockReturnValue(new Promise(() => undefined) as never);
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Welcome series/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Lead nurture/ }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    // Past the tick the second click would have landed on.
    await new Promise((r) => setTimeout(r, 50));
    expect(create).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /^Welcome series/ })
    ).toHaveTextContent("Creating your Loop…");
  });

  it("lets them try again when the Loop could not be created", async () => {
    create.mockRejectedValueOnce(new Error("Plan limit reached"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Welcome series/ }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /^Welcome series/ })
      ).toBeEnabled()
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("starts from scratch in the builder, and describes in a dialog", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Start from scratch/ }));
    expect(router.push).toHaveBeenCalledWith("/automations/new-id");

    fireEvent.click(screen.getByRole("button", { name: /Describe it/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Describe your Loop");
  });
});
