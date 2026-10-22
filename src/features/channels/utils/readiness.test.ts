import { describe, expect, it } from "vitest";

import {
  deriveChannelReadiness,
  mobilePushStatus,
  type ReadinessInputs,
  webPushStatus,
} from "./readiness";

const base: ReadinessInputs = {
  domainStatuses: [],
  webPush: { hasKey: false, sessionCount: null },
  mobilePush: { hasCredential: false, hasVerified: false },
};

const byId = (inputs: ReadinessInputs) =>
  Object.fromEntries(deriveChannelReadiness(inputs).map((r) => [r.id, r]));

describe("webPushStatus", () => {
  it("is none without a key, pending with a key but no session, connected once live", () => {
    expect(webPushStatus({ hasKey: false, sessionCount: 5 })).toBe("none");
    expect(webPushStatus({ hasKey: true, sessionCount: null })).toBe("pending");
    expect(webPushStatus({ hasKey: true, sessionCount: 0 })).toBe("pending");
    expect(webPushStatus({ hasKey: true, sessionCount: 3 })).toBe("connected");
  });
});

describe("mobilePushStatus", () => {
  it("needs a verified credential to read connected", () => {
    expect(mobilePushStatus({ hasCredential: false, hasVerified: false })).toBe(
      "none"
    );
    expect(mobilePushStatus({ hasCredential: true, hasVerified: false })).toBe(
      "pending"
    );
    expect(mobilePushStatus({ hasCredential: true, hasVerified: true })).toBe(
      "connected"
    );
  });
});

describe("deriveChannelReadiness - email", () => {
  it("connects on any verified domain, pends on any pending, else none", () => {
    expect(byId({ ...base, domainStatuses: ["verified"] }).email.status).toBe(
      "connected"
    );
    expect(
      byId({ ...base, domainStatuses: ["failed", "pending"] }).email.status
    ).toBe("pending");
    expect(byId({ ...base, domainStatuses: ["failed"] }).email.status).toBe(
      "none"
    );
    expect(byId(base).email.blocker).toMatch(/no verified sending domain/i);
  });
});

describe("deriveChannelReadiness - push combines web and mobile", () => {
  it("is connected when either web or mobile is connected", () => {
    const r = byId({
      ...base,
      webPush: { hasKey: false, sessionCount: null },
      mobilePush: { hasCredential: true, hasVerified: true },
    });
    expect(r.push.status).toBe("connected");
    expect(r.push.blocker).toBeNull();
  });

  it("is pending when web is provisioned but has no session", () => {
    const r = byId({
      ...base,
      webPush: { hasKey: true, sessionCount: 0 },
    });
    expect(r.push.status).toBe("pending");
    expect(r.push.blocker).toMatch(/active session/i);
  });

  it("is none when nothing is set up", () => {
    expect(byId(base).push.status).toBe("none");
  });
});

describe("deriveChannelReadiness - social connections", () => {
  it("reads X as connected once its token verifies", () => {
    expect(byId(base).x.status).toBe("none");
    expect(byId({ ...base, social: { x: "connected" } }).x.status).toBe(
      "connected"
    );
  });

  it("pends a saved credential the platform rejected, and says so", () => {
    const r = byId({ ...base, social: { whatsapp: "broken" } });
    expect(r.whatsapp.status).toBe("pending");
    expect(r.whatsapp.blocker).toMatch(/WhatsApp rejected the credential/);
  });
});

describe("deriveChannelReadiness - all channels", () => {
  it("emits every channel in catalog order", () => {
    expect(deriveChannelReadiness(base).map((r) => r.id)).toEqual([
      "email",
      "push",
      "x",
      "whatsapp",
      "telegram",
      "discord",
      "farcaster",
    ]);
  });

  it("defaults the social channels to not connected", () => {
    expect(byId(base).whatsapp.status).toBe("none");
    expect(byId(base).discord.blocker).toMatch(/not connected/i);
  });

  it("reflects a connected social channel when its state is threaded through", () => {
    const r = byId({
      ...base,
      social: { telegram: "connected" },
    });
    expect(r.telegram.status).toBe("connected");
    expect(r.telegram.blocker).toBeNull();
  });
});
