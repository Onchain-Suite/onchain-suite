import { describe, expect, it } from "vitest";

import { EMPTY_PROFILE, flowFor, profileReady } from "../constants/guided";
import { goalById, GOALS, goalsFor } from "./goals";

describe("goalsFor", () => {
  it("suggests on-chain goals to a team that starts from a contract", () => {
    const { suggested, more } = goalsFor("chain");
    expect(suggested.map((g) => g.id)).toEqual([
      "deposit",
      "mint",
      "swap",
      "stake",
    ]);
    expect(suggested.every((g) => g.onChain)).toBe(true);
    expect(suggested.length + more.length).toBe(GOALS.length);
  });

  it("suggests sign-ups first for a website", () => {
    expect(goalsFor("site").suggested[0]?.id).toBe("signup");
  });

  it("offers everything, unsorted, before the question is answered", () => {
    expect(goalsFor("")).toEqual({ suggested: [], more: GOALS });
  });

  it("finds a goal and how a count of it reads", () => {
    expect(goalById("purchase")?.did).toBe("made a purchase");
    expect(goalById("nope")).toBeUndefined();
  });
});

describe("flowFor", () => {
  it("asks for the goal straight after the project", () => {
    expect(flowFor("operator", "site")[1]).toBe("goal");
  });

  it("only shows the contract step to a builder starting from a contract", () => {
    expect(flowFor("builder", "chain")).toContain("contract");
    expect(flowFor("builder", "people")).not.toContain("contract");
    expect(flowFor("operator", "chain")).not.toContain("contract");
  });
});

describe("profileReady", () => {
  const filled = {
    ...EMPTY_PROFILE,
    firstName: "Ada",
    name: "Acme",
    website: "acme.xyz",
    sector: "DeFi",
  };
  it("needs the answer to what they have today", () => {
    expect(profileReady(filled)).toBe(false);
    expect(profileReady({ ...filled, start: "site" })).toBe(true);
  });
});
