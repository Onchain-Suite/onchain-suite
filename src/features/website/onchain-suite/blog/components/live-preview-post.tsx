"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import { useMemo } from "react";

import { toPost } from "../blog.mappers";
import { BlogPostView } from "./blog-post-view";
import type { Post } from "@/payload-types";

/**
 * Live-preview wrapper for the draft route.
 *
 * This is the only client component in the blog feature, and it exists solely so
 * the admin's preview pane updates as an editor types. The published routes
 * render the same `BlogPostView` entirely on the server, so none of this reaches
 * a real reader (CLAUDE.md §1: keep the client boundary at the leaf).
 */
export function LivePreviewPost({ initialPost }: { initialPost: Post }) {
  const { data } = useLivePreview<Post>({
    initialData: initialPost,
    // Payload is mounted in this same app, so its origin is our origin.
    serverURL:
      process.env.NEXT_PUBLIC_SERVER_URL ??
      (typeof window === "undefined" ? "" : window.location.origin),
    // Must match `routes.api` in payload.config.ts — the default /api is taken
    // by this app's own handlers.
    apiRoute: "/cms-api",
    depth: 1,
  });

  // Mapping walks the whole Lexical tree to count words, so it must not re-run
  // on every unrelated render — only when the document actually changes.
  const post = useMemo(() => toPost(data), [data]);

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-50 px-4 py-2 text-center text-[12.5px] font-medium"
        style={{ background: "var(--acc)", color: "#fff" }}
      >
        Draft preview — not publicly visible
      </div>
      <BlogPostView post={post} />
    </>
  );
}
