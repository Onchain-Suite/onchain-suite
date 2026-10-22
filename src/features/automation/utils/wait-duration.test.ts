import { describe, expect, it } from "vitest";

import { readWait, writeWait } from "./wait-duration";

describe("wait duration", () => {
  it("reads a stored wait in its largest even unit", () => {
    expect(readWait({ seconds: 172800 })).toEqual({
      amount: "2",
      unit: "days",
    });
    expect(readWait({ duration: "90 minutes" })).toEqual({
      amount: "90",
      unit: "minutes",
    });
    expect(readWait({ duration: "1 week" })).toEqual({
      amount: "1",
      unit: "weeks",
    });
    expect(readWait({})).toEqual({ amount: "", unit: "days" });
  });

  it("writes prose and seconds the runtime reads", () => {
    expect(writeWait("2", "days")).toEqual({
      duration: "2 days",
      seconds: 172800,
    });
    expect(writeWait("1", "hours")).toEqual({
      duration: "1 hour",
      seconds: 3600,
    });
    expect(writeWait("", "days")).toEqual({ duration: "", seconds: 0 });
  });
});
