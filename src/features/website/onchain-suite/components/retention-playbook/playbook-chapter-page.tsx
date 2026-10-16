import "./playbook-styles";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { ChapterShell } from "@/onchain-suite-website/components/retention-playbook/chapter-shell";
import { InitialHashScroll } from "@/onchain-suite-website/components/retention-playbook/initial-hash-scroll";
import { NextPageLink } from "@/onchain-suite-website/components/retention-playbook/next-page-link";
import { PdfButton } from "@/onchain-suite-website/components/retention-playbook/pdf-button";
import { handFont } from "@/onchain-suite-website/components/retention-playbook/playbook-fonts";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { PlaybookMobileBar } from "@/onchain-suite-website/components/retention-playbook/playbook-mobile-bar";
import { PlaybookRail } from "@/onchain-suite-website/components/retention-playbook/playbook-rail";
import { ReadingProgress } from "@/onchain-suite-website/components/retention-playbook/reading-progress";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import type { PlaybookChapter } from "@/onchain-suite-website/types/retention-playbook";
import { strategyContents } from "@/onchain-suite-website/utils/playbook-toc";
import {
  PLAYBOOK_BASE,
  playbookPath,
} from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * /retention-playbook/<sector>: one sector's growth and retention strategy,
 * Atlas style. The rail is everything in this strategy, with the section being
 * read circled; then the title and standfirst, the body, and the next strategy
 * at the foot.
 */
export function PlaybookChapterPage({ chapter }: { chapter: PlaybookChapter }) {
  const contents = strategyContents(chapter);
  return (
    <NsShell>
      <div className={`rp-page ${handFont.variable}`}>
        <InitialHashScroll />
        <PlaybookHeader />
        <ReadingProgress />
        <div className="wrap rp">
          <div className="rp-grid">
            <PlaybookRail
              title={chapter.title}
              entries={contents}
              backHref={PLAYBOOK_BASE}
            />
            <div className="rp-main">
              {/* Printed only: the PDF names its sender and its page. */}
              <p className="rp-print-head">
                Surgence Labs · onchainsuite.com{playbookPath(chapter.id)}
              </p>
              <PlaybookMobileBar entries={contents} backHref={PLAYBOOK_BASE} />
              <ChapterShell
                chapter={chapter}
                action={<PdfButton category={chapter.id} />}
              />
              <NextPageLink currentId={chapter.id} />
            </div>
          </div>
        </div>
        <Annotator />
      </div>
    </NsShell>
  );
}
