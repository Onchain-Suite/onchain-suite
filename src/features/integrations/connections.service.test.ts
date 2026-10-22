import type { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import {
  ConnectionsError,
  connectionsService,
  NOT_DEPLOYED_MESSAGE,
} from "./connections.service";

const requestSpy = vi.spyOn(apiClient, "request");

function axiosError(status: number, body: unknown): AxiosError<unknown> {
  return {
    isAxiosError: true,
    message: "Request failed",
    name: "AxiosError",
    response: { data: body, status },
  } as unknown as AxiosError<unknown>;
}

afterEach(() => {
  requestSpy.mockReset();
});

describe("connectionsService.save", () => {
  it("PUTs the credential to the connector and unwraps the envelope", async () => {
    requestSpy.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          connector: "privy",
          kind: "source",
          config: { appName: "App" },
          fingerprint: "f",
          verified: true,
          verifiedAt: "2026-10-22T00:00:00Z",
          lastError: null,
          updatedAt: "2026-10-22T00:00:00Z",
        },
      },
    } as never);

    const conn = await connectionsService.save(
      "privy",
      { appId: "a", appSecret: "s" },
      "org1"
    );

    expect(conn.verified).toBe(true);
    const [[cfg]] = requestSpy.mock.calls;
    expect(cfg.method).toBe("PUT");
    expect(cfg.url).toBe("/organization/connections/privy");
    expect(cfg.data).toEqual({ appId: "a", appSecret: "s" });
    expect(cfg.headers).toMatchObject({ "x-org-id": "org1" });
  });

  it("returns a rejected credential as data, not an error", async () => {
    requestSpy.mockResolvedValueOnce({
      data: {
        data: {
          connector: "telegram",
          verified: false,
          verifiedAt: null,
          lastError: "Unauthorized",
        },
      },
    } as never);
    const conn = await connectionsService.save("telegram", { botToken: "t" });
    expect(conn.verified).toBe(false);
    expect(conn.lastError).toBe("Unauthorized");
  });
});

describe("errors", () => {
  it("turns a 404 into a not-on-this-server error", async () => {
    requestSpy.mockRejectedValueOnce(axiosError(404, {}));
    const err = await connectionsService.list().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConnectionsError);
    expect((err as ConnectionsError).code).toBe("NOT_DEPLOYED");
    expect((err as ConnectionsError).message).toBe(NOT_DEPLOYED_MESSAGE);
  });

  it("keeps the backend's code and message", async () => {
    requestSpy.mockRejectedValueOnce(
      axiosError(400, {
        success: false,
        error: {
          code: "UNKNOWN_CONNECTOR",
          message: 'No connector named "x".',
        },
      })
    );
    const err = (await connectionsService
      .save("x", {})
      .catch((e: unknown) => e)) as ConnectionsError;
    expect(err.code).toBe("UNKNOWN_CONNECTOR");
    expect(err.message).toBe('No connector named "x".');
  });

  it("joins validation messages", async () => {
    requestSpy.mockRejectedValueOnce(
      axiosError(400, { error: { message: ["cursor too long", "bad"] } })
    );
    const err = (await connectionsService
      .migrate("kit", { cursor: "x" })
      .catch((e: unknown) => e)) as ConnectionsError;
    expect(err.message).toBe("cursor too long bad");
  });
});

describe("runs", () => {
  it("posts a migration slice with a long timeout and the abort signal", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { scanned: 5, hasMore: true, nextCursor: "c" } },
    } as never);
    const ctrl = new AbortController();
    const r = await connectionsService.migrate(
      "hubspot",
      { cursor: "a" },
      ctrl.signal
    );
    expect(r.nextCursor).toBe("c");
    const [[cfg]] = requestSpy.mock.calls;
    expect(cfg.url).toBe("/organization/integrations/hubspot/migrate");
    expect(cfg.signal).toBe(ctrl.signal);
    expect(cfg.timeout).toBe(120_000);
  });

  it("syncs Google Sheets at its own route", async () => {
    requestSpy.mockResolvedValueOnce({ data: { data: { rows: 2 } } } as never);
    await connectionsService.syncData("google-sheets");
    expect(requestSpy.mock.calls[0]?.[0].url).toBe(
      "/organization/integrations/google-sheets/sync"
    );
  });

  it("URL-encodes the Iterable job id", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { jobId: "iterable:o1", state: "active" } },
    } as never);
    await connectionsService.iterableStatus("iterable:o1");
    expect(requestSpy.mock.calls[0]?.[0].url).toBe(
      "/organization/integrations/iterable/migrate/iterable%3Ao1"
    );
  });
});

describe("oauthAuthorizeUrl", () => {
  it("navigates through the proxy with the org as a query param", () => {
    expect(connectionsService.oauthAuthorizeUrl("hubspot", "org 1")).toBe(
      "/api/v1/organization/integrations/oauth/hubspot/authorize?orgId=org%201"
    );
  });
});
