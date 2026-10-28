import "./playbook-styles";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { BackToBook } from "@/onchain-suite-website/components/retention-playbook/book/book-viewer";
import { StrategyBook } from "@/onchain-suite-website/components/retention-playbook/book/strategy-book";
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
import { clientStrategy } from "@/onchain-suite-website/data/clients";
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";
import { strategyContents } from "@/onchain-suite-website/utils/playbook-toc";
import {
  categoryOfSlug,
  pdfPathForSlug,
  PLAYBOOK_BASE,
  strategyPathForSlug,
} from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * /retention-playbook/<slug>: one growth and retention strategy, a sector's or a client's,
 * Atlas style. The rail is everything in this strategy, with the section being
 * read circled; then the title and standfirst, the body, and the next strategy
 * at the foot. A sector page links back to all the strategies; a client's page
 * is reached by its link only, so it offers no way to the listing.
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
  const backHref = categoryOfSlug(slug) ? PLAYBOOK_BASE : undefined;
  // A client's strategy (today only Yauga) opens as a book. The sector pages
  // render exactly as before: no book, no wrapper.
  const strategy = categoryOfSlug(slug) ? undefined : clientStrategy(slug);
  const body = (
    <>
      <div className="wrap rp">
        <div className="rp-grid">
          <PlaybookRail
            title={chapter.title}
            entries={contents}
            backHref={backHref}
          />
          <div className="rp-main">
            {/* Printed only: the PDF names its sender and its page. */}
            <p className="rp-print-head">
              OnchainSuite · onchainsuite.com{strategyPathForSlug(slug)}
            </p>
            <PlaybookMobileBar entries={contents} backHref={backHref} />
            {strategy && <BackToBook />}
            <ChapterShell
              chapter={chapter}
              action={
                <PdfButton href={pdfPathForSlug(slug)} strategy={chapter.id} />
              }
            />
            <NextPageLink currentId={chapter.id} />
          </div>
        </div>
      </div>
      <Annotator />
    </>
  );
  if (!strategy) {
    return (
      <NsShell>
        <div className={`rp-page ${handFont.variable}`}>
          <InitialHashScroll />
          <PlaybookHeader />
          <ReadingProgress />
          {body}
        </div>
      </NsShell>
    );
  }
  return (
    <NsShell>
      <div className={`rp-page ${handFont.variable} rp-has-book`}>
        <PlaybookHeader />
        <StrategyBook strategy={strategy} />
        <div className="rp-scroll">
          <InitialHashScroll />
          <ReadingProgress />
          {body}
        </div>
      </div>
    </NsShell>
  );
}
