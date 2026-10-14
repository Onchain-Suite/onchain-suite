import { describe, expect, it } from "vitest";

import {
  buildToc,
  chapterOf,
  labelOf,
  sectionAnchor,
  trackedIds,
  visibleIds,
} from "./playbook-toc";

const base = { kicker: "", dek: "" };
const toc = buildToc([
  {
    ...base,
    id: "summary",
    number: "00",
    title: "Summary",
    sections: [
      { id: "why", title: "Why" },
      { id: "how", title: "How" },
    ],
  },
  {
    ...base,
    id: "perp-dex",
    number: "01",
    title: "The perp DEX playbook",
    tocLabel: "Perp DEX",
    category: "perp-dex",
    sections: [{ id: "campaigns", title: "Campaigns" }],
  },
  {
    ...base,
    id: "defi",
    number: "03",
    title: "The DeFi playbook",
    category: "defi",
    sections: [{ id: "campaigns", title: "Campaigns" }],
  },
  { ...base, id: "next-step", number: "→", title: "Next step", sections: [] },
]);

describe("playbook contents", () => {
  it("builds section anchors from chapter and section ids", () => {
    expect(sectionAnchor("defi", "campaigns")).toBe("defi-campaigns");
    expect(toc[1].sections[0].id).toBe("perp-dex-campaigns");
    expect(toc[1].label).toBe("Perp DEX");
    expect(toc[2].label).toBe("The DeFi playbook");
  });

  it("tracks each chapter's opening, then its sections", () => {
    expect(trackedIds(toc)).toEqual([
      "summary",
      "summary-why",
      "summary-how",
      "perp-dex",
      "perp-dex-campaigns",
      "defi",
      "defi-campaigns",
      "next-step",
    ]);
  });

  it("only counts the chosen playbook as visible", () => {
    expect(visibleIds(toc, "defi")).toEqual([
      "summary",
      "summary-why",
      "summary-how",
      "defi",
      "defi-campaigns",
      "next-step",
    ]);
    expect(visibleIds(toc, null)).toEqual([
      "summary",
      "summary-why",
      "summary-how",
      "next-step",
    ]);
  });

  it("finds the chapter and label for an anchor", () => {
    expect(chapterOf(toc, "defi-campaigns")?.id).toBe("defi");
    expect(chapterOf(toc, "next-step")?.id).toBe("next-step");
    expect(chapterOf(toc, null)).toBeUndefined();
    expect(labelOf(toc, "summary-how")).toBe("How");
    expect(labelOf(toc, "next-step")).toBe("Next step");
    expect(labelOf(toc, "defi")).toBe("The DeFi playbook");
  });
});
