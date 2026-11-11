import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { onboardingService } from "../onboarding.service";
import { useStartIndexing } from "./use-start-indexing";

vi.mock("../onboarding.service", () => ({
  onboardingService: { completeTask: vi.fn() },
}));

const completeTask = vi.mocked(onboardingService.completeTask);
const contract = { address: "0xabc", chain: "base-mainnet", name: "Vault" };

describe("useStartIndexing", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    completeTask.mockReset();
    completeTask.mockResolvedValue(undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("starts indexing through the connect-chain task", async () => {
    const { result } = renderHook(() => useStartIndexing());

    await result.current([contract], "org_1");

    expect(completeTask).toHaveBeenCalledWith(
      "connect-chain",
      { contracts: [contract], lookbackDays: 90 },
      "org_1"
    );
  });

  it("starts once however many steps ask, including while it is in flight", async () => {
    const { result } = renderHook(() => useStartIndexing());

    await Promise.all([result.current([contract]), result.current([contract])]);
    await result.current([contract]);

    expect(completeTask).toHaveBeenCalledTimes(1);
  });

  // A reload remounts the wizard; finishing must not start a second job.
  it("does not start again after a reload", async () => {
    const first = renderHook(() => useStartIndexing());
    await first.result.current([contract]);
    first.unmount();

    const second = renderHook(() => useStartIndexing());
    await second.result.current([contract]);

    expect(completeTask).toHaveBeenCalledTimes(1);
  });

  it("starts again for the same contract in another workspace", async () => {
    const { result } = renderHook(() => useStartIndexing());

    await result.current([contract], "org_1");
    await result.current([contract], "org_2");
    await result.current([contract], "org_2");

    expect(completeTask).toHaveBeenCalledTimes(2);
  });

  it("starts again for a different contract", async () => {
    const { result } = renderHook(() => useStartIndexing());

    await result.current([contract]);
    await result.current([{ address: "0xdef", chain: "base-mainnet" }]);

    expect(completeTask).toHaveBeenCalledTimes(2);
  });

  it("tries again later when the request failed, and never throws", async () => {
    completeTask.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useStartIndexing());

    await expect(result.current([contract])).resolves.toBeUndefined();
    await result.current([contract]);

    expect(completeTask).toHaveBeenCalledTimes(2);
  });

  it("does nothing without a contract", async () => {
    const { result } = renderHook(() => useStartIndexing());
    await result.current([]);
    expect(completeTask).not.toHaveBeenCalled();
  });
});
