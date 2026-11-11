import { describe, expect, it } from "vitest";

import { protocolTemplates, type TemplateStep } from "./protocol-templates";
import { STANDARD_LOOP_SUMMARY, standardLoopSummary } from "./standard-loops";

const flat = (steps: TemplateStep[]): TemplateStep[] =>
  steps.flatMap((s) =>
    s.kind === "branch" ? [s, ...flat(s.yes), ...flat(s.no)] : [s]
  );

describe("standard Loop summaries", () => {
  it("has a line for every template, and none for a template that is gone", () => {
    const ids = protocolTemplates.map((t) => t.id).sort();
    expect(Object.keys(STANDARD_LOOP_SUMMARY).sort()).toEqual(ids);
  });

  it("is one short sentence that says who comes in, then what they get", () => {
    for (const line of Object.values(STANDARD_LOOP_SUMMARY)) {
      expect(line).toMatch(/^[A-Z][^:]+: .+\.$/);
      expect(line.length).toBeLessThanOrEqual(110);
    }
  });

  // A card must not promise a channel the Loop does not send on.
  it("does not mention a push for a Loop with no push step", () => {
    for (const t of protocolTemplates) {
      const kinds = new Set(flat(t.steps).map((s) => s.kind as string));
      if (!kinds.has("push")) {
        expect(standardLoopSummary(t.id), t.id).not.toMatch(/push/i);
      }
    }
  });

  it("falls back to the template's own description", () => {
    expect(standardLoopSummary("nope")).toBe("");
  });
});
