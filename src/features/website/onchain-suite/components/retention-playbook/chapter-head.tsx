import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";

/** A sector page's opening: the title and one line of standfirst. Nothing else. */
export function ChapterHead({ chapter }: { chapter: Chapter }) {
  return (
    <header className="rp-chap-head">
      <h1
        className="rp-chap-title"
        id={`${chapter.id}-title`}
        tabIndex={-1}
        data-jump-focus
      >
        {chapter.title}
      </h1>
      <p className="rp-chap-dek">{chapter.dek}</p>
    </header>
  );
}
