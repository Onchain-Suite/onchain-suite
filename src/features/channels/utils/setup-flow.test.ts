import { describe, expect, it } from "vitest";

import {
  emailFlow,
  mobilePushFlow,
  nextStep,
  socialFlow,
  webPushFlow,
} from "./setup-flow";

const done = (flow: { done: boolean }[]) => flow.map((s) => s.done);

describe("emailFlow", () => {
  it("starts with nothing done", () => {
    const flow = emailFlow([]);
    expect(flow.map((s) => s.label)).toEqual([
      "Add a domain",
      "Add the DNS records",
      "Verified",
    ]);
    expect(done(flow)).toEqual([false, false, false]);
    expect(nextStep(flow)).toBe(0);
  });

  it("waits on the records once a domain is added", () => {
    expect(done(emailFlow(["pending"]))).toEqual([true, false, false]);
    expect(nextStep(emailFlow(["pending"]))).toBe(1);
  });

  // A failed domain has been added; its records are what is wrong.
  it("still points at the records when the only domain failed", () => {
    expect(done(emailFlow(["failed"]))).toEqual([true, false, false]);
  });

  it("is finished once any domain is verified", () => {
    const flow = emailFlow(["pending", "verified"]);
    expect(done(flow)).toEqual([true, true, true]);
    expect(nextStep(flow)).toBeNull();
  });
});

describe("webPushFlow", () => {
  it("is installed once a key exists, live once the SDK reports a session", () => {
    expect(done(webPushFlow({ hasKey: false, sessionCount: null }))).toEqual([
      false,
      false,
      false,
    ]);
    expect(done(webPushFlow({ hasKey: true, sessionCount: 0 }))).toEqual([
      true,
      false,
      false,
    ]);
    expect(done(webPushFlow({ hasKey: true, sessionCount: 4 }))).toEqual([
      true,
      true,
      true,
    ]);
  });

  // Sessions without a key cannot be this workspace's SDK reporting in.
  it("does not count a session where there is no key", () => {
    expect(done(webPushFlow({ hasKey: false, sessionCount: 9 }))).toEqual([
      false,
      false,
      false,
    ]);
  });
});

describe("mobilePushFlow", () => {
  it("needs a credential, then one that Apple or Google accepts", () => {
    expect(
      done(mobilePushFlow({ hasCredential: false, hasVerified: false }))
    ).toEqual([false, false, false]);
    expect(
      done(mobilePushFlow({ hasCredential: true, hasVerified: false }))
    ).toEqual([true, false, false]);
    expect(
      done(mobilePushFlow({ hasCredential: true, hasVerified: true }))
    ).toEqual([true, true, true]);
  });
});

describe("socialFlow", () => {
  it("uses the channel's own words for its steps", () => {
    expect(socialFlow("telegram").map((s) => s.label)).toEqual([
      "Create a bot",
      "Paste its token",
      "Connected",
    ]);
    expect(socialFlow("farcaster")[0]?.label).toBe("Approve a signer");
  });

  it("has nothing done before anything is saved", () => {
    expect(done(socialFlow("x"))).toEqual([false, false, false]);
    expect(done(socialFlow("x", "none"))).toEqual([false, false, false]);
  });

  // Pasted, but the platform said no: one short of the end, not finished.
  it("stops one short when the platform rejected the credential", () => {
    const flow = socialFlow("discord", "broken");
    expect(done(flow)).toEqual([true, true, false]);
    expect(nextStep(flow)).toBe(2);
  });

  it("is finished when the platform accepted it", () => {
    expect(done(socialFlow("whatsapp", "connected"))).toEqual([
      true,
      true,
      true,
    ]);
  });
});
