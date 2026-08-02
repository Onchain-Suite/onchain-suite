/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import { cleanupPostMedia } from "@/payload/hooks/cleanup-post-media";

/**
 * A post document as the hook receives it. `coverImage` is an id at depth 0.
 */
const post = (id: number, coverImage?: number, bodyMedia: number[] = []) => ({
  content: {
    root: {
      children: bodyMedia.map((value) => ({
        relationTo: "media",
        type: "upload",
        value,
      })),
    },
  },
  coverImage,
  id,
});

/**
 * Minimal Payload stand-in. Only `find` (to enumerate surviving posts), `delete`
 * and the logger are exercised.
 */
function mockPayload({
  survivingPosts = [] as unknown[],
  deleteImpl,
  pages = 1,
}: {
  deleteImpl?: (args: { id: number | string }) => Promise<unknown>;
  pages?: number;
  survivingPosts?: unknown[];
} = {}) {
  const deleted: Array<number | string> = [];
  let pageCalls = 0;

  const payload = {
    delete: vi.fn(async (args: { id: number | string }) => {
      if (deleteImpl) {
        return deleteImpl(args);
      }
      deleted.push(args.id);
      return { id: args.id };
    }),
    find: vi.fn(async () => {
      pageCalls += 1;
      return {
        docs: survivingPosts,
        hasNextPage: pageCalls < pages,
      };
    }),
    logger: { info: vi.fn(), warn: vi.fn() },
  };

  return { deleted, payload };
}

const run = (doc: unknown, payload: unknown) =>
  (
    cleanupPostMedia as unknown as (args: {
      doc: unknown;
      req: { payload: unknown };
    }) => Promise<unknown>
  )({ doc, req: { payload } });

describe("cleanupPostMedia", () => {
  it("deletes media no surviving post references", async () => {
    const { deleted, payload } = mockPayload({ survivingPosts: [post(2)] });
    await run(post(1, 10, [11]), payload);
    expect(deleted.sort()).toEqual([10, 11]);
  });

  it("KEEPS media another post still uses", async () => {
    // The whole point: deleting a post must not break a different live post that
    // shares the image.
    const { deleted, payload } = mockPayload({
      survivingPosts: [post(2, 10)],
    });
    await run(post(1, 10, [11]), payload);
    expect(deleted).toEqual([11]);
    expect(deleted).not.toContain(10);
  });

  it("counts a reference from another post's rich text, not just its cover", async () => {
    const { deleted, payload } = mockPayload({
      survivingPosts: [post(2, undefined, [10])],
    });
    await run(post(1, 10), payload);
    expect(deleted).toEqual([]);
  });

  it("counts drafts as references", async () => {
    // An unpublished post legitimately references its images; deleting them
    // would break it the moment it is published.
    const { payload } = mockPayload({ survivingPosts: [post(2, 10)] });
    await run(post(1, 10), payload);
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true })
    );
  });

  it("excludes the deleted post itself from the reference scan", async () => {
    const { payload } = mockPayload();
    await run(post(1, 10), payload);
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { not_equals: 1 } } })
    );
  });

  it("does nothing when the post had no media", async () => {
    const { deleted, payload } = mockPayload();
    await run(post(1), payload);
    expect(deleted).toEqual([]);
    expect(payload.find).not.toHaveBeenCalled();
  });

  it("deletes nothing when the reference scan cannot be completed", async () => {
    // An incomplete reference set is indistinguishable from "unused", so the
    // safe reading is to keep everything.
    const { deleted, payload } = mockPayload({ pages: 999 });
    await run(post(1, 10), payload);
    expect(deleted).toEqual([]);
    expect(payload.logger.warn).toHaveBeenCalled();
  });

  it("survives a failing delete without throwing", async () => {
    const { payload } = mockPayload({
      deleteImpl: async () => {
        throw new Error("cloudinary unreachable");
      },
    });
    await expect(run(post(1, 10), payload)).resolves.toBeDefined();
    expect(payload.logger.warn).toHaveBeenCalled();
  });

  it("survives a failing scan without throwing", async () => {
    const payload = {
      delete: vi.fn(),
      find: vi.fn(async () => {
        throw new Error("db down");
      }),
      logger: { info: vi.fn(), warn: vi.fn() },
    };
    await expect(run(post(1, 10), payload)).resolves.toBeDefined();
    expect(payload.delete).not.toHaveBeenCalled();
    expect(payload.logger.warn).toHaveBeenCalled();
  });

  it("deletes each media item only once", async () => {
    // The same id can appear as both cover and body image.
    const { deleted, payload } = mockPayload();
    await run(post(1, 10, [10, 10]), payload);
    expect(deleted).toEqual([10]);
  });
});
