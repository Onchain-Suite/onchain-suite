import { ClockIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import Link from "next/link";

import { formatPostDate, toIsoDate } from "../../blog.format";
import type { BlogPost } from "../../blog.types";
import { AuthorAvatar } from "./author-avatar";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Updated" only when an edit landed at least a day after publishing. */
function updatedLabel(post: BlogPost): string {
  if (!post.publishedAt) return "";
  const published = Date.parse(post.publishedAt);
  const updated = Date.parse(post.updatedAt);
  if (Number.isNaN(published) || Number.isNaN(updated)) return "";
  return updated - published >= DAY_MS ? formatPostDate(post.updatedAt) : "";
}

/** Title block: categories, title, standfirst, byline and the cover image. */
export function ArticleHeader({ post }: { post: BlogPost }) {
  const published = formatPostDate(post.publishedAt);
  const updated = updatedLabel(post);
  const shownAuthors = post.authors.slice(0, 3);

  return (
    <header className="ba-header">
      <Link href="/blog" className="text-[13px] t-muted hover:underline">
        ← All posts
      </Link>

      {post.categories.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {post.categories.map((category) =>
            category.slug ? (
              <Link
                key={category.id}
                href={`/blog/category/${category.slug}`}
                className="chip"
              >
                {category.title}
              </Link>
            ) : (
              <span key={category.id} className="chip">
                {category.title}
              </span>
            )
          )}
        </div>
      ) : null}

      <h1 className="ba-title mt-5 font-semibold tracking-tight t-ink">
        {post.title}
      </h1>

      <p className="mt-5 text-[17px] leading-relaxed t-muted">{post.excerpt}</p>

      <div className="ba-byline">
        {shownAuthors.length > 0 ? (
          <span className="ba-avatars">
            {shownAuthors.map((author) => (
              <AuthorAvatar key={author.id} author={author} size={32} />
            ))}
          </span>
        ) : null}
        <div className="flex flex-col gap-0.5">
          {post.authors.length > 0 ? (
            <span className="text-[14px] font-medium t-ink">
              {post.authors.map((author) => author.name).join(", ")}
            </span>
          ) : null}
          <span className="flex flex-wrap items-center gap-x-2 text-[13px] t-muted2">
            {published ? (
              <time dateTime={toIsoDate(post.publishedAt)}>{published}</time>
            ) : null}
            {updated ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated{" "}
                  <time dateTime={toIsoDate(post.updatedAt)}>{updated}</time>
                </span>
              </>
            ) : null}
            {published || updated ? <span aria-hidden="true">·</span> : null}
            <span className="inline-flex items-center gap-1">
              <ClockIcon aria-hidden="true" className="size-3.5" />
              {post.readingTimeMinutes} min read
            </span>
          </span>
        </div>
      </div>

      {post.coverImage?.url ? (
        <Image
          src={post.coverImage.url}
          alt={post.coverImage.alt}
          width={post.coverImage.width ?? 1600}
          height={post.coverImage.height ?? 900}
          sizes="(min-width: 1200px) 736px, 100vw"
          className="mt-10 w-full rounded-[var(--r-lg)] bd"
          priority
        />
      ) : null}
    </header>
  );
}
