import { describe, expect, it } from "vitest";

import { classifySector, isWeb2Sector } from "./sector";
import {
  organizationOptions,
  web2Options,
} from "@/features/onboarding-flow/constants";

describe("classifySector", () => {
  it("classifies every web2 option (by label and by id) as web2", () => {
    for (const option of web2Options) {
      expect(classifySector(option.label)).toBe("web2");
      expect(classifySector(option.id)).toBe("web2");
    }
  });

  it("classifies every web3 option (by label and by id) as web3", () => {
    for (const option of organizationOptions) {
      expect(classifySector(option.label)).toBe("web3");
      expect(classifySector(option.id)).toBe("web3");
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(classifySector("  saas or software  ")).toBe("web2");
    expect(classifySector("SAAS OR SOFTWARE")).toBe("web2");
  });

  it("treats empty, null, and free-text 'Other' as unknown", () => {
    expect(classifySector("")).toBe("unknown");
    expect(classifySector("   ")).toBe("unknown");
    expect(classifySector(null)).toBe("unknown");
    expect(classifySector(undefined)).toBe("unknown");
    expect(classifySector("Artisanal Pottery Collective")).toBe("unknown");
  });
});

describe("isWeb2Sector", () => {
  it("is true only for a recognised web2 sector", () => {
    expect(isWeb2Sector(web2Options[0].label)).toBe(true);
    expect(isWeb2Sector(organizationOptions[0].label)).toBe(false);
    expect(isWeb2Sector("")).toBe(false);
    expect(isWeb2Sector(null)).toBe(false);
  });
});
