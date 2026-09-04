import { describe, expect, it } from "vitest";

import { toQueryHistoryItems } from "./query-history";

describe("toQueryHistoryItems", () => {
  it("reads id/text from alternate keys and flags agent runs", () => {
    const [row] = toQueryHistoryItems([
      {
        queryId: "q1",
        query: "top holders",
        provider: "agent",
        status: "completed",
      },
    ]);
    expect(row).toMatchObject({ qid: "q1", q: "top holders", isAgent: true });
  });

  it("treats alchemy/goldrush/mcp providers as agent runs, sql otherwise", () => {
    const rows = toQueryHistoryItems([
      { id: "a", name: "x", provider: "alchemy" },
      { id: "b", name: "y", provider: "goldrush" },
      { id: "c", name: "z", provider: "sql" },
    ]);
    expect(rows.map((r) => r.isAgent)).toEqual([true, true, false]);
  });

  it("drops rows with no id or no text, and caps at 12", () => {
    expect(toQueryHistoryItems([{ query: "no id" }, { id: "x" }])).toHaveLength(
      0
    );
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: `q${i}`,
      query: `run ${i}`,
    }));
    expect(toQueryHistoryItems(many)).toHaveLength(12);
  });

  it("survives non-object rows", () => {
    expect(toQueryHistoryItems([null, 3, "x", undefined])).toEqual([]);
  });
});
