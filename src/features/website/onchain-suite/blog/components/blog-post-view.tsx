import Image from "next/image";
import Link from "next/link";

import { formatPostDate, toIsoDate } from "../blog.format";
import type { BlogPost } from "../blog.types";
import { BlogRichText } from "./rich-text";
import { PageShell } from "@/onchain-suite-website/components/landing/v2/shared";

/**
 * A single post. Server Component: the entire article, including the rich-text
 * body, is rendered on the server and ships zero JS of its own.
 */
export function BlogPostView({ post }: { post: BlogPost }) {
  const published = formatPostDate(post.publishedAt);

  return (
    <PageShell>
      <article>
        <section className="relative overflow-hidden pb-8 pt-16 md:pt-20">
          <div className="grid-bg" />
          <div className="wrap relative max-w-3xl">
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

            <h1
              className="mt-5 font-semibold tracking-tight t-ink"
              style={{
                fontSize: "clamp(2rem, 4.2vw, 2.85rem)",
                lineHeight: 1.1,
              }}
            >
              {post.title}
            </h1>

            <p className="mt-5 text-[16px] leading-relaxed t-muted">
              {post.excerpt}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] t-muted2">
              {post.authors.length > 0 ? (
                <span className="t-ink2">
                  {post.authors.map((author) => author.name).join(", ")}
                </span>
              ) : null}
              {published ? (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={toIsoDate(post.publishedAt)}>
                    {published}
                  </time>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>{post.readingTimeMinutes} min read</span>
            </div>
          </div>
        </section>

        {post.coverImage?.url ? (
          <section className="pb-10">
            <div className="wrap max-w-3xl">
              <Image
                src={post.coverImage.url}
                alt={post.coverImage.alt}
                width={post.coverImage.width ?? 1600}
                height={post.coverImage.height ?? 900}
                sizes="(min-width: 768px) 720px, 100vw"
                className="w-full rounded-[var(--r-lg)] bd"
                priority
              />
            </div>
          </section>
        ) : null}

        <section className="pb-16">
          <div className="wrap max-w-3xl">
            <BlogRichText content={post.content} />
          </div>
        </section>

        {post.tags.length > 0 ? (
          <section className="pb-20">
            <div className="wrap max-w-3xl">
              <div className="rule mb-6 h-px" />
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </article>
    </PageShell>
  );
}
