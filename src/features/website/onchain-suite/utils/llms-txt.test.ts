import { describe, expect, it } from "vitest";

import { buildLlmsTxt } from "@/onchain-suite-website/utils/llms-txt";

describe("llms.txt", () => {
  const txt = buildLlmsTxt();

  it("opens with the title and the one-line summary", () => {
    const [title, , summary] = txt.split("\n");
    expect(title).toBe("# OnchainSuite");
    expect(
      summary.startsWith("> OnchainSuite is retention and lifecycle software")
    ).toBe(true);
  });

  it("states the /pricing prices, not the old schema prices", () => {
    expect(txt).toContain("$39 a month");
    expect(txt).toContain("$349 a month");
    expect(txt).not.toContain("$49");
    expect(txt).not.toContain("$299");
  });

  it("lists only live channels as live", () => {
    const channels = txt
      .split("\n")
      .find((l) => l.startsWith("- Channels today:"));
    expect(channels).toContain("Email and in-app");
    expect(channels).toContain("does not send on Telegram, Discord or X");
  });

  it("gives the founding year and the incorporation date", () => {
    const company = txt.split("\n").find((l) => l.startsWith("- Company:"));
    expect(company).toContain("founded in 2024, incorporated 30 July 2026");
  });

  it("never mentions Datum Labs or Atlas", () => {
    expect(txt.toLowerCase()).not.toContain("atlas");
    expect(txt.toLowerCase()).not.toContain("datum");
  });

  it("uses absolute www links and no em-dashes", () => {
    expect(txt).toContain("https://www.onchainsuite.com/pricing");
    expect(txt).not.toContain(String.fromCharCode(0x2014));
  });
});
