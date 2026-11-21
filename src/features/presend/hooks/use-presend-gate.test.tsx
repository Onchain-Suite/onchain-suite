import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PresendDialog } from "../components/presend-dialog";
import {
  ackRequired,
  axiosRejection,
  block,
  pass,
  result,
  warn,
} from "../test/fixtures";
import { isPresendStopped } from "../utils/presend-errors";
import { type PresendRunOptions, usePresendGate } from "./use-presend-gate";
import { automationService } from "@/features/automation/automation.service";
import { campaignsService } from "@/features/campaigns/campaigns.service";

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

/** Mounts the gate the way a page does: hook + one dialog. */
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

const acknowledgeAndConfirm = async (label = "Send anyway") => {
  fireEvent.click(await screen.findByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: label }));
};

/** The `acknowledgedWarnings` of every launch/status/publish call so far. */
const ackBodies = (urlPart: string) =>
  requestMock.mock.calls
    .map(
      ([config]) =>
        config as { url: string; data?: { acknowledgedWarnings?: string[] } }
    )
    .filter((c) => c.url.includes(urlPart))
    .map((c) => c.data?.acknowledgedWarnings);

const ok = (data: unknown = { success: true }) => ({ data: { data } });

const launchOptions = (withPreflight: boolean): PresendRunOptions<unknown> => ({
  action: "send",
  ...(withPreflight
    ? { preflight: () => campaignsService.getPresendCheck("c1", "org") }
    : {}),
  attempt: (ack) => campaignsService.launchCampaign("c1", "org", ack),
});

beforeEach(() => {
  requestMock.mockReset();
});

