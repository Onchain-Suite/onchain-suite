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

  it("gives every email step sendable copy", () => {
    // executeSendEmailNode reads `templateId` or `body`. A template NAME is
    // neither, so a recipe without a body reached its first email step and
    // sent an empty message — the flow ran and the customer got nothing.
    const emails = (
      steps: (typeof protocolTemplates)[number]["steps"]
    ): number => {
      let n = 0;
      for (const s of steps) {
        if (s.kind === "email") {
          expect({
            subject: s.subject,
            hasBody: Boolean(s.body?.trim()),
          }).toEqual({ subject: s.subject, hasBody: true });
          n += 1;
        } else if (s.kind === "branch") {
          n += emails(s.yes) + emails(s.no);
        }
      }
      return n;
    };
    let total = 0;
    for (const t of protocolTemplates) total += emails(t.steps);
    expect(total).toBeGreaterThan(0);
  });

  it("never uses a merge tag that renders empty for a wallet", () => {
    // `{{ens_name}}` is blank for any wallet without ENS — most of them — so
    // "You're now a VIP, " went out. `greeting_name` falls back
    // firstName || ens || wallet_short || "there" and resolves for everyone.
    const json = JSON.stringify(protocolTemplates);
    expect(json).not.toContain("{{ens_name}}");
    expect(json).not.toContain("ens_name");
  });

  it("carries the body into the built graph, not just the step", () => {
    // The copy has to reach the NODE. It lived on the step and was dropped by
    // stepNodeData, so the graph the backend received still had no body.
    for (const t of protocolTemplates) {
      const body = buildProtocolAutomation(t) as {
        flowGraph: { nodes: Array<{ data?: Record<string, unknown> }> };
      };
      const emailNodes = body.flowGraph.nodes.filter(
        (n) => n.data?.nodeType === "send_email"
      );
      for (const n of emailNodes) {
        expect({
          name: t.name,
          subject: n.data?.subject,
          hasBody: Boolean(String(n.data?.body ?? "").trim()),
        }).toEqual({
          name: t.name,
          subject: n.data?.subject,
          hasBody: true,
        });
      }
    }
  });
});
