import { describe, expect, it } from "vitest";

import { channelKeysFor, normalizeChannelKey } from "./channels";

describe("channel display helpers", () => {
  it("normalizes push aliases + known channels", () => {
    expect(normalizeChannelKey("in-app-push")).toBe("inapp");
    expect(normalizeChannelKey("push")).toBe("inapp");
    expect(normalizeChannelKey("INAPP")).toBe("inapp");
    expect(normalizeChannelKey("telegram")).toBe("telegram");
    expect(normalizeChannelKey("X")).toBe("x");
    expect(normalizeChannelKey("nope")).toBeNull();
  });

  it("defaults to email and de-dupes + orders", () => {
    expect(channelKeysFor(null)).toEqual(["email"]);
    expect(channelKeysFor([])).toEqual(["email"]);
    expect(channelKeysFor(["x", "email", "inapp", "x"])).toEqual([
      "email",
      "inapp",
      "x",
    ]);
    expect(channelKeysFor(["bogus"])).toEqual(["email"]);
  });
});
