import { describe, expect, it } from "vitest";

import {
  nextEntry,
  PLAYBOOK_MAP,
  sectionAnchor,
  strategyContents,
} from "./playbook-toc";
import { PERP_DEX } from "@/onchain-suite-website/data/playbooks/perp-dex";

describe("playbook map", () => {
  it("lists the landing page, then one page per sector", () => {
    expect(PLAYBOOK_MAP.map((e) => [e.number, e.href])).toEqual([
      ["00", "/retention-playbook"],
      ["01", "/retention-playbook/perp-dexes"],
      ["02", "/retention-playbook/prediction-markets"],
      ["03", "/retention-playbook/defi"],
    ]);
  });

  it("gives every sector a one-line focus, and the overview none", () => {
    expect(PLAYBOOK_MAP[0].line).toBeUndefined();
    expect(PLAYBOOK_MAP.slice(1).every((e) => Boolean(e.line))).toBe(true);
  });

  it("points each page at the next one, and the last at nothing", () => {
    expect(nextEntry("overview")?.id).toBe("perp-dex");
    expect(nextEntry("perp-dex")?.id).toBe("prediction-market");
    expect(nextEntry("prediction-market")?.id).toBe("defi");
    expect(nextEntry("defi")).toBeUndefined();
    expect(nextEntry("working-with-us")).toBeUndefined();
  });

  it("builds section anchors from chapter and section ids", () => {
    expect(sectionAnchor("defi", "campaigns")).toBe("defi-campaigns");
  });
});

describe("strategy contents", () => {
  const contents = strategyContents(PERP_DEX);

  it("opens with the strategy itself, then every section in order", () => {
    expect(contents[0]).toMatchObject({ number: "00", href: "#perp-dex" });
    expect(contents.slice(1).map((e) => e.label)).toEqual(
      PERP_DEX.sections.map((s) => s.title)
    );
  });

  it("numbers the sections from 01 and scrolls within the page", () => {
    expect(contents[1]).toMatchObject({
      number: "01",
      href: `#${sectionAnchor("perp-dex", PERP_DEX.sections[0].id)}`,
    });
    expect(contents.every((e) => e.href.startsWith("#"))).toBe(true);
  });

  it("names each strategy as a growth and retention strategy", () => {
    expect(PERP_DEX.title).toBe("Perp DEX growth and retention strategy");
    expect(PLAYBOOK_MAP[1].label).toBe(PERP_DEX.title);
  });
});
