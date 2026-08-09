import { notFound } from "next/navigation";

import { getPreviewPostDocBySlug } from "@/onchain-suite-website/blog/blog.service";
import { LivePreviewPost } from "@/onchain-suite-website/blog/components/live-preview-post";

/**
 * Draft preview target for the Payload admin's live-preview pane and the
 * "Preview" button on a post.
 *
 * Always dynamic: a preview that could be served from cache would show a stale
 * draft, which defeats the entire purpose.
 */
export const dynamic = "force-dynamic";

/** Never index drafts, and never follow links out of a preview. */
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function BlogPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  const [{ slug }, { secret }] = await Promise.all([params, searchParams]);

  const expected = process.env.PAYLOAD_PREVIEW_SECRET;

  // Fail closed. Without a configured secret there is no way to authorise a
  // request, so the route must not serve unpublished content at all.
  if (!expected || secret !== expected) {
    notFound();
  }

  const doc = await getPreviewPostDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return <LivePreviewPost initialPost={doc} />;
}
