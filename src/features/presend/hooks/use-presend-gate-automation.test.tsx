import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PresendDialog } from "../components/presend-dialog";
import type { PresendCheck } from "../contracts/presend";
import { block, pass, result, warn } from "../test/fixtures";
import { isPresendStopped } from "../utils/presend-errors";
import {
  type PresendRunOptions,
  type PresendSteps,
  usePresendGate,
} from "./use-presend-gate";
import { automationService } from "@/features/automation/automation.service";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  apiClient: { request: (...args: unknown[]) => requestMock(...args) },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

type Outcome = { value?: unknown; error?: unknown };
type Config = { method: string; url: string; params?: { graph?: string } };

function Harness({
  options,
  onDone,
}: {
  options: PresendRunOptions<unknown>;
  onDone: (o: Outcome) => void;
}) {
  const gate = usePresendGate();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          gate.run(options).then(
            (value) => onDone({ value }),
            (error) => onDone({ error })
          )
        }
      >
        go
      </button>
      <PresendDialog {...gate.dialogProps} />
    </>
  );
}

const start = (options: PresendRunOptions<unknown>) => {
  const outcomes: Outcome[] = [];
  render(<Harness options={options} onDone={(o) => outcomes.push(o)} />);
  fireEvent.click(screen.getByRole("button", { name: "go" }));
  return outcomes;
};

const ok = (data: unknown = { success: true }) => ({ data: { data } });
const calls = () => requestMock.mock.calls.map(([c]) => c as Config);

const onSteps = (check: PresendCheck, steps: string[]): PresendCheck => ({
  ...check,
  details: { ...(check.details ?? {}), nodeId: steps[0], steps },
});

/** The list's Turn on: resumes the SAVED graph. */
const listToggle = (steps?: PresendSteps): PresendRunOptions<unknown> => ({
  action: "activate",
  preflight: () => automationService.getPresendCheck("a1", "saved", "org"),
  steps,
  attempt: (ack) =>
    automationService.updateAutomationStatus(
      "a1",
      { status: "active", ...(ack ? { acknowledgedWarnings: ack } : {}) },
      "org"
    ),
});

/** The builder's Publish: checks the DRAFT graph. */
const builderPublish = (steps?: PresendSteps): PresendRunOptions<unknown> => ({
  action: "activate",
  preflight: () => automationService.getPresendCheck("a1", "draft", "org"),
  steps,
  attempt: (ack) => automationService.publishAutomation("a1", "org", ack),
});

beforeEach(() => {
  requestMock.mockReset();
});

describe("automation pre-check before activate / publish", () => {
  it("defaults the graph to draft", async () => {
    requestMock.mockResolvedValueOnce(ok(result([])));
    await automationService.getPresendCheck("a1");
    expect(calls()[0]).toEqual(
      expect.objectContaining({
        method: "GET",
        url: "/automations/a1/presend-check",
        params: { graph: "draft" },
      })
    );
  });

  it("list toggle: looks at the saved graph and opens the review BEFORE the status call", async () => {
    requestMock.mockImplementation(async (config: Config) =>
      config.url.endsWith("/presend-check")
        ? ok(result([warn("GMAIL_CLIP"), pass("DMARC_MISSING")]))
        : ok({ status: "active" })
    );
    const outcomes = start(listToggle());

    await screen.findByTestId("presend-warn-GMAIL_CLIP");
    expect(calls().map((c) => c.url)).toEqual([
      "/automations/a1/presend-check",
    ]);
    expect(calls()[0].params).toEqual({ graph: "saved" });

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Activate anyway" }));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(calls().map((c) => c.url)).toEqual([
      "/automations/a1/presend-check",
      "/automations/a1/status",
    ]);
    expect(requestMock.mock.calls[1][0].data).toEqual({
      status: "active",
      acknowledgedWarnings: ["GMAIL_CLIP"],
    });
  });

  it("builder publish: looks at the draft graph and a block never publishes", async () => {
    requestMock.mockResolvedValueOnce(ok(result([block("URL_SHORTENER")])));
    const outcomes = start(builderPublish());
    await screen.findByTestId("presend-block-URL_SHORTENER");
    expect(calls()[0].params).toEqual({ graph: "draft" });
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(isPresendStopped(outcomes[0].error)).toBe(true);
    expect(calls().some((c) => c.url.endsWith("/publish"))).toBe(false);
  });

  it("names each check's email steps from the graph, falling back to 'Email step'", async () => {
    requestMock.mockResolvedValueOnce(
      ok(
        result([
          onSteps(block("URL_SHORTENER"), ["email-1", "email-gone"]),
          onSteps(warn("GMAIL_CLIP"), ["email-2"]),
        ])
      )
    );
    const names: Record<string, string> = {
      "email-1": "Welcome email",
      "email-2": "Follow-up",
    };
    start(builderPublish({ nameOf: (id) => names[id] }));

    const shortener = await screen.findByTestId("presend-block-URL_SHORTENER");
    expect(shortener).toHaveTextContent("2 email steps");
    expect(screen.getByTestId("presend-step-email-1")).toHaveTextContent(
      "Welcome email"
    );
    expect(screen.getByTestId("presend-step-email-gone")).toHaveTextContent(
      "Email step"
    );
    expect(screen.getByTestId("presend-step-email-2")).toHaveTextContent(
      "Follow-up"
    );
    // No navigation offered without a handler.
    expect(
      screen.queryByRole("button", { name: /Go to step/ })
    ).not.toBeInTheDocument();
  });

  it("Go to step closes the review, stops the run and focuses that step", async () => {
    requestMock.mockResolvedValueOnce(
      ok(result([onSteps(warn("GMAIL_CLIP"), ["email-2", "email-gone"])]))
    );
    const onGoTo = vi.fn();
    const outcomes = start(
      listToggle({
        nameOf: (id) => (id === "email-2" ? "Follow-up" : undefined),
        onGoTo,
      })
    );

    await screen.findByTestId("presend-warn-GMAIL_CLIP");
    // A step that is no longer on the canvas has nowhere to go.
    expect(screen.getAllByRole("button", { name: /Go to step/ })).toHaveLength(
      1
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Go to step Follow-up" })
    );

    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(onGoTo).toHaveBeenCalledWith("email-2");
    expect(isPresendStopped(outcomes[0].error)).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls().some((c) => c.url.endsWith("/status"))).toBe(false);
  });
});
