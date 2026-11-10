import { describe, expect, it } from "vitest";

import { CREATE_ITEMS, DESTINATIONS, GROUP_ICON } from "./palette-data";
import {
  buildRows,
  contactRow,
  namedItems,
  type PaletteRow,
  PER_GROUP,
  score,
} from "./palette-model";

const record = (
  group: PaletteRow["group"],
  title: string,
  extra: Partial<PaletteRow> = {}
): PaletteRow => ({
  key: `${group}:${title}`,
  group,
  title,
  icon: GROUP_ICON[group],
  href: `/x/${title}`,
  record: true,
  ...extra,
});

const sources = (records: PaletteRow[] = [], recent: PaletteRow[] = []) => ({
  recent,
  records,
  creates: CREATE_ITEMS,
  destinations: DESTINATIONS,
});

describe("score", () => {
  it("ranks exact over prefix over word start over substring", () => {
    expect(score("loops", "loops")).toBe(3);
    expect(score("loops", "lo")).toBe(2);
    expect(score("welcome new wallets", "new")).toBe(1.5);
    expect(score("maya.eth", "eth")).toBe(1.5);
    expect(score("renewal", "new")).toBe(1);
    expect(score("renewal", "zz")).toBe(0);
  });
});

describe("buildRows", () => {
  it("shows recents, then everything you can make and every page, when empty", () => {
    const recent = [record("Recent", "maya.eth")];
    const rows = buildRows("  ", sources([], recent));
    expect(rows[0]?.title).toBe("maya.eth");
    expect(rows.filter((r) => r.group === "Create")).toHaveLength(
      CREATE_ITEMS.length
    );
    expect(rows.filter((r) => r.group === "Go to")).toHaveLength(
      DESTINATIONS.length
    );
    expect(rows.some((r) => r.group === "Ask")).toBe(false);
  });

  it("always ends a typed query with the offer to ask Intelligence", () => {
    const rows = buildRows("who churned last week", sources());
    const last = rows[rows.length - 1];
    expect(last?.group).toBe("Ask");
    expect(last?.href).toBe("/intelligence?q=who%20churned%20last%20week");
  });

  it("orders groups the same way whatever matched first", () => {
    const rows = buildRows(
      "camp",
      sources([
        record("Forms", "Camp sign-up"),
        record("Campaigns", "Campfire drop"),
      ])
    );
    const groups = [...new Set(rows.map((r) => r.group))];
    expect(groups).toEqual(["Campaigns", "Forms", "Create", "Go to", "Ask"]);
  });

  it("keeps server matches whose titles do not contain the query", () => {
    const viaEmail = record("Contacts", "maya.eth", { serverMatched: true });
    const rows = buildRows("maya@example.com", sources([viaEmail]));
    expect(rows.some((r) => r.key === viaEmail.key)).toBe(true);
  });

  it("drops client-side records that do not match", () => {
    const rows = buildRows("zzz", sources([record("Campaigns", "Launch")]));
    expect(rows.map((r) => r.group)).toEqual(["Ask"]);
  });

  it("caps each group and shows a record once", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      record("Campaigns", `Drop ${i}`)
    );
    const rows = buildRows("drop", sources([...many, ...many.slice(0, 1)]));
    expect(rows.filter((r) => r.group === "Campaigns")).toHaveLength(PER_GROUP);
  });

  it("finds pages by their other names", () => {
    const rows = buildRows("automations", sources());
    expect(rows.find((r) => r.group === "Go to")?.title).toBe("Loops");
  });
});

describe("contactRow", () => {
  it("names a wallet-only contact by its short address", () => {
    const row = contactRow({
      id: "c1",
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });
    expect(row?.title).toBe("0x1234…5678");
    expect(row?.href).toBe("/audience/c1");
  });

  it("prefers a name, and shows the email beneath it", () => {
    const row = contactRow({ id: "c2", name: "Ada", email: "ada@x.io" });
    expect(row?.title).toBe("Ada");
    expect(row?.sub).toBe("ada@x.io");
  });

  it("skips anything without an id", () => {
    expect(contactRow({ name: "No id" })).toBeNull();
    expect(contactRow("nope")).toBeNull();
  });
});

describe("namedItems", () => {
  it("reads arrays, { items } and { data }", () => {
    const item = { id: "1", name: "Welcome", status: "active" };
    expect(namedItems([item])).toEqual([item]);
    expect(namedItems({ items: [item] })).toEqual([item]);
    expect(namedItems({ data: [item, { id: "2" }] })).toEqual([item]);
    expect(namedItems(null)).toEqual([]);
  });
});
