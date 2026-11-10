import { describe, expect, it } from "vitest";

import { GROUP_ICON } from "./palette-data";
import type { PaletteRow } from "./palette-model";
import { MAX_RECENT, parseRecent, withRecent } from "./recent";

const row = (
  n: number,
  group: PaletteRow["group"] = "Campaigns"
): PaletteRow => ({
  key: `campaign:${n}`,
  group,
  title: `Campaign ${n}`,
  icon: GROUP_ICON[group],
  href: `/campaigns/${n}`,
  record: true,
});

describe("recent", () => {
  it("puts the newest first, without duplicates, capped", () => {
    let raw: string | null = null;
    for (let i = 0; i < MAX_RECENT + 2; i += 1) raw = withRecent(raw, row(i));
    raw = withRecent(raw, row(3));
    const rows = parseRecent(raw);
    expect(rows).toHaveLength(MAX_RECENT);
    expect(rows[0]?.title).toBe("Campaign 3");
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it("gives a record its own icon back and groups it under Recent", () => {
    const [first] = parseRecent(withRecent(null, row(1, "Loops")));
    expect(first?.group).toBe("Recent");
    expect(first?.icon).toBe(GROUP_ICON.Loops);
  });

  it("keeps the original group when a recent is reopened", () => {
    const raw = withRecent(null, row(1, "Loops"));
    const [asRecent] = parseRecent(raw);
    const [again] = parseRecent(withRecent(raw, asRecent ?? row(9)));
    expect(again?.icon).toBe(GROUP_ICON.Loops);
  });

  it("ignores junk and links that leave the app", () => {
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent(JSON.stringify({ a: 1 }))).toEqual([]);
    expect(
      parseRecent(
        JSON.stringify([
          {
            key: "x",
            group: "Loops",
            title: "Evil",
            href: "https://evil.example",
          },
        ])
      )
    ).toEqual([]);
  });
});