describe("usePresendGate - campaign launch", () => {
  it("launches straight away when every check passes", async () => {
    requestMock.mockImplementation(async (config: { url: string }) =>
      config.url.endsWith("/presend-check")
        ? ok(result([pass("DMARC_MISSING")]))
        : ok()
    );
    const outcomes = start(launchOptions(true));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(outcomes[0].error).toBeUndefined();
    expect(ackBodies("/launch")).toEqual([undefined]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows preflight warns and launches with exactly the warn codes shown", async () => {
    requestMock.mockImplementation(async (config: { url: string }) =>
      config.url.endsWith("/presend-check")
        ? ok(
            result([
              warn("GMAIL_CLIP"),
              pass("DMARC_MISSING"),
              warn("DMARC_NOT_ENFORCED"),
            ])
          )
        : ok()
    );
    const outcomes = start(launchOptions(true));
    expect(
      await screen.findByTestId("presend-warn-GMAIL_CLIP")
    ).toBeInTheDocument();
    expect(ackBodies("/launch")).toEqual([]);

    await acknowledgeAndConfirm();
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(ackBodies("/launch")).toEqual([
      ["GMAIL_CLIP", "DMARC_NOT_ENFORCED"],
    ]);
  });

  it("stops on a preflight block without calling launch", async () => {
    requestMock.mockResolvedValueOnce(ok(result([block("URL_SHORTENER")])));
    const outcomes = start(launchOptions(true));
    expect(
      await screen.findByTestId("presend-block-URL_SHORTENER")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(isPresendStopped(outcomes[0].error)).toBe(true);
    expect(ackBodies("/launch")).toEqual([]);
  });

  it("falls back to the launch call when the presend GET fails", async () => {
    requestMock.mockImplementation(async (config: { url: string }) => {
      if (config.url.endsWith("/presend-check")) {
        throw axiosRejection(500, { code: "INTERNAL_ERROR" });
      }
      return ok();
    });
    const outcomes = start(launchOptions(true));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(outcomes[0].error).toBeUndefined();
    expect(ackBodies("/launch")).toEqual([undefined]);
  });

  it("on 409 opens the review, then retries with every warn code", async () => {
    requestMock
      .mockRejectedValueOnce(
        ackRequired(
          [warn("GMAIL_CLIP"), warn("NEW_LINK_DOMAIN")],
          ["GMAIL_CLIP", "NEW_LINK_DOMAIN"]
        )
      )
      .mockResolvedValueOnce(ok());
    const outcomes = start(launchOptions(false));

    expect(
      await screen.findByTestId("presend-warn-NEW_LINK_DOMAIN")
    ).toBeInTheDocument();
    await acknowledgeAndConfirm();
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(outcomes[0].error).toBeUndefined();
    expect(ackBodies("/launch")).toEqual([
      undefined,
      ["GMAIL_CLIP", "NEW_LINK_DOMAIN"],
    ]);
  });

  it("re-opens with the new missing list when the acknowledgement was partial", async () => {
    requestMock
      .mockResolvedValueOnce(ok(result([warn("GMAIL_CLIP")])))
      .mockRejectedValueOnce(
        ackRequired(
          [warn("GMAIL_CLIP"), warn("NEW_LINK_DOMAIN")],
          ["NEW_LINK_DOMAIN"]
        )
      )
      .mockResolvedValueOnce(ok());
    const outcomes = start(launchOptions(true));

    await screen.findByTestId("presend-warn-GMAIL_CLIP");
    await acknowledgeAndConfirm();

    const fresh = await screen.findByTestId("presend-warn-NEW_LINK_DOMAIN");
    expect(fresh).toHaveTextContent("New");
    // The earlier tick does not carry over to the new review.
    expect(screen.getByRole("button", { name: "Send anyway" })).toBeDisabled();
    await acknowledgeAndConfirm();

    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(ackBodies("/launch")).toEqual([
      ["GMAIL_CLIP"],
      ["GMAIL_CLIP", "NEW_LINK_DOMAIN"],
    ]);
  });

  it("on 422 shows the blocks and does not retry", async () => {
    requestMock.mockRejectedValueOnce(
      axiosRejection(422, {
        code: "VALIDATION_FAILED",
        errors: [
          {
            code: "SEED_PHRASE_REQUEST",
            message: "asks for a seed phrase",
            source: "presend",
          },
          { code: "SUBJECT_REQUIRED", message: "Subject is required" },
        ],
        checks: [block("SEED_PHRASE_REQUEST")],
        presend: result([block("SEED_PHRASE_REQUEST"), warn("GMAIL_CLIP")]),
      })
    );
    const outcomes = start(launchOptions(false));

    expect(
      await screen.findByTestId("presend-block-SEED_PHRASE_REQUEST")
    ).toBeInTheDocument();
    expect(screen.getByText("Subject is required")).toBeInTheDocument();
    // The `source: "presend"` copy of the block is not listed a second time.
    expect(
      screen.queryByText("asks for a seed phrase")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send anyway" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(isPresendStopped(outcomes[0].error)).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("rethrows an ordinary 422 (flag off: no checks) for the caller to report", async () => {
    requestMock.mockRejectedValueOnce(
      axiosRejection(422, {
        code: "VALIDATION_FAILED",
        errors: [{ code: "SENDER_NOT_VERIFIED", message: "not verified" }],
      })
    );
    const outcomes = start(launchOptions(false));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(isPresendStopped(outcomes[0].error)).toBe(false);
    expect(outcomes[0].error).toBeInstanceOf(Error);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancelling the review stops without launching again", async () => {
    requestMock.mockRejectedValueOnce(
      ackRequired([warn("GMAIL_CLIP")], ["GMAIL_CLIP"])
    );
    const outcomes = start(launchOptions(false));
    await screen.findByTestId("presend-warn-GMAIL_CLIP");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(isPresendStopped(outcomes[0].error)).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});

describe("usePresendGate - automation activation", () => {
  const activate: PresendRunOptions<unknown> = {
    action: "activate",
    attempt: (ack) =>
      automationService.updateAutomationStatus(
        "a1",
        { status: "active", ...(ack ? { acknowledgedWarnings: ack } : {}) },
        "org"
      ),
  };

  it("409 on activate -> review -> retries the same request with the codes", async () => {
    requestMock
      .mockRejectedValueOnce(
        ackRequired(
          [warn("CRYPTO_PHISHING_PHRASE")],
          ["CRYPTO_PHISHING_PHRASE"]
        )
      )
      .mockResolvedValueOnce(ok({ status: "active" }));
    const outcomes = start(activate);

    await screen.findByTestId("presend-warn-CRYPTO_PHISHING_PHRASE");
    await acknowledgeAndConfirm("Activate anyway");
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(outcomes[0].value).toEqual({ status: "active" });
    const calls = requestMock.mock.calls.map(
      ([c]) => c as { url: string; data: unknown }
    );
    expect(calls.map((c) => c.url)).toEqual([
      "/automations/a1/status",
      "/automations/a1/status",
    ]);
    expect(calls[1].data).toEqual({
      status: "active",
      acknowledgedWarnings: ["CRYPTO_PHISHING_PHRASE"],
    });
  });

  it("422 PRESEND_BLOCKED on activate shows blocks and does not activate", async () => {
    requestMock.mockRejectedValueOnce(
      axiosRejection(422, {
        code: "PRESEND_BLOCKED",
        message: "blocked",
        rulesetVersion: "2026-11-21.1",
        checks: [block("URL_SHORTENER")],
        presend: result([block("URL_SHORTENER")]),
      })
    );
    const outcomes = start(activate);
    expect(
      await screen.findByTestId("presend-block-URL_SHORTENER")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activate anyway" })
    ).toBeDisabled();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    });
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(isPresendStopped(outcomes[0].error)).toBe(true);
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("publish sends acknowledgedWarnings only after a confirmation", async () => {
    requestMock
      .mockRejectedValueOnce(ackRequired([warn("GMAIL_CLIP")], ["GMAIL_CLIP"]))
      .mockResolvedValueOnce(ok({ status: "active" }));
    const outcomes = start({
      action: "activate",
      attempt: (ack) => automationService.publishAutomation("a1", "org", ack),
    });
    await acknowledgeAndConfirm("Activate anyway");
    await waitFor(() => expect(outcomes).toHaveLength(1));
    expect(ackBodies("/publish")).toEqual([undefined, ["GMAIL_CLIP"]]);
  });
});
