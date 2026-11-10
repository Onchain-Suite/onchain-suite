import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readStartPath, saveStartPath } from "../utils/start-path";
import { useStartPath } from "./use-start-path";

const get = vi.fn();
const set = vi.fn();
vi.mock("../answers.service", () => ({
  answersService: {
    get: (...args: unknown[]) => get(...args),
    set: (...args: unknown[]) => set(...args),
  },
}));

const answer = (value: string | null) => ({
  startPath: value ? { value, setAt: "t", source: "home" } : null,
  goal: null,
});

const mount = (orgId: string) => {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useStartPath(orgId), { wrapper });
};

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  set.mockImplementation(async (body: { startPath: string }) =>
    answer(body.startPath)
  );
});

describe("useStartPath", () => {
  it("takes the server's answer and keeps a copy in the browser", async () => {
    get.mockResolvedValue(answer("chain"));
    const { result } = mount("org_server");
    expect(result.current.isResolved).toBe(false);
    await waitFor(() => expect(result.current.startPath).toBe("chain"));
    expect(result.current.isResolved).toBe(true);
    expect(readStartPath("org_server")).toBe("chain");
    expect(set).not.toHaveBeenCalled();
  });

  it("falls back to the browser's copy when the server cannot be reached", async () => {
    saveStartPath("org_offline", "site");
    get.mockRejectedValue(new Error("404"));
    const { result } = mount("org_offline");
    expect(result.current.startPath).toBe("site");
    expect(result.current.isResolved).toBe(true);
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current.startPath).toBe("site");
  });

  it("sends a browser-only answer up to the server, once", async () => {
    saveStartPath("org_local", "people");
    get.mockResolvedValue(answer(null));
    mount("org_local");
    await waitFor(() =>
      expect(set).toHaveBeenCalledWith(
        { startPath: "people", source: "home" },
        "org_local"
      )
    );
    expect(set).toHaveBeenCalledTimes(1);
  });

  it("resolves to no answer when neither side has one", async () => {
    get.mockResolvedValue(answer(null));
    const { result } = mount("org_new");
    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.startPath).toBeNull();
    expect(set).not.toHaveBeenCalled();
  });

  it("saves a new answer at once, and on the server", async () => {
    get.mockResolvedValue(answer("people"));
    const { result } = mount("org_change");
    await waitFor(() => expect(result.current.startPath).toBe("people"));
    act(() => result.current.setStartPath("chain"));
    expect(result.current.startPath).toBe("chain");
    expect(readStartPath("org_change")).toBe("chain");
    expect(set).toHaveBeenCalledWith(
      { startPath: "chain", source: "home" },
      "org_change"
    );
  });
});
