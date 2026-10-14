import type { ReactNode } from "react";

import {
  BlockList,
  renderBlocks,
} from "@/onchain-suite-website/components/retention-playbook/blocks/block-list";
import { ChapterHead } from "@/onchain-suite-website/components/retention-playbook/chapter-head";
import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type {
  Chapter,
  ChapterSection,
} from "@/onchain-suite-website/types/retention-playbook";
import { createGlossaryTracker } from "@/onchain-suite-website/utils/glossary-marker";
import { sectionAnchor } from "@/onchain-suite-website/utils/playbook-toc";

function SectionBody({ section }: { section: ChapterSection }) {
  // One tracker per section: a term is underlined on its first use here.
  const g = createGlossaryTracker();
  if (section.whw) {
    // Eager, in reading order: What, then How, then Why.
    const what = g.mark(section.whw.what);
    const how = renderBlocks(section.whw.how, g);
    const why = g.mark(section.whw.why);
    return (
      <div className="rp-whw">
        <div className="rp-whw-row">
          <p className="rp-whw-k">{UI.what}</p>
          <div className="rp-whw-v">
            <p className="rp-p">
              <RichText segments={what} />
            </p>
          </div>
        </div>
        <div className="rp-whw-row">
          <p className="rp-whw-k">{UI.how}</p>
          <div className="rp-whw-v">{how}</div>
        </div>
        <div className="rp-whw-row">
          <p className="rp-whw-k">{UI.why}</p>
          <div className="rp-whw-v">
            <p className="rp-p">
              <RichText segments={why} />
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <BlockList blocks={section.blocks ?? []} g={g} />;
}

/** One chapter: its opening, an optional TLDR, then its sections. */
export function ChapterShell({
  chapter,
  footer,
}: {
  chapter: Chapter;
  footer?: ReactNode;
}) {
  const titleId = `${chapter.id}-title`;
  const tldrTracker = createGlossaryTracker();
  const tldr = chapter.tldr?.map((p) => ({
    key: p,
    segments: tldrTracker.mark(p),
  }));
  return (
    <article id={chapter.id} className="rp-chapter" aria-labelledby={titleId}>
      <ChapterHead chapter={chapter} />

      {tldr && (
        <div className="rp-tldr">
          <p className="rp-tldr-k">{UI.tldr}</p>
          {tldr.map((p) => (
            <p key={p.key} className="rp-p">
              <RichText segments={p.segments} />
            </p>
          ))}
        </div>
      )}

      {chapter.sections.map((s) => {
        const id = sectionAnchor(chapter.id, s.id);
        return (
          <section
            key={s.id}
            id={id}
            className="rp-sec2"
            aria-labelledby={`${id}-h`}
          >
            <h3 className="rp-h3x" id={`${id}-h`} tabIndex={-1} data-jump-focus>
              {s.title}
            </h3>
            <SectionBody section={s} />
          </section>
        );
      })}
      {footer}
    </article>
  );
}
