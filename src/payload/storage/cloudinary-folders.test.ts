/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  basenameOf,
  CLOUDINARY_ROOT,
  folderFor,
  folderOf,
  postFolderSegment,
  sanitizeFolderSegment,
  segmentOf,
  shouldMove,
  targetPublicId,
  UNASSIGNED_SEGMENT,
} from "@/payload/storage/cloudinary-folders";

const unassigned = (name: string) =>
  `${CLOUDINARY_ROOT}/${UNASSIGNED_SEGMENT}/${name}`;

describe("sanitizeFolderSegment", () => {
  it("keeps a normal slug intact", () => {
    expect(sanitizeFolderSegment("wallet-first-retention")).toBe(
      "wallet-first-retention"
    );
  });

  it("strips slashes so one post can never span nested folders", () => {
    expect(sanitizeFolderSegment("a/b/c")).toBe("a-b-c");
  });

  it("normalises spaces, case and punctuation", () => {
    expect(sanitizeFolderSegment("  Hello World!  ")).toBe("hello-world");
    expect(sanitizeFolderSegment("a---b")).toBe("a-b");
    expect(sanitizeFolderSegment("--edge--")).toBe("edge");
  });

  it("falls back rather than producing an empty folder name", () => {
    expect(sanitizeFolderSegment("")).toBe("untitled");
    expect(sanitizeFolderSegment("///")).toBe("untitled");
    expect(sanitizeFolderSegment("!!!")).toBe("untitled");
    expect(sanitizeFolderSegment(null)).toBe("untitled");
    expect(sanitizeFolderSegment(undefined)).toBe("untitled");
    expect(sanitizeFolderSegment(42)).toBe("untitled");
  });

  it("caps length and never leaves a trailing dash", () => {
    const long = sanitizeFolderSegment("a".repeat(200));
    expect(long.length).toBe(80);

    const sliced = sanitizeFolderSegment(`${"a".repeat(79)}-tail`);
    expect(sliced.endsWith("-")).toBe(false);
  });
});

describe("postFolderSegment", () => {
  it("prefers the slug", () => {
    expect(postFolderSegment({ id: 7, slug: "my-post" })).toBe("my-post");
  });

  it("falls back to the id when there is no usable slug", () => {
    // Happens for a post saved before the slug hook has produced a value.
    expect(postFolderSegment({ id: 7, slug: "" })).toBe("post-7");
    expect(postFolderSegment({ id: 7 })).toBe("post-7");
    expect(postFolderSegment({ id: "abc", slug: "   " })).toBe("post-abc");
  });

  it("falls back again when there is neither", () => {
    expect(postFolderSegment({})).toBe("untitled");
    expect(postFolderSegment({ id: null, slug: null })).toBe("untitled");
  });
});

describe("path helpers", () => {
  it("splits a public id into folder and basename", () => {
    const id = unassigned("hero");
    expect(basenameOf(id)).toBe("hero");
    expect(folderOf(id)).toBe(`${CLOUDINARY_ROOT}/${UNASSIGNED_SEGMENT}`);
  });

  it("handles a bare public id with no folder", () => {
    expect(basenameOf("hero")).toBe("hero");
    expect(folderOf("hero")).toBe("");
  });

  it("reads the segment under the blog root", () => {
    expect(segmentOf(unassigned("hero"))).toBe(UNASSIGNED_SEGMENT);
    expect(segmentOf(`${CLOUDINARY_ROOT}/my-post/hero`)).toBe("my-post");
  });

  it("reports an empty segment for an asset loose in the blog root", () => {
    expect(segmentOf(`${CLOUDINARY_ROOT}/hero`)).toBe("");
  });

  it("returns null for anything outside the blog root", () => {
    expect(segmentOf("onchainsuite/branding/logo")).toBeNull();
    expect(segmentOf("someone-else/hero")).toBeNull();
    expect(segmentOf("hero")).toBeNull();
  });

  it("builds the destination while keeping the file's own name", () => {
    expect(targetPublicId(unassigned("hero"), "my-post")).toBe(
      `${CLOUDINARY_ROOT}/my-post/hero`
    );
  });

  it("folderFor composes with the root", () => {
    expect(folderFor("my-post")).toBe(`${CLOUDINARY_ROOT}/my-post`);
  });
});

describe("shouldMove", () => {
  it("moves a freshly uploaded asset out of the holding folder", () => {
    expect(shouldMove(unassigned("hero"), "my-post")).toBe(true);
  });

  it("moves an asset left loose in the blog root", () => {
    // Assets uploaded before per-post folders existed.
    expect(shouldMove(`${CLOUDINARY_ROOT}/hero`, "my-post")).toBe(true);
  });

  it("does nothing when the asset is already in the right folder", () => {
    // Without this, every save of every post would issue a rename.
    expect(shouldMove(`${CLOUDINARY_ROOT}/my-post/hero`, "my-post")).toBe(
      false
    );
  });

  it("leaves an asset that another post already claimed", () => {
    // The same image can be on two posts; one folder cannot hold it twice, so
    // first claim wins rather than the two posts fighting over it on every save.
    expect(shouldMove(`${CLOUDINARY_ROOT}/other-post/hero`, "my-post")).toBe(
      false
    );
  });

  it("never touches assets outside the blog root", () => {
    // The product's own branding uploads share this Cloudinary account.
    expect(shouldMove("onchainsuite/branding/logo", "my-post")).toBe(false);
    expect(shouldMove("random/hero", "my-post")).toBe(false);
    expect(shouldMove("hero", "my-post")).toBe(false);
  });

  it("is idempotent — moving, then re-checking, is a no-op", () => {
    const from = unassigned("hero");
    const to = targetPublicId(from, "my-post");
    expect(shouldMove(from, "my-post")).toBe(true);
    expect(shouldMove(to, "my-post")).toBe(false);
  });
});
