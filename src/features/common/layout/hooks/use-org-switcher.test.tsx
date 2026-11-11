import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";
import { ORG_ACCESS_LOST_EVENT } from "@/lib/org-access";
import { ORG_SELECTION_COOKIE } from "@/lib/utils";

import { resetOrganizationListCache } from "../organization-list.service";
import { useOrgSwitcher } from "./use-org-switcher";

const session = {
  user: { id: "user_1" },
  session: { activeOrganizationId: "org_1" },
};

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: session }),
    getSession: vi.fn(async () => ({ data: session })),
  },
}));
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(async () => ({
      data: [{ id: "org_1", name: "Acme", slug: "acme" }],
    })),
    post: vi.fn(async () => ({ status: 200, data: { success: true } })),
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("swr", () => ({ default: () => ({ data: undefined }) }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const ACME = { id: "org_1", name: "Acme", slug: "acme" };
const BETA = { id: "org_2", name: "Beta", slug: "beta" };
const listReturns = (...lists: unknown[][]) => {
  const get = vi.mocked(apiClient.get);
  get.mockReset();
  for (const list of lists) get.mockResolvedValueOnce({ data: list } as never);
  // Anything after the scripted reads keeps answering with the last list.
  get.mockResolvedValue({ data: lists[lists.length - 1] } as never);
};

const clearOrgCookie = () => {
  document.cookie = `${ORG_SELECTION_COOKIE}=; path=/; max-age=0`;
};

describe("useOrgSwitcher", () => {
  beforeEach(() => {
    clearOrgCookie();
    window.sessionStorage.clear();
    resetOrganizationListCache();
    vi.mocked(toast.info).mockReset();
    listReturns([ACME]);
  });

  // The dashboard shell hung on its skeleton here: a signed-in session with an
  // active org but no selection cookie (a new browser session). The switcher
  // adopts the session's org; the shell follows `confirmedActiveOrgId`.
  it("confirms the session's org when there is no selection cookie yet", async () => {
    expect(document.cookie).not.toContain(ORG_SELECTION_COOKIE);
    const { result } = renderHook(() => useOrgSwitcher());

    await waitFor(() =>
      expect(result.current.confirmedActiveOrgId).toBe("org_1")
    );
    await waitFor(() => expect(result.current.activeOrg?.name).toBe("Acme"));
    expect(document.cookie).toContain(`${ORG_SELECTION_COOKIE}=org_1`);
  });

  // A workspace deleted by an admin stayed in Switch workspace, and stayed
  // selected, until the five-minute cache happened to expire.
  it("drops a deleted workspace on refresh and moves off it", async () => {
    document.cookie = `${ORG_SELECTION_COOKIE}=org_2; path=/`;
    listReturns([ACME, BETA], [ACME]);
    const { result } = renderHook(() => useOrgSwitcher());
    await waitFor(() => expect(result.current.organizations).toHaveLength(2));

    await act(async () => {
      await result.current.refresh(true);
    });

    expect(result.current.organizations).toEqual([ACME]);
    expect(document.cookie).toContain(`${ORG_SELECTION_COOKIE}=org_1`);
    expect(toast.info).toHaveBeenCalledWith(
      "Beta is no longer available. You are now in Acme."
    );
  });

  it("drops a deleted workspace quietly when it was not the one they were in", async () => {
    document.cookie = `${ORG_SELECTION_COOKIE}=org_1; path=/`;
    listReturns([ACME, BETA], [ACME]);
    const { result } = renderHook(() => useOrgSwitcher());
    await waitFor(() => expect(result.current.organizations).toHaveLength(2));

    await act(async () => {
      await result.current.refresh(true);
    });

    expect(result.current.organizations).toEqual([ACME]);
    expect(document.cookie).toContain(`${ORG_SELECTION_COOKIE}=org_1`);
    expect(toast.info).not.toHaveBeenCalled();
  });

  it("clears the selection when their only workspace is deleted", async () => {
    document.cookie = `${ORG_SELECTION_COOKIE}=org_1; path=/`;
    listReturns([ACME], []);
    const { result } = renderHook(() => useOrgSwitcher());
    await waitFor(() => expect(result.current.organizations).toHaveLength(1));

    await act(async () => {
      await result.current.refresh(true);
    });

    expect(result.current.organizations).toEqual([]);
    expect(document.cookie).not.toContain(`${ORG_SELECTION_COOKIE}=org_1`);
    expect(result.current.confirmedActiveOrgId).toBeNull();
  });

  it("re-reads the list once when requests start failing for a lost workspace", async () => {
    document.cookie = `${ORG_SELECTION_COOKIE}=org_2; path=/`;
    listReturns([ACME, BETA], [ACME]);
    const { result } = renderHook(() => useOrgSwitcher());
    await waitFor(() => expect(result.current.organizations).toHaveLength(2));
    // The first read came from the server a moment ago; age it past the gap
    // the way a tab left open would.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 60_000);

    // A page fires many requests at once; all of them fail the same way.
    await act(async () => {
      for (let i = 0; i < 5; i += 1) {
        window.dispatchEvent(new CustomEvent(ORG_ACCESS_LOST_EVENT));
      }
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.organizations).toEqual([ACME]));
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(2);
  });

  // The list was read a moment ago, so the read is too soon to repeat. It
  // used to be dropped, and a page that had finished loading never asked again.
  it("puts off the re-read when the list is fresh, and still makes it", async () => {
    document.cookie = `${ORG_SELECTION_COOKIE}=org_2; path=/`;
    listReturns([ACME, BETA], [ACME]);
    const { result } = renderHook(() => useOrgSwitcher());
    await waitFor(() => expect(result.current.organizations).toHaveLength(2));

    vi.useFakeTimers();
    act(() => {
      window.dispatchEvent(new CustomEvent(ORG_ACCESS_LOST_EVENT));
      window.dispatchEvent(new CustomEvent(ORG_ACCESS_LOST_EVENT));
    });
    // Nothing yet: the first read was seconds ago.
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16_000);
    });
    vi.useRealTimers();

    await waitFor(() => expect(result.current.organizations).toEqual([ACME]));
    expect(vi.mocked(apiClient.get)).toHaveBeenCalledTimes(2);
    expect(document.cookie).toContain(`${ORG_SELECTION_COOKIE}=org_1`);
  });

  it("keeps the list on screen when a refresh fails", async () => {
    listReturns([ACME, BETA]);
    const { result } = renderHook(() => useOrgSwitcher());
    await waitFor(() => expect(result.current.organizations).toHaveLength(2));
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("offline"));

    await act(async () => {
      await result.current.refresh(true);
    });

    expect(result.current.organizations).toEqual([ACME, BETA]);
  });
});
