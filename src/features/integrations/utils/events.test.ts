import { describe, expect, it } from "vitest";

import { contractsTile, productEventsTile, shortAddress } from "./events";

describe("contractsTile", () => {
  it("does not say 'none' before it knows", () => {
    expect(contractsTile(null).headline).toBe("Checking…");
  });

  it("says indexing is optional when there is no contract", () => {
    expect(contractsTile(0)).toMatchObject({
      headline: "None indexed",
      detail: expect.stringContaining("Optional"),
    });
  });

  it("counts what is indexed", () => {
    expect(contractsTile(3).headline).toBe("3 indexed");
    expect(contractsTile(1200).headline).toBe("1,200 indexed");
  });
});

describe("productEventsTile", () => {
  it("tells loading, a failed read and an empty catalog apart", () => {
    expect(productEventsTile(undefined).headline).toBe("Checking…");
    expect(productEventsTile(null).headline).toBe("Could not check");
    expect(productEventsTile({ events: [], windowDays: 30 })).toMatchObject({
      headline: "None yet",
      detail: "Nothing has arrived in the last 30 days",
    });
  });

  it("counts event names and their volume over the window", () => {
    expect(
      productEventsTile({
        events: [
          { event: "signed_up", count: 1200 },
          { event: "deposit_completed", count: 34 },
        ],
        windowDays: 30,
      })
    ).toEqual({
      label: "Product events",
      headline: "2 events arriving",
      detail: "1,234 in the last 30 days",
    });
  });

  it("uses the singular for one event", () => {
    expect(
      productEventsTile({
        events: [{ event: "signed_up", count: 1 }],
        windowDays: 7,
      })
    ).toMatchObject({
      headline: "1 event arriving",
      detail: "1 in the last 7 days",
    });
  });
});

describe("shortAddress", () => {
  it("shortens a full address and leaves a short one whole", () => {
    expect(shortAddress("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984")).toBe(
      "0x1f9840a8…01f984"
    );
    expect(shortAddress("vault.eth")).toBe("vault.eth");
  });
});
