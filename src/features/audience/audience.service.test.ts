import type { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api-client";

import { audienceService, TagBacksListsError } from "./audience.service";

const requestSpy = vi.spyOn(apiClient, "request");

/** Build an axios-shaped rejection with a `{ error: { code, ... } }` body. */
function axiosError(body: unknown): AxiosError<unknown> {
  return {
    isAxiosError: true,
    message: "Request failed",
    name: "AxiosError",
    response: { data: body, status: 400 },
  } as unknown as AxiosError<unknown>;
}

afterEach(() => {
  requestSpy.mockReset();
});

describe("audienceService.renameTag / renameSegment", () => {
  it("PATCHes the tag by id and unwraps the envelope", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { id: "t1", name: "whales" } },
    } as never);

    const res = await audienceService.renameTag("t1", "whales");

    expect(res).toEqual({ id: "t1", name: "whales" });
    const [[cfg]] = requestSpy.mock.calls;
    expect(cfg.method).toBe("PATCH");
    expect(cfg.url).toBe("/audience/tags/t1");
    expect(cfg.data).toEqual({ name: "whales" });
  });

  it("PATCHes the segment by id", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { id: "s1", name: "VIPs" } },
    } as never);

    await audienceService.renameSegment("s1", "VIPs");

    const [[cfg]] = requestSpy.mock.calls;
    expect(cfg.method).toBe("PATCH");
    expect(cfg.url).toBe("/audience/segments/s1");
    expect(cfg.data).toEqual({ name: "VIPs" });
  });
});

describe("audienceService.deleteTag", () => {
  it("omits ?force on the first try and unwraps the success body", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { deleted: true, detachedFrom: 3, listsAffected: 0 } },
    } as never);

    const res = await audienceService.deleteTag("t1");

    expect(res).toEqual({ deleted: true, detachedFrom: 3, listsAffected: 0 });
    const [[cfg]] = requestSpy.mock.calls;
    expect(cfg.method).toBe("DELETE");
    expect(cfg.url).toBe("/audience/tags/t1");
    expect(cfg.params).toBeUndefined();
  });

  it("passes ?force=true only when forced", async () => {
    requestSpy.mockResolvedValueOnce({ data: { deleted: true } } as never);

    await audienceService.deleteTag("t1", { force: true });

    expect(requestSpy.mock.calls[0][0].params).toEqual({ force: true });
  });

  it("surfaces TAG_BACKS_LISTS as a typed error carrying { code, lists }", async () => {
    requestSpy.mockRejectedValueOnce(
      axiosError({
        error: {
          code: "TAG_BACKS_LISTS",
          message: "This tag backs lists.",
          lists: [
            { id: "l1", name: "List A" },
            { id: "l2", name: "List B" },
          ],
        },
      })
    );

    const err = await audienceService.deleteTag("t1").catch((e) => e);

    expect(err).toBeInstanceOf(TagBacksListsError);
    expect(err.code).toBe("TAG_BACKS_LISTS");
    expect(err.lists).toEqual([
      { id: "l1", name: "List A" },
      { id: "l2", name: "List B" },
    ]);
  });

  it("also reads a top-level (non-nested) TAG_BACKS_LISTS body", async () => {
    requestSpy.mockRejectedValueOnce(
      axiosError({
        code: "TAG_BACKS_LISTS",
        lists: [{ id: "l9", name: "Solo" }],
      })
    );

    const err = await audienceService.deleteTag("t1").catch((e) => e);

    expect(err).toBeInstanceOf(TagBacksListsError);
    expect(err.lists).toEqual([{ id: "l9", name: "Solo" }]);
  });

  it("rejects a plain error with a friendly message (not the typed error)", async () => {
    requestSpy.mockRejectedValueOnce(
      axiosError({ error: { code: "SERVER_ERROR", message: "Boom" } })
    );

    const err = await audienceService.deleteTag("t1").catch((e) => e);

    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(TagBacksListsError);
    expect((err as Error).message).toBe("Boom");
  });
});

describe("audienceService.deleteSegment", () => {
  it("DELETEs the segment and returns contactsKept", async () => {
    requestSpy.mockResolvedValueOnce({
      data: { data: { deleted: true, contactsKept: 42 } },
    } as never);

    const res = await audienceService.deleteSegment("s1");

    expect(res).toEqual({ deleted: true, contactsKept: 42 });
    const [[cfg]] = requestSpy.mock.calls;
    expect(cfg.method).toBe("DELETE");
    expect(cfg.url).toBe("/audience/segments/s1");
  });
});
