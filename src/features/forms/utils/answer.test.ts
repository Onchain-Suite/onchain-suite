import { describe, expect, it } from "vitest";

import type { CaptureForm } from "../forms.service";
import { formsAnswer } from "./answer";

const f = (name: string, status: string, submissionCount: number) =>
  ({ id: name, name, status, submissionCount }) as unknown as CaptureForm;

describe("formsAnswer", () => {
  it("counts live forms and their sign-ups, and names the busiest", () => {
    expect(
      formsAnswer([
        f("Dapp connect", "active", 652),
        f("Waitlist", "active", 202),
        f("Airdrop", "draft", 86),
      ])
    ).toEqual({ live: 2, signups: 854, top: "Dapp connect" });
  });

  it("names no top form when only one is live, or none has sign-ups", () => {
    expect(formsAnswer([f("A", "active", 5)]).top).toBeUndefined();
    expect(
      formsAnswer([f("A", "active", 0), f("B", "active", 0)]).top
    ).toBeUndefined();
    expect(formsAnswer([f("A", "draft", 9)])).toEqual({
      live: 0,
      signups: 0,
      top: undefined,
    });
  });
});
