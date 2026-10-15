import { describe, expect, it } from "vitest";

import {
  buildToc,
  chapterOf,
  labelOf,
  sectionAnchor,
  trackedIds,
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
    href: "/retention-playbook/perp-dex",
    sections: [{ id: "campaigns", title: "Campaigns" }],
  },
  {
    ...base,
    id: "defi",
    number: "03",
    title: "The DeFi playbook",
    href: "/retention-playbook/defi",
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

  it("keeps the href of a chapter that lives on another page", () => {
    expect(toc[1].href).toBe("/retention-playbook/perp-dex");
    expect(toc[0].href).toBeUndefined();
  });

  it("tracks each on-page chapter's opening, then its sections", () => {
    expect(trackedIds(toc)).toEqual([
      "summary",
      "summary-why",
      "summary-how",
      "next-step",
    ]);
  });

  it("tracks every chapter once they are all on the page", () => {
    const onePage = buildToc([
      {
        ...base,
        id: "defi",
        number: "03",
        title: "The DeFi playbook",
        sections: [{ id: "campaigns", title: "Campaigns" }],
      },
      {
        ...base,
        id: "working-with-us",
        number: "04",
        title: "Working with us",
        sections: [{ id: "privacy", title: "Privacy" }],
      },
    ]);
    expect(trackedIds(onePage)).toEqual([
      "defi",
      "defi-campaigns",
      "working-with-us",
      "working-with-us-privacy",
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
