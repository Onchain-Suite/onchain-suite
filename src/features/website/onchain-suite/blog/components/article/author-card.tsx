import type { BlogAuthor } from "../../blog.types";
import { farcasterProfileUrl, xProfileUrl } from "../../utils/share";
import { AuthorAvatar } from "./author-avatar";

/**
 * "Written by" card at the end of the article: photo, bio and the author's
 * own X and Farcaster profiles (already in the CMS, previously unused).
 */
export function AuthorCard({ author }: { author: BlogAuthor }) {
  const x = xProfileUrl(author.x);
  const farcaster = farcasterProfileUrl(author.farcaster);

  return (
    <section className="ba-author card" aria-label={`About ${author.name}`}>
      <AuthorAvatar author={author} size={52} />
      <div className="min-w-0">
        <p className="text-[12px] font-medium uppercase tracking-wide t-muted2">
          Written by
        </p>
        <p className="mt-0.5 text-[16px] font-semibold t-ink">{author.name}</p>
        {author.bio ? (
          <p className="mt-2 text-[14.5px] leading-relaxed t-muted">
            {author.bio}
          </p>
        ) : null}
        {x || farcaster ? (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
            {x ? (
              <a
                href={x}
                target="_blank"
                rel="noopener noreferrer"
                className="t-acc hover:underline"
              >
                X
              </a>
            ) : null}
            {farcaster ? (
              <a
                href={farcaster}
                target="_blank"
                rel="noopener noreferrer"
                className="t-acc hover:underline"
              >
                Farcaster
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}
