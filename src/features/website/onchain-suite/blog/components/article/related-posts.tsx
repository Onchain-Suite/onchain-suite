import type { BlogPostSummary } from "../../blog.types";
import { PostCard } from "../post-card";

/** "Keep reading": up to three posts, same category first. */
export function RelatedPosts({ posts }: { posts: BlogPostSummary[] }) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="ba-related" aria-labelledby="keep-reading">
      <h2
        id="keep-reading"
        className="text-[22px] font-semibold tracking-tight t-ink"
      >
        Keep reading
      </h2>
      <div className="ba-related-grid">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
