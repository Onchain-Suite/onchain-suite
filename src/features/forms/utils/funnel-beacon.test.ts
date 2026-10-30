import { beforeEach, describe, expect, it } from "vitest";

import { funnelSource, visitSessionId } from "./funnel-beacon";

describe("visitSessionId", () => {
  beforeEach(() => {
    try {
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  it("is stable within a visit (reload is not a new session)", () => {
    const a = visitSessionId();
    const b = visitSessionId();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(64);
  });
});

describe("funnelSource", () => {
  it("falls back to 'direct' with no utm_source or external referrer", () => {
    // jsdom's default location has no query and an empty referrer.
    expect(funnelSource()).toBe("direct");
  });

  it("never throws", () => {
    expect(() => funnelSource()).not.toThrow();
  });
});
