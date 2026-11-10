import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ORG_SELECTION_COOKIE } from "@/lib/utils";

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
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const clearOrgCookie = () => {
  document.cookie = `${ORG_SELECTION_COOKIE}=; path=/; max-age=0`;
};

describe("useOrgSwitcher", () => {
  beforeEach(() => {
    clearOrgCookie();
    window.sessionStorage.clear();
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
});
