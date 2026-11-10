import { describe, expect, it } from "vitest";

import { toExecutableSql } from "./executable-sql";

describe("toExecutableSql", () => {
  it("strips leading comments so the query starts with SELECT", () => {
    expect(toExecutableSql("-- top wallets\n/* note */\n  select 1")).toBe(
      "select 1"
    );
  });

  it("drops statement-ending semicolons", () => {
    expect(toExecutableSql("select 1;\n")).toBe("select 1");
    expect(toExecutableSql("select 1 ;  ")).toBe("select 1");
  });

  it("returns empty for comment-only input", () => {
    expect(toExecutableSql("-- nothing here")).toBe("");
    expect(toExecutableSql("/* unclosed")).toBe("");
  });
});
