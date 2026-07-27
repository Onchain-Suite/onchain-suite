import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isPendingCheckoutStale,
  openCheckoutInNewTab,
  PENDING_CHECKOUT_TTL_MS,
  readPendingCheckout,
  writePendingCheckout,
} from "./checkout";

const PAYMENT_URL = "https://pay.example.com/checkout/abc123";

/** Minimal stand-in for the WindowProxy returned by window.open. */
const makeWindowStub = () => ({
  opener: {} as unknown,
  location: { replace: vi.fn() },
  close: vi.fn(),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("openCheckoutInNewTab", () => {
  it("reports success when the tab opens, so callers do not also navigate the current tab", () => {
    const stub = makeWindowStub();
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(stub as unknown as Window);

    expect(openCheckoutInNewTab(PAYMENT_URL)).toBe(true);
    expect(stub.location.replace).toHaveBeenCalledWith(PAYMENT_URL);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("never passes noopener to window.open (it forces a null return, which read as 'blocked' and opened a second tab)", () => {
    const stub = makeWindowStub();
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(stub as unknown as Window);

    openCheckoutInNewTab(PAYMENT_URL);

    const features = openSpy.mock.calls[0]?.[2];
    expect(String(features ?? "")).not.toContain("noopener");
  });

  it("severs the opener reference before navigating (reverse-tabnabbing guard)", () => {
    const stub = makeWindowStub();
    vi.spyOn(window, "open").mockReturnValue(stub as unknown as Window);

    openCheckoutInNewTab(PAYMENT_URL);

    expect(stub.opener).toBeNull();
  });

  it("returns false when a popup blocker returns null", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(openCheckoutInNewTab(PAYMENT_URL)).toBe(false);
  });

  it("closes the blank tab and returns false when navigation throws", () => {
    const stub = makeWindowStub();
    stub.location.replace.mockImplementation(() => {
      throw new Error("navigation blocked");
    });
    vi.spyOn(window, "open").mockReturnValue(stub as unknown as Window);

    expect(openCheckoutInNewTab(PAYMENT_URL)).toBe(false);
    expect(stub.close).toHaveBeenCalledTimes(1);
  });
});

describe("pending checkout lifetime", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("is not stale while the payment is still plausibly confirming", () => {
    const startedAt = Date.now();
    expect(isPendingCheckoutStale({ startedAt }, startedAt + 60_000)).toBe(
      false
    );
  });

  it("goes stale once past the TTL, so the banner stops polling forever", () => {
    const startedAt = Date.now();
    expect(
      isPendingCheckoutStale({ startedAt }, startedAt + PENDING_CHECKOUT_TTL_MS)
    ).toBe(true);
  });

  it("round-trips a fresh pending checkout", () => {
    writePendingCheckout({
      reference: "ref-1",
      plan: "launch",
      startedAt: Date.now(),
    });

    expect(readPendingCheckout()).toMatchObject({
      reference: "ref-1",
      plan: "launch",
    });
  });

  it("purges a day-old pending checkout instead of resurrecting the banner", () => {
    writePendingCheckout({
      reference: "ref-ancient",
      plan: "launch",
      startedAt: Date.now() - 25 * 60 * 60 * 1000,
    });

    expect(readPendingCheckout()).toBeNull();
    // and it is gone from storage, not just filtered on read
    expect(readPendingCheckout()).toBeNull();
  });
});
