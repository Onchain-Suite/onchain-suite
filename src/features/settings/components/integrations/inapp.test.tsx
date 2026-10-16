import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authClient } from "@/lib/auth-client";

import InAppIntegration from "./inapp";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children?: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-select data-value={value} data-onchange={Boolean(onValueChange)}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span>Production</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children?: ReactNode;
    value: string;
  }) => (
    <button type="button" data-value={value}>
      {children}
    </button>
  ),
}));

const wrap = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>;
};

describe("InAppIntegration", () => {
  // The panel renders as embedded modal content (no outer collapsible card),
  // so every section is in the DOM immediately - its "Manage" toggles reveal
  // the inner controls.

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(authClient.useSession).mockReturnValue({
      data: { session: { activeOrganizationId: "org_123" } },
    } as unknown as ReturnType<typeof authClient.useSession>);

    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method ?? "GET").toUpperCase();

        if (
          url.endsWith("/api/v1/integrations/inapp/status") &&
          method === "GET"
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              inapp: {
                keys: { production: "pk_live_123", test: "pk_test_123" },
              },
              apiKeys: {
                secretKeys: [
                  {
                    id: "sk_1",
                    environment: "live",
                    createdAt: "2026-01-01T00:00:00.000Z",
                  },
                ],
              },
              sessionCount: 2,
              usage: { last24h: 10 },
            }),
          } as Response;
        }

        if (
          url.endsWith("/api/v1/integrations/inapp/origins") &&
          method === "GET"
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: "origin_1",
                origin: "https://app.example.com",
                environment: "production",
              },
            ],
          } as Response;
        }

        if (
          url.endsWith("/api/v1/integrations/inapp/origins") &&
          method === "POST"
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          } as Response;
        }

        if (
          url.includes("/api/v1/integrations/inapp/origins/") &&
          method === "DELETE"
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          } as Response;
        }

        if (
          url.endsWith("/api/v1/integrations/inapp/test-push") &&
          method === "POST"
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          } as Response;
        }

        if (
          url.endsWith("/api/v1/integrations/keys/secret") &&
          method === "POST"
        ) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ token: "sk_live_abc123" }),
          } as Response;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Not found" }),
        } as Response;
      })
    );
  });

  it("renders keys and allows toggling key visibility", async () => {
    render(wrap(<InAppIntegration />));

    await waitFor(() => {
      expect(screen.getByText(/active sessions/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Manage keys" }));
    fireEvent.click(screen.getByLabelText("Toggle publishable key visibility"));

    expect(screen.getByText("pk_live_123")).toBeInTheDocument();
    expect(screen.getByText("pk_test_123")).toBeInTheDocument();
  });

  it("submits add origin request", async () => {
    render(wrap(<InAppIntegration />));

    fireEvent.click(screen.getByRole("button", { name: "Manage origins" }));
    const input = await screen.findByPlaceholderText("https://app.example.com");
    fireEvent.change(input, { target: { value: "app.test.dev" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/v1/integrations/inapp/origins",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-org-id": "org_123" }),
        })
      );
    });
  });

  it("submits test push request", async () => {
    render(wrap(<InAppIntegration />));

    fireEvent.click(screen.getByRole("button", { name: "Compose test push" }));
    fireEvent.change(screen.getByPlaceholderText("0x…"), {
      target: { value: "0xabc" },
    });
    fireEvent.change(screen.getByPlaceholderText("New notification"), {
      target: { value: "Hello" },
    });
    fireEvent.change(screen.getByPlaceholderText("Hello from OnchainSuite"), {
      target: { value: "Body" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Send test push" }));

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/v1/integrations/inapp/test-push",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-org-id": "org_123" }),
        })
      );
    });
  });

  // Secret-key (sk_) creation was intentionally removed from the SDK surface
  // (leak risk); it now lives only in the Developer API card. No secret-key
  // test belongs here.
});
