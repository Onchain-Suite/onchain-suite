import { describe, expect, it } from "vitest";

import {
  categoryOfAnchor,
  categoryOfSlug,
  isCategoryId,
  parseCategory,
  playbookPath,
} from "./retention-playbook-params";
import { CATEGORIES } from "@/onchain-suite-website/data/retention-playbook";

describe("playbookPath and categoryOfSlug", () => {
  it("gives each sector its own page", () => {
    expect(playbookPath("perp-dex")).toBe("/retention-playbook/perp-dexes");
    expect(playbookPath("prediction-market")).toBe(
      "/retention-playbook/prediction-markets"
    );
    expect(playbookPath("defi")).toBe("/retention-playbook/defi");
  });

  it("reads a page slug back into its sector", () => {
    expect(categoryOfSlug("perp-dexes")).toBe("perp-dex");
    expect(categoryOfSlug("prediction-markets")).toBe("prediction-market");
    expect(categoryOfSlug("defi")).toBe("defi");
  });

  it("rejects slugs that are not a sector page", () => {
    // The category ids themselves are not page slugs.
    expect(categoryOfSlug("perp-dex")).toBeNull();
    expect(categoryOfSlug("working-with-us")).toBeNull();
    expect(categoryOfSlug("")).toBeNull();
  });
});

describe("categoryOfAnchor", () => {
  it("maps a playbook or any of its sections to the category", () => {
    expect(categoryOfAnchor("defi")).toBe("defi");
    expect(categoryOfAnchor("defi-retention-triggers")).toBe("defi");
    expect(categoryOfAnchor("prediction-market-lifecycle")).toBe(
      "prediction-market"
    );
    expect(categoryOfAnchor("perp-dex")).toBe("perp-dex");
  });

  it("ignores anchors outside the playbooks", () => {
    expect(categoryOfAnchor("summary-why")).toBeNull();
    expect(categoryOfAnchor("definitely")).toBeNull();
    expect(categoryOfAnchor("")).toBeNull();
  });
});

describe("parseCategory", () => {
  it("accepts the three categories in any case", () => {
    expect(parseCategory("perp-dex")).toBe("perp-dex");
    expect(parseCategory("Prediction-Market")).toBe("prediction-market");
    expect(parseCategory(" defi ")).toBe("defi");
  });

  it("rejects anything else", () => {
    expect(parseCategory("cex")).toBeNull();
    expect(parseCategory(undefined)).toBeNull();
    expect(parseCategory(["nope", "defi"])).toBeNull();
  });

  it("narrows strings with isCategoryId", () => {
    expect(isCategoryId("defi")).toBe(true);
    expect(isCategoryId("DeFi")).toBe(false);
  });
});

describe("strategy names", () => {
  it("gives each strategy a short sector name for the tiles", () => {
    expect(CATEGORIES.map((c) => c.sector)).toEqual([
      "Perp DEXs",
      "Prediction markets",
      "DeFi",
    ]);
    // The tiles show the sector; the full name stays for screen readers.
    expect(
      CATEGORIES.every((c) => c.label.endsWith("growth and retention strategy"))
    ).toBe(true);
  });
});
