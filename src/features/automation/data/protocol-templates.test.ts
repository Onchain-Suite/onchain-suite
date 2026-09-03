import { describe, expect, it } from "vitest";

import {
  buildProtocolAutomation,
  protocolTemplates,
} from "./protocol-templates";

/**
 * Applying a recipe used to create a draft that could never be published.
 *
 * The payload carried `type: "behavior"` — a display grouping no trigger
 * matcher recognises — alongside `contract: "Your Token"` and
 * `chain: "All Chains"`. Those are captions: `getAddress()` rejects the first
 * and no chain is named "All Chains", so the watch planner bound nothing and
 * the automation sat as a draft that looked configured and could never fire.
 * The only symptom was that nothing ever happened.
 *
 * Evidence it reached production: the Goldgard org holds an "LTV Milestone
 * Reward" draft with `triggerSpec {"type":"behavior","event":"LTV ≥ $5,000"}`
 * and zero watch bindings.
 */
describe("protocol template payloads", () => {
  const triggerOf = (t: (typeof protocolTemplates)[number]) => {
    const step = t.steps.find((s) => s.kind === "trigger");
    return step?.kind === "trigger" ? step : null;
  };

  it("gives every recipe a trigger the runtime knows", () => {
    // The old values — "onchain" and "behavior" — are display groupings, not
    // trigger types. Anything not on this list binds nothing.
    const real = new Set([
      "onchain_event",
      "large_transfer",
      "holder_acquired",
      "bridged",
      "segment_entered",
      "form_submitted",
      "list_joined",
      "email_opened",
      "email_clicked",
      "health_threshold",
      "date_reached",
    ]);
    for (const t of protocolTemplates) {
      const trigger = triggerOf(t);
      expect({ name: t.name, preset: trigger?.triggerPreset }).toEqual({
        name: t.name,
        preset: expect.any(String),
      });
      expect({
        name: t.name,
        known: real.has(String(trigger?.triggerPreset)),
      }).toEqual({ name: t.name, known: true });
    }
  });

  it("never sends a caption as configuration", () => {
    for (const t of protocolTemplates) {
      const body = buildProtocolAutomation(t) as Record<string, unknown>;
      const spec = (body.triggerSpec ?? {}) as Record<string, unknown>;
      // An empty required field is a prompt; a plausible wrong one is a trap.
      expect({ name: t.name, contract: spec.contract }).toEqual({
        name: t.name,
        contract: undefined,
      });
      expect({ name: t.name, chain: spec.chain }).toEqual({
        name: t.name,
        chain: undefined,
      });
    }
  });

  it("emits the real preset as the trigger type", () => {
    for (const t of protocolTemplates) {
      const body = buildProtocolAutomation(t) as Record<string, unknown>;
      const spec = (body.triggerSpec ?? {}) as Record<string, unknown>;
      expect({ name: t.name, type: spec.type }).toEqual({
        name: t.name,
        type: triggerOf(t)?.triggerPreset,
      });
    }
  });

  it("declares what the user still has to choose", () => {
    // Shown on the card, so the empty field in the builder is expected rather
    // than read as the template having failed.
    for (const t of protocolTemplates) {
      const trigger = triggerOf(t);
      if (trigger?.triggerPreset === "health_threshold") continue; // needs nothing
      expect((trigger?.requires ?? []).length).toBeGreaterThan(0);
    }
  });

  it("keeps the trigger node free of placeholder contract and chain", () => {
    for (const t of protocolTemplates) {
      const body = buildProtocolAutomation(t) as {
        flowGraph: { nodes: Array<Record<string, unknown>> };
      };
      const node = body.flowGraph.nodes.find((n) => n.type === "trigger");
      const data = (node?.data ?? {}) as Record<string, unknown>;
      expect({
        name: t.name,
        contract: data.contract,
        chain: data.chain,
      }).toEqual({ name: t.name, contract: undefined, chain: undefined });
    }
  });
});
