import { JumpLink } from "@/onchain-suite-website/components/retention-playbook/jump-link";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";
import { sectionAnchor } from "@/onchain-suite-website/utils/playbook-toc";

/**
 * A chapter's opening: numbered kicker, title (focused after a jump),
 * standfirst and a contents box linking to its sections.
 */
export function ChapterHead({ chapter }: { chapter: Chapter }) {
  return (
    <header className="rp-chap-head">
      <p className="rp-chap-kicker">{chapter.kicker}</p>
      <h2
        className="rp-chap-title"
        id={`${chapter.id}-title`}
        tabIndex={-1}
        data-jump-focus
      >
        {chapter.title}
      </h2>
      <p className="rp-chap-dek">{chapter.dek}</p>
      <nav
        className="rp-contents"
        aria-label={`${chapter.title}: ${UI.contents}`}
      >
        <p className="rp-contents-k">{UI.contents}</p>
        <ol>
          {chapter.sections.map((s) => (
            <li key={s.id}>
              <JumpLink target={sectionAnchor(chapter.id, s.id)}>
                {s.title}
              </JumpLink>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
