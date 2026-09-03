import { describe, expect, it } from "vitest";

import {
  AUTOMATION_BUILDER_INVALID,
  buildLocalIssues,
  hintForIssue,
  humanizeIssueCode,
  isBuilderInvalidError,
  mergeIssues,
  nodeSetupIssue,
  parseBuilderErrorIssues,
  parseDurationToSeconds,
  parseHealthFactorThreshold,
  parseValidationIssues,
  parseWatchesSkipped,
  parseWatchState,
  summarizeIssues,
  withApiErrorFields,
} from "./builder-issues";

const node = (
  over: Partial<Parameters<typeof buildLocalIssues>[0]["nodes"][number]> = {}
) => ({
  id: "n1",
  type: "email",
  label: "Send email",
  isTrigger: false,
  data: { subject: "Hi", templateId: "t1" },
  ...over,
});

describe("parseValidationIssues", () => {
  it("reads errors and warnings, keeping the node each belongs to", () => {
    const issues = parseValidationIssues({
      errors: [
        {
          code: "INVALID_EMAIL_CONFIG",
          message: "Subject is required",
          nodeId: "email-1",
        },
      ],
      warnings: [{ code: "DISCONNECTED_NODE", nodeId: "wait-2" }],
    });

    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({
      severity: "error",
      nodeId: "email-1",
      message: "Subject is required",
    });
    // No message on the warning - the code is humanized rather than shown raw.
    expect(issues[1]).toMatchObject({
      severity: "warning",
      nodeId: "wait-2",
      message: "Disconnected node",
    });
  });

  it("accepts bare strings and the alternate node id spellings", () => {
    expect(
      parseValidationIssues({ errors: ["Flow has no trigger"] })[0]
    ).toMatchObject({
      severity: "error",
      message: "Flow has no trigger",
    });
    expect(
      parseValidationIssues({ errors: [{ message: "bad", step_id: "s-9" }] })[0]
    ).toMatchObject({ nodeId: "s-9" });
  });

  it("returns nothing for a payload with no issue arrays", () => {
    expect(parseValidationIssues({ ok: true })).toEqual([]);
    expect(parseValidationIssues(null)).toEqual([]);
  });
});

describe("parseBuilderErrorIssues", () => {
  it("digs the per-step errors out of a thrown AUTOMATION_BUILDER_INVALID", () => {
    const error = withApiErrorFields(
      new Error("Automation builder graph is invalid"),
      {
        code: AUTOMATION_BUILDER_INVALID,
        details: {
          errors: [{ message: "Pick a template", nodeId: "email-1" }],
        },
      }
    );

    expect(parseBuilderErrorIssues(error)).toMatchObject([
      { severity: "error", nodeId: "email-1", message: "Pick a template" },
    ]);
    expect(isBuilderInvalidError(error)).toBe(true);
  });

  it("falls back to the raw response body when details carries nothing", () => {
    const error = withApiErrorFields(new Error("nope"), {
      body: {
        error: {
          errors: [{ message: "Wait needs a duration", nodeId: "wait-1" }],
        },
      },
    });

    expect(parseBuilderErrorIssues(error)).toMatchObject([
      { nodeId: "wait-1" },
    ]);
  });

  it("recognizes the graph rejection from its message when no code came through", () => {
    expect(
      isBuilderInvalidError(new Error("Automation builder graph is invalid"))
    ).toBe(true);
    expect(
      isBuilderInvalidError(new Error("Request failed with status code 500"))
    ).toBe(false);
  });

  it("returns nothing for an unstructured error", () => {
    expect(parseBuilderErrorIssues(new Error("boom"))).toEqual([]);
    expect(parseBuilderErrorIssues("boom")).toEqual([]);
  });
});

