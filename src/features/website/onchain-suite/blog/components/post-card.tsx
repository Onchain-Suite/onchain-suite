import Image from "next/image";
import Link from "next/link";

import { formatPostDate, toIsoDate } from "../blog.format";
import type { BlogPostSummary } from "../blog.types";

/**
 * One post on the index / category listing. Server Component — a card is pure
 * presentation, so there is no reason to ship it to the browser.
 */
export function PostCard({
  post,
  priority = false,
}: {
  post: BlogPostSummary;
  /** Set on the first card only, so the above-the-fold image is not lazy-loaded. */
  priority?: boolean;
}) {
  const published = formatPostDate(post.publishedAt);

  return (
    <article className="card overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="block">
        {post.coverImage?.url ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src={post.coverImage.url}
              alt={post.coverImage.alt}
              fill
              sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
              priority={priority}
            />
          </div>
        ) : null}

        <div className="p-5">
          {post.categories.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <span key={category.id} className="chip">
                  {category.title}
                </span>
              ))}
            </div>
          ) : null}

          <h2 className="text-[17px] font-semibold leading-snug t-ink">
            {post.title}
          </h2>

          <p className="mt-2 line-clamp-3 text-[14.5px] leading-relaxed t-muted">
            {post.excerpt}
          </p>

          <div className="mt-4 flex items-center gap-2 text-[12.5px] t-muted2">
            {published ? (
              <time dateTime={toIsoDate(post.publishedAt)}>{published}</time>
            ) : null}
            {published ? <span aria-hidden="true">·</span> : null}
            <span>{post.readingTimeMinutes} min read</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
