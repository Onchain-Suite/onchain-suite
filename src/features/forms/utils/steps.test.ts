import { describe, expect, it } from "vitest";

import type { CaptureFieldSpec } from "../forms.service";
import { fieldsForStep, fieldStep, removeStep, stepCount } from "./steps";

const f = (key: string, step?: number): CaptureFieldSpec => ({ key, step });

describe("fieldStep", () => {
  it("defaults missing/invalid to step 1", () => {
    expect(fieldStep({ key: "a" })).toBe(1);
    expect(fieldStep({ key: "a", step: 0 })).toBe(1);
    expect(fieldStep({ key: "a", step: 3 })).toBe(3);
  });
});

describe("stepCount", () => {
  it("covers the highest field step and the persisted count", () => {
    expect(stepCount([f("a"), f("b", 2)])).toBe(2);
    expect(stepCount([f("a")], 3)).toBe(3); // an empty trailing step persisted
    expect(stepCount([])).toBe(1);
  });
});

describe("fieldsForStep", () => {
  it("returns a step's fields in order, step 1 including the unmarked", () => {
    const fields = [f("a"), f("b", 2), f("c", 1), f("d", 2)];
    expect(fieldsForStep(fields, 1).map((x) => x.key)).toEqual(["a", "c"]);
    expect(fieldsForStep(fields, 2).map((x) => x.key)).toEqual(["b", "d"]);
  });
});

describe("removeStep", () => {
  it("drops the step's fields and shifts later ones down to stay contiguous", () => {
    const fields = [f("a", 1), f("b", 2), f("c", 3)];
    const out = removeStep(fields, 2);
    expect(out.map((x) => [x.key, fieldStep(x)])).toEqual([
      ["a", 1],
      ["c", 2],
    ]);
  });
});