describe("buildLocalIssues", () => {
  it("flags an empty canvas", () => {
    expect(buildLocalIssues({ nodes: [], edges: [] })).toMatchObject([
      { code: "EMPTY_FLOW", severity: "error" },
    ]);
  });

  it("flags a missing trigger and an unconfigured step, naming the step", () => {
    const issues = buildLocalIssues({
      nodes: [node({ id: "email-1", data: { templateId: "t1" } })],
      edges: [],
    });

    expect(issues.map((i) => i.code)).toContain("MISSING_TRIGGER");
    // Named with the backend's own code, so the copy is shared either way.
    expect(
      issues.find((i) => i.code === "INVALID_EMAIL_SUBJECT")
    ).toMatchObject({
      nodeId: "email-1",
      message: "Send email - needs a subject line",
    });
  });

  it("flags every trigger after the first", () => {
    const issues = buildLocalIssues({
      nodes: [
        node({ id: "t1", isTrigger: true, label: "Trigger A" }),
        node({ id: "t2", isTrigger: true, label: "Trigger B" }),
      ],
      edges: [],
    });

    expect(issues.filter((i) => i.code === "MULTIPLE_TRIGGERS")).toMatchObject([
      { nodeId: "t2", message: "Trigger B is a second trigger" },
    ]);
  });

  it("warns about a step the trigger cannot reach, and stays quiet about connected ones", () => {
    const issues = buildLocalIssues({
      nodes: [
        node({ id: "t1", isTrigger: true, label: "Trigger" }),
        node({ id: "e1", label: "Connected" }),
        node({ id: "e2", label: "Stranded" }),
      ],
      edges: [{ source: "t1", target: "e1" }],
    });

    const disconnected = issues.filter((i) => i.code === "DISCONNECTED_NODES");
    expect(disconnected).toMatchObject([{ nodeId: "e2", severity: "warning" }]);
  });

  it("flags a trigger with no steps under it", () => {
    const issues = buildLocalIssues({
      nodes: [
        node({ id: "t1", isTrigger: true, label: "Trigger", type: "trigger" }),
      ],
      edges: [],
    });

    expect(issues.map((i) => i.code)).toContain("NO_ACTIONS");
  });

  it("blocks on an unverified sender when the flow sends email", () => {
    const issues = buildLocalIssues({
      nodes: [node({ id: "t1", isTrigger: true, label: "Trigger" }), node()],
      edges: [{ source: "t1", target: "n1" }],
      emailNeedsSender: true,
    });

    expect(issues.find((i) => i.code === "SENDER_NOT_VERIFIED")).toMatchObject({
      severity: "error",
    });
  });
});

describe("mergeIssues", () => {
  it("drops the local guess for a step the backend already reported", () => {
    const local = buildLocalIssues({
      nodes: [
        node({ id: "t1", isTrigger: true, label: "Trigger" }),
        node({ id: "email-1", data: {} }),
      ],
      edges: [{ source: "t1", target: "email-1" }],
    });
    const server = parseValidationIssues({
      errors: [{ message: "Subject is required", nodeId: "email-1" }],
    });

    const merged = mergeIssues(local, server);
    expect(merged.filter((i) => i.nodeId === "email-1")).toMatchObject([
      { source: "server", message: "Subject is required" },
    ]);
  });

  it("puts errors before warnings", () => {
    const merged = mergeIssues(
      [
        {
          id: "w",
          severity: "warning",
          code: "DISCONNECTED_NODES",
          message: "w",
          source: "local",
        },
      ],
      parseValidationIssues({ errors: [{ message: "e" }] })
    );

    expect(merged.map((i) => i.severity)).toEqual(["error", "warning"]);
  });
});

describe("copy helpers", () => {
  it("humanizes a code only as a last resort", () => {
    expect(humanizeIssueCode("INVALID_WAIT_CONFIG")).toBe(
      "Invalid wait config"
    );
    expect(humanizeIssueCode("")).toBe("");
  });

  it("gives a fix-it hint per issue kind, and none when nothing matches", () => {
    expect(hintForIssue("MISSING_TRIGGER")).toMatch(/starts with one trigger/);
    expect(hintForIssue("INVALID_WEBHOOK_CONFIG")).toMatch(/URL/);
    expect(hintForIssue("SOMETHING_WE_HAVE_NEVER_SEEN")).toBe("");
  });

  it("summarizes only the blocking issues", () => {
    const summary = summarizeIssues(
      parseValidationIssues({
        errors: [{ message: "A" }, { message: "B" }, { message: "C" }],
        warnings: [{ message: "D" }],
      })
    );

    expect(summary).toBe("A; B (+1 more)");
  });
});

