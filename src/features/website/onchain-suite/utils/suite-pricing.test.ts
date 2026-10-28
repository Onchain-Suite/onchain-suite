import { describe, expect, it } from "vitest";

import {
  allowances,
  levelFor,
  onrampFor,
  suitePrice,
} from "@/onchain-suite-website/utils/suite-pricing";

// The prices the live /pricing page shows. If one of these fails, the curve
// here has drifted from components/site/site-bundle.jsx.
describe("suite pricing", () => {
  it("matches the reference prices on /pricing", () => {
    expect(suitePrice(2_500)).toBe(39);
    expect(suitePrice(5_000)).toBe(65);
    expect(suitePrice(25_000)).toBe(349);
  });

  it("sets the level by contact band", () => {
    expect(levelFor(24_999)).toBe("launch");
    expect(levelFor(25_000)).toBe("growth");
    expect(levelFor(75_000)).toBe("pro");
  });

  it("gives Launch at least 50,000 emails and scales seats", () => {
    expect(allowances(2_500).emails).toBe(50_000);
    expect(allowances(25_000).seats).toBe(4);
  });

  it("offers Onramp only from Growth", () => {
    expect(onrampFor("launch")).toBe("none");
    expect(onrampFor("growth")).toBe("optional");
    expect(onrampFor("pro")).toBe("included");
  });
});
