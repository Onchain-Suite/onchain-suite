import { describe, expect, it } from "vitest";

import { cohortGrid } from "./cohorts";

describe("cohortGrid", () => {
  it("shows each cohort's retention and leaves future weeks empty", () => {
    const rows = cohortGrid(
      {
        cohorts: [
          { cohortWeek: "2026-09-28", size: 200, retained: [200, 120, 90] },
          { cohortWeek: "2026-10-05", size: 0, retained: [] },
        ],
      },
      4
    );
    expect(rows).toEqual([
      { label: "Sep 28", size: 200, cells: [100, 60, 45, null] },
    ]);
  });
});
