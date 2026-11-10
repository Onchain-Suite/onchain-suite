import "./article/article.css";
import "./article/article-outline.css";
import { getPostUrl } from "../blog.seo";
import type { BlogPost, BlogPostSummary } from "../blog.types";
import { buildOutline, MIN_OUTLINE_ITEMS } from "../utils/outline";
import { ArticleHeader } from "./article/article-header";
import { ArticleOutline } from "./article/article-outline";
import { ArticleOutlineMobile } from "./article/article-outline-mobile";
import { AuthorCard } from "./article/author-card";
import { ReadingProgress } from "./article/reading-progress";
import { RelatedPosts } from "./article/related-posts";
import { ShareActions } from "./article/share-actions";
import { BlogShell } from "./blog-shell";
import { BlogRichText } from "./rich-text";

/** The element the progress bar, minutes-left and outline measure against. */
const BODY_ID = "article-body";

/**
 * A single post, laid out for long-form reading:
 *
 *   [ outline ]  [ header / body / author ]  [ share ]
 *
 * The side columns are pinned and only appear on wide screens; below that the
 * outline collapses into a bar under the navbar and sharing moves to the end.
 *
 * Everything here renders on the server except four small islands (progress
 * bar, outline, share and code copy), which only read scroll position. Kept
 * synchronous on purpose: the live-preview route renders this same view on
 * the client, so data such as `related` is fetched by the route and passed in.
 */
export function BlogPostView({
  post,
  related = [],
}: {
  post: BlogPost;
  related?: BlogPostSummary[];
}) {
  const outline = buildOutline(post.content);
  const showOutline = outline.items.length >= MIN_OUTLINE_ITEMS;
  const url = getPostUrl(post.slug);

  return (
    <BlogShell>
      <ReadingProgress bodyId={BODY_ID} />

      <article className="ba">
        <div className="ba-bg" aria-hidden="true">
          <div className="grid-bg" />
        </div>

        <div className="ba-grid">
          <aside className="ba-side" aria-label="Article outline">
            {showOutline ? (
              <div className="ba-sticky">
                <ArticleOutline items={outline.items} bodyId={BODY_ID} />
              </div>
            ) : null}
          </aside>

          <div className="ba-main">
            <ArticleHeader post={post} />

            {showOutline ? (
              <ArticleOutlineMobile items={outline.items} bodyId={BODY_ID} />
            ) : null}

            <div id={BODY_ID} className="ba-body">
              <BlogRichText content={post.content} outline={outline} />
            </div>

            {post.tags.length > 0 ? (
              <div className="ba-tags">
                {post.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="ba-share-end">
              <p className="text-[14px] font-medium t-ink">
                Share this article
              </p>
              <ShareActions url={url} title={post.title} layout="row" />
            </div>

            {post.authors.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>

          <aside className="ba-side" aria-label="Share this article">
            <div className="ba-sticky ba-rail">
              <ShareActions url={url} title={post.title} layout="column" />
            </div>
          </aside>
        </div>

        <RelatedPosts posts={related} />
      </article>
    </BlogShell>
  );
}
