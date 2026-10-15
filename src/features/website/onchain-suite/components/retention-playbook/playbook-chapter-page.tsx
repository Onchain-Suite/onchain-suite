import "./playbook-styles";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { ChapterShell } from "@/onchain-suite-website/components/retention-playbook/chapter-shell";
import { InitialHashScroll } from "@/onchain-suite-website/components/retention-playbook/initial-hash-scroll";
import { PlaybookBack } from "@/onchain-suite-website/components/retention-playbook/playbook-back";
import { PlaybookEnd } from "@/onchain-suite-website/components/retention-playbook/playbook-end";
import { handFont } from "@/onchain-suite-website/components/retention-playbook/playbook-fonts";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { PlaybookMobileBar } from "@/onchain-suite-website/components/retention-playbook/playbook-mobile-bar";
import { PlaybookRail } from "@/onchain-suite-website/components/retention-playbook/playbook-rail";
import { ReadingProgress } from "@/onchain-suite-website/components/retention-playbook/reading-progress";
import { ClosingChapter } from "@/onchain-suite-website/components/retention-playbook/sections/closing-chapter";
import { NextStepSection } from "@/onchain-suite-website/components/retention-playbook/sections/next-step-section";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import {
  PLAYBOOK_CHAPTERS,
  PLAYBOOK_TOC_LABELS,
} from "@/onchain-suite-website/data/playbooks";
import {
  CLOSING,
  NEXT_STEP,
} from "@/onchain-suite-website/data/retention-playbook";
import type {
  CategoryId,
  PlaybookChapter,
} from "@/onchain-suite-website/types/retention-playbook";
import {
  buildToc,
  type TocChapter,
} from "@/onchain-suite-website/utils/playbook-toc";

const NEXT_STEP_ENTRY = {
  id: NEXT_STEP.id,
  number: NEXT_STEP.number,
  kicker: "",
  title: NEXT_STEP.title,
  dek: "",
  sections: [],
};

/**
 * Contents for each playbook page, built once on the server: the playbook
 * itself, working with us, then the closing call to action. Everything is on
 * the page, so every entry scrolls.
 */
const TOCS = Object.fromEntries(
  PLAYBOOK_CHAPTERS.map((c) => [
    c.id,
    buildToc([
      { ...c, tocLabel: PLAYBOOK_TOC_LABELS[c.id] },
      CLOSING,
      NEXT_STEP_ENTRY,
    ]),
  ])
) as Record<CategoryId, TocChapter[]>;

/**
 * /retention-playbook/[category]: one playbook on its own page, followed by
 * working with us and the call to action, so a prospect sent straight here has
 * the whole programme and the answers they ask for without going back.
 */
export function PlaybookChapterPage({
  chapter,
  client,
}: {
  chapter: PlaybookChapter;
  client: string | null;
}) {
  const toc = TOCS[chapter.id];
  return (
    <NsShell>
      <div className={`rp-page ${handFont.variable}`}>
        <InitialHashScroll />
        <PlaybookHeader />
        <ReadingProgress />
        <div className="wrap rp">
          <PlaybookBack client={client} />
          <div className="rp-grid">
            <PlaybookRail toc={toc} />
            <div className="rp-main">
              <PlaybookMobileBar toc={toc} />
              <ChapterShell
                chapter={chapter}
                footer={<PlaybookEnd id={chapter.id} />}
              />
              <ClosingChapter />
              <NextStepSection />
            </div>
          </div>
        </div>
        <Annotator />
      </div>
    </NsShell>
  );
}
