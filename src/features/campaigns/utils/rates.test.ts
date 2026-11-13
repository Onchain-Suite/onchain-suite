import { describe, expect, it } from "vitest";

import { settlingTitle } from "./rates";

describe("settlingTitle", () => {
  it("explains why there is no rate yet", () => {
    expect(settlingTitle(undefined)).toMatch(/about an hour after sending/);
    expect(settlingTitle(undefined)).not.toMatch(/Ready at/);
  });

  it("adds the ready time when the backend sends one", () => {
    expect(settlingTitle("2026-11-13T15:38:00.000Z")).toMatch(/Ready at \d/);
  });

  it("ignores a time it cannot read", () => {
    expect(settlingTitle("not a date")).not.toMatch(/Ready at/);
  });
});