describe("nodeSetupIssue", () => {
  const trigger = (triggerType: string, data: Record<string, unknown>) =>
    nodeSetupIssue({ type: triggerType, isTrigger: true, triggerType, data });

  it("does NOT ask a preset on-chain trigger for an event - the preset implies it", () => {
    expect(trigger("swap_completed", { contractAddress: "0xabc" })).toBeNull();
    expect(trigger("holder_acquired", { contractAddress: "0xabc" })).toBeNull();
  });

  it("does ask the generic on-chain trigger for an event", () => {
    expect(
      trigger("onchain_event", { contractAddress: "0xabc" })
    ).toMatchObject({ code: "WATCH_NO_EVENT" });
    expect(
      trigger("onchain_event", { contractAddress: "0xabc", event: "Transfer" })
    ).toBeNull();
  });

  it("treats the old placeholder text as unset", () => {
    expect(
      trigger("swap_completed", { contract: "Select Contract" })
    ).toMatchObject({ code: "WATCH_NO_ADDRESS" });
  });

  it("asks every on-chain trigger for a contract, and off-chain ones for nothing", () => {
    expect(trigger("swap_completed", {})).toMatchObject({
      code: "WATCH_NO_ADDRESS",
    });
    expect(trigger("form_submitted", {})).toBeNull();
    expect(trigger("segment_entered", {})).toBeNull();
  });

  it("treats the contact-score trigger as off-chain - it needs no contract", () => {
    // Renaming `health_threshold` to a contact-score trigger must not turn it
    // into a contract-watching one: it is ingested by score, not a chain event.
    expect(trigger("health_threshold", {})).toBeNull();
  });

  it("asks the DeFi trigger for a pool and a positive threshold, NOT a contract/event", () => {
    // The lending trigger is configured by pool + health-factor level. It must
    // never fall into the contract/event path every other on-chain trigger uses.
    expect(trigger("defi_health_factor", {})).toMatchObject({
      code: "INVALID_DEFI_POOL",
    });
    expect(
      trigger("defi_health_factor", { poolAddress: "0xpool" })
    ).toMatchObject({ code: "INVALID_DEFI_THRESHOLD" });
    // A non-positive level is not a real threshold, so it reads as unset.
    expect(
      trigger("defi_health_factor", { poolAddress: "0xpool", threshold: 0 })
    ).toMatchObject({ code: "INVALID_DEFI_THRESHOLD" });
    expect(
      trigger("defi_health_factor", { poolAddress: "0xpool", threshold: 1.2 })
    ).toBeNull();
    // Stored as a string by the input, which must still count.
    expect(
      trigger("defi_health_factor", { poolAddress: "0xpool", threshold: "1" })
    ).toBeNull();
  });

  it("uses the backend's own code for each action step", () => {
    const action = (
      type: string,
      data: Record<string, unknown>,
      outgoingEdgeCount = 0
    ) =>
      nodeSetupIssue({ type, isTrigger: false, data }, { outgoingEdgeCount });

    expect(action("send_email", {})).toMatchObject({
      code: "INVALID_EMAIL_CONFIG",
    });
    expect(action("send_email", { templateId: "t1" })).toMatchObject({
      code: "INVALID_EMAIL_SUBJECT",
    });
    expect(
      action("send_email", { templateId: "t1", subject: "Hi" })
    ).toBeNull();
    expect(action("wait", { duration: "" })).toMatchObject({
      code: "INVALID_WAIT_CONFIG",
    });
    expect(action("wait", { duration: "2 days" })).toBeNull();
    // A branch needs BOTH outcomes wired, which only the edges can tell us.
    expect(action("branch", {}, 1)).toMatchObject({
      code: "INVALID_BRANCH_CONFIG",
    });
    expect(action("branch", {}, 2)).toBeNull();
    expect(action("webhook", {})).toMatchObject({
      code: "INVALID_WEBHOOK_CONFIG",
    });
    expect(action("dispatch_campaign", {})).toMatchObject({
      code: "INVALID_CAMPAIGN_DISPATCH_CONFIG",
    });
  });
});

describe("parseHealthFactorThreshold", () => {
  it("keeps a positive number, from either a number or a string", () => {
    expect(parseHealthFactorThreshold(1.2)).toBe(1.2);
    expect(parseHealthFactorThreshold("1.05")).toBe(1.05);
    expect(parseHealthFactorThreshold("1")).toBe(1);
  });

  it("treats zero, negatives, and junk as unset (0)", () => {
    // 1.0 is the liquidation line; a value at or below 0 would never fire or
    // match everything, so it is not a usable threshold.
    expect(parseHealthFactorThreshold(0)).toBe(0);
    expect(parseHealthFactorThreshold(-1)).toBe(0);
    expect(parseHealthFactorThreshold("")).toBe(0);
    expect(parseHealthFactorThreshold("abc")).toBe(0);
    expect(parseHealthFactorThreshold(undefined)).toBe(0);
    expect(parseHealthFactorThreshold(Number.NaN)).toBe(0);
  });
});

