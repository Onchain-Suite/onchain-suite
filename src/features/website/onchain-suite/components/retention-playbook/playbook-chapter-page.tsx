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
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";
import { strategyContents } from "@/onchain-suite-website/utils/playbook-toc";
import {
  pdfPathForSlug,
  PLAYBOOK_BASE,
  strategyPathForSlug,
} from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * /retention-playbook/<slug>: one growth and retention strategy, a sector's or a client's,
 * Atlas style. The rail is everything in this strategy, with the section being
 * read circled; then the title and standfirst, the body, and the next strategy
 * at the foot.
 */
export function PlaybookChapterPage({
  chapter,
  slug,
}: {
  chapter: Chapter;
  /** The page's path segment, which also names its PDF. */
  slug: string;
}) {
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
                OnchainSuite · onchainsuite.com{strategyPathForSlug(slug)}
              </p>
              <PlaybookMobileBar entries={contents} backHref={PLAYBOOK_BASE} />
              <ChapterShell
                chapter={chapter}
                action={
                  <PdfButton
                    href={pdfPathForSlug(slug)}
                    strategy={chapter.id}
                  />
                }
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
