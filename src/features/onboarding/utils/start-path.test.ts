import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isStartPath,
  readStartPath,
  saveStartPath,
  stampPendingStartPath,
  subscribeStartPath,
} from "./start-path";

beforeEach(() => window.localStorage.clear());

describe("start path", () => {
  it("is kept per workspace", () => {
    saveStartPath("org_a", "chain");
    expect(readStartPath("org_a")).toBe("chain");
    expect(readStartPath("org_b")).toBeNull();
    expect(readStartPath(null)).toBeNull();
  });

  it("can be cleared, to ask again", () => {
    saveStartPath("org_a", "site");
    saveStartPath("org_a", null);
    expect(readStartPath("org_a")).toBeNull();
  });

  it("adopts the wizard's answer for the first workspace that opens Home", () => {
    stampPendingStartPath("people");
    expect(readStartPath("org_a")).toBe("people");
    // Adopted once: a second workspace is asked for its own answer.
    expect(readStartPath("org_b")).toBeNull();
    expect(readStartPath("org_a")).toBe("people");
  });

  it("tells subscribers when the answer changes", () => {
    const onChange = vi.fn();
    const stop = subscribeStartPath(onChange);
    saveStartPath("org_a", "chain");
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
    saveStartPath("org_a", "site");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("rejects anything that is not an answer", () => {
    expect(isStartPath("signups")).toBe(false);
    expect(isStartPath("site")).toBe(true);
  });
});
