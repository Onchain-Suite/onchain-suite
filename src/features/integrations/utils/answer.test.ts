import { describe, expect, it } from "vitest";

import { integrationsAnswer } from "./answer";

describe("integrationsAnswer", () => {
  it("says nothing about a workspace with nothing connected", () => {
    expect(
      integrationsAnswer({ contracts: 0, email: "none", push: "none" })
    ).toBeNull();
  });

  it("counts contracts in the singular and the plural", () => {
    const one = integrationsAnswer({
      contracts: 1,
      email: "none",
      push: "none",
    });
    const many = integrationsAnswer({
      contracts: 1200,
      email: "none",
      push: "none",
    });
    expect(one?.contracts).toBe("1 contract indexed");
    expect(many?.contracts).toBe("1,200 contracts indexed");
  });

  it("still answers when channels are set up but no contract is", () => {
    expect(
      integrationsAnswer({ contracts: 0, email: "connected", push: "none" })
    ).toEqual({
      contracts: "No contracts indexed yet",
      email: "is ready to send",
      push: "is not installed yet",
    });
  });

  it("tells a domain waiting on DNS apart from no domain at all", () => {
    const a = integrationsAnswer({
      contracts: 2,
      email: "pending",
      push: "connected",
    });
    expect(a?.email).toBe("has a sending domain waiting to verify");
    expect(a?.push).toBe("is installed");
  });

  it("does not call a half-set-up push installed", () => {
    const a = integrationsAnswer({
      contracts: 2,
      email: "connected",
      push: "pending",
    });
    expect(a?.push).toBe("is not installed yet");
  });
});
