import { describe, expect, it } from "vitest";

import { computeInAppReadiness, placementDeliverable } from "./inapp-readiness";
import type { PushCredential } from "@/features/settings/push-credentials.service";
import type { InAppStatus } from "@/features/settings/utils/inapp-status";

const status = (over: Partial<InAppStatus> = {}): InAppStatus => ({
  publishableKeys: {},
  sessionCount: null,
  usage: null,
  ...over,
});

const cred = (provider: "apns" | "fcm", verified: boolean): PushCredential => ({
  provider,
  config: {} as PushCredential["config"],
  fingerprint: "fp",
  verified,
  verifiedAt: verified ? "2026-01-01" : null,
  lastError: null,
  updatedAt: "2026-01-01",
});

describe("computeInAppReadiness", () => {
  it("web is ready only with BOTH a publishable key and an origin", () => {
    const base = {
      credentials: [],
      statusKnown: true,
      credentialsKnown: true,
    };
    expect(
      computeInAppReadiness({
        ...base,
        status: status({ publishableKeys: { production: "pk_live_x" } }),
        originCount: 1,
      }).web.state
    ).toBe("ready");
    expect(
      computeInAppReadiness({
        ...base,
        status: status({ publishableKeys: { production: "pk_live_x" } }),
        originCount: 0,
      }).web.state
    ).toBe("not-ready");
    expect(
      computeInAppReadiness({ ...base, status: status(), originCount: 3 }).web
        .state
    ).toBe("not-ready");
  });

  it("mobile is ready when either APNs or FCM is verified", () => {
    const base = {
      status: status(),
      originCount: 0,
      statusKnown: true,
      credentialsKnown: true,
    };
    expect(
      computeInAppReadiness({ ...base, credentials: [cred("apns", true)] })
        .mobile.state
    ).toBe("ready");
    expect(
      computeInAppReadiness({ ...base, credentials: [cred("fcm", true)] })
        .mobile.state
    ).toBe("ready");
    // Saved but not verified (200 with verified:false) is NOT ready.
    expect(
      computeInAppReadiness({ ...base, credentials: [cred("apns", false)] })
        .mobile.state
    ).toBe("not-ready");
  });

  it("reports unknown (not not-ready) when a read failed", () => {
    const r = computeInAppReadiness({
      status: null,
      originCount: null,
      credentials: null,
      statusKnown: false,
      credentialsKnown: false,
    });
    expect(r.web.state).toBe("unknown");
    expect(r.mobile.state).toBe("unknown");
  });
});

describe("placementDeliverable", () => {
  const readiness = (
    web: "ready" | "not-ready" | "unknown",
    mobile: typeof web
  ) =>
    computeInAppReadiness({
      status:
        web === "ready"
          ? status({ publishableKeys: { production: "pk" } })
          : status(),
      originCount: web === "ready" ? 1 : 0,
      credentials: mobile === "ready" ? [cred("apns", true)] : [],
      statusKnown: web !== "unknown",
      credentialsKnown: mobile !== "unknown",
    });

  it("blocks only a positively-not-ready channel", () => {
    expect(placementDeliverable(readiness("not-ready", "ready"), false)).toBe(
      false
    );
    expect(placementDeliverable(readiness("not-ready", "ready"), true)).toBe(
      true
    );
    expect(placementDeliverable(readiness("ready", "not-ready"), true)).toBe(
      false
    );
  });

  it("never blocks on unknown", () => {
    expect(placementDeliverable(readiness("unknown", "unknown"), false)).toBe(
      true
    );
    expect(placementDeliverable(readiness("unknown", "unknown"), true)).toBe(
      true
    );
  });
});
