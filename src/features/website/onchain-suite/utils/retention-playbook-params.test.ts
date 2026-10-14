import { describe, expect, it } from "vitest";

import {
  categoryOfAnchor,
  isCategoryId,
  parseCategory,
  sanitizeClientName,
} from "./retention-playbook-params";

describe("sanitizeClientName", () => {
  it("keeps a normal company name", () => {
    expect(sanitizeClientName("Acme")).toBe("Acme");
    expect(sanitizeClientName("Acme Labs (UK) & Co.")).toBe(
      "Acme Labs (UK) & Co."
    );
  });

  it("strips markup and script characters", () => {
    expect(sanitizeClientName('<script>alert("x")</script>')).toBe(
      "scriptalert(x)script"
    );
    expect(sanitizeClientName("<b>Acme</b>")).toBe("bAcmeb");
  });

  it("keeps non-Latin letters", () => {
    expect(sanitizeClientName("Société Générale")).toBe("Société Générale");
    expect(sanitizeClientName("東京")).toBe("東京");
  });

  it("collapses whitespace and caps the length", () => {
    expect(sanitizeClientName("  Acme \n\t Labs  ")).toBe("Acme Labs");
    expect(sanitizeClientName("a".repeat(200))).toHaveLength(60);
  });

  it("returns null for empty or unusable values", () => {
    expect(sanitizeClientName(undefined)).toBeNull();
    expect(sanitizeClientName("")).toBeNull();
    expect(sanitizeClientName("<>{}")).toBeNull();
  });

  it("uses the first value when the param repeats", () => {
    expect(sanitizeClientName(["Acme", "Other"])).toBe("Acme");
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
