import Link from "next/link";

import type { BlogCategory, BlogPostPage } from "../blog.types";
import { PostCard } from "./post-card";
import { PostPagination } from "./post-pagination";
import { PageShell } from "@/onchain-suite-website/components/landing/v2/shared";

/**
 * Blog index / category archive.
 *
 * Server Component. `PageShell` is a client module (it owns the animated nav and
 * footer), but children passed into it from a server parent still render on the
 * server - so none of this listing markup ships as JS.
 */
export function BlogIndexView({
  result,
  categories,
  activeCategorySlug,
  eyebrow,
  heading,
  intro,
  basePath,
}: {
  result: BlogPostPage;
  categories: BlogCategory[];
  activeCategorySlug?: string;
  eyebrow: string;
  heading: React.ReactNode;
  intro: string;
  basePath: string;
}) {
  return (
    <PageShell>
      <section className="relative overflow-hidden pb-8 pt-16 md:pt-20">
        <div className="grid-bg" />
        <div className="wrap relative max-w-3xl">
          <span className="eyebrow">{eyebrow}</span>
          <h1
            className="mt-5 font-semibold tracking-tight"
            style={{ fontSize: "clamp(2.1rem, 4.4vw, 3rem)", lineHeight: 1.08 }}
          >
            {heading}
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed t-muted">
            {intro}
          </p>
        </div>
      </section>

      {categories.length > 0 ? (
        <section className="pb-8">
          <div className="wrap">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className="chip"
                aria-current={activeCategorySlug ? undefined : "page"}
                style={
                  activeCategorySlug
                    ? undefined
                    : { borderColor: "var(--acc)", color: "var(--acc)" }
                }
              >
                All
              </Link>
              {categories.map((category) =>
                category.slug ? (
                  <Link
                    key={category.id}
                    href={`/blog/category/${category.slug}`}
                    className="chip"
                    aria-current={
                      category.slug === activeCategorySlug ? "page" : undefined
                    }
                    style={
                      category.slug === activeCategorySlug
                        ? { borderColor: "var(--acc)", color: "var(--acc)" }
                        : undefined
                    }
                  >
                    {category.title}
                  </Link>
                ) : null
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="pb-20">
        <div className="wrap">
          {result.posts.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-[15px] t-muted">
                No posts published yet. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.posts.map((post, index) => (
                <PostCard key={post.id} post={post} priority={index === 0} />
              ))}
            </div>
          )}

          <PostPagination
            basePath={basePath}
            page={result.page}
            totalPages={result.totalPages}
          />
        </div>
      </section>
    </PageShell>
  );
}