describe("parseDurationToSeconds", () => {
  it("turns the wait step's prose into the positive seconds the runtime needs", () => {
    expect(parseDurationToSeconds("2 days")).toBe(172800);
    expect(parseDurationToSeconds("45m")).toBe(2700);
    expect(parseDurationToSeconds("1 hour 30 minutes")).toBe(5400);
    expect(parseDurationToSeconds("1 week")).toBe(604800);
    // A bare number reads as minutes, matching the field's placeholder.
    expect(parseDurationToSeconds("15")).toBe(900);
    expect(parseDurationToSeconds(120)).toBe(120);
  });

  it("returns 0 for anything it cannot read, so the step stays flagged", () => {
    expect(parseDurationToSeconds("")).toBe(0);
    expect(parseDurationToSeconds("soon")).toBe(0);
    expect(parseDurationToSeconds(undefined)).toBe(0);
    expect(parseDurationToSeconds(-5)).toBe(0);
  });
});

describe("parseWatchesSkipped", () => {
  it("turns a publish's skipped watches into per-step warnings", () => {
    const issues = parseWatchesSkipped({
      status: "active",
      watchesRegistered: 1,
      watchesSkipped: [
        {
          nodeId: "t2",
          code: "WATCH_NO_ADDRESS",
          reason: "no contract address configured",
        },
      ],
    });

    expect(issues).toMatchObject([
      {
        severity: "warning",
        nodeId: "t2",
        code: "WATCH_NO_ADDRESS",
        message: "This trigger is not live - no contract address configured",
      },
    ]);
    expect(issues[0].hint).toMatch(/contract address/);
  });

  it("is empty for a clean publish", () => {
    expect(
      parseWatchesSkipped({ watchesRegistered: 2, watchesSkipped: [] })
    ).toEqual([]);
    expect(parseWatchesSkipped(null)).toEqual([]);
  });
});

describe("parseWatchState", () => {
  it("flags a trigger that never bound, naming the node", () => {
    expect(
      parseWatchState({
        subscriptions: "known",
        triggers: [
          {
            nodeId: "t1",
            live: false,
            code: "WATCH_NO_CHAIN",
            reason: "no chain configured",
          },
        ],
      })
    ).toMatchObject([
      {
        severity: "warning",
        nodeId: "t1",
        code: "WATCH_NO_CHAIN",
        message: "This trigger is not live - no chain configured",
      },
    ]);
  });

  it("flags a watch the reconciler dropped after a clean publish", () => {
    const issues = parseWatchState({
      subscriptions: "known",
      triggers: [{ nodeId: "t1", live: false, watchStatus: "failed" }],
    });

    expect(issues).toMatchObject([{ code: "WATCH_FAILED", nodeId: "t1" }]);
  });

  it("says nothing about a live trigger, and reports one that errored", () => {
    expect(
      parseWatchState({
        subscriptions: "known",
        triggers: [
          {
            nodeId: "t1",
            live: true,
            watchStatus: "active",
            lastEventAt: null,
            lastError: null,
          },
        ],
      })
    ).toEqual([]);

    expect(
      parseWatchState({
        subscriptions: "known",
        triggers: [
          {
            nodeId: "t1",
            live: true,
            lastError: "provider rejected the filter",
          },
        ],
      })
    ).toMatchObject([
      {
        severity: "warning",
        code: "WATCH_FAILED",
        message:
          "This trigger reported an error - provider rejected the filter",
      },
    ]);
  });

  it("does NOT call a trigger dead when the subscription read itself failed", () => {
    // `unavailable` means we could not read - a missing binding proves nothing.
    expect(
      parseWatchState({
        subscriptions: "unavailable",
        triggers: [
          {
            nodeId: "t1",
            live: false,
            code: "WATCH_NOT_REGISTERED",
            reason: "…",
          },
        ],
      })
    ).toEqual([]);
    // A recorded skip is still accurate in that state - it comes from the
    // automation row, not the subscription read.
    expect(
      parseWatchState({
        subscriptions: "unavailable",
        triggers: [
          {
            nodeId: "t1",
            live: false,
            code: "WATCH_NO_ADDRESS",
            reason: "no contract address configured",
          },
        ],
      })
    ).toMatchObject([{ code: "WATCH_NO_ADDRESS" }]);
  });

  it("is empty for a payload it cannot read", () => {
    expect(parseWatchState(null)).toEqual([]);
    expect(parseWatchState({ subscriptions: "known" })).toEqual([]);
  });
});
