import "./playbook-styles";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { ChapterShell } from "@/onchain-suite-website/components/retention-playbook/chapter-shell";
import { InitialHashScroll } from "@/onchain-suite-website/components/retention-playbook/initial-hash-scroll";
import { LegacyHashRedirect } from "@/onchain-suite-website/components/retention-playbook/legacy-hash-redirect";
import { NextPageLink } from "@/onchain-suite-website/components/retention-playbook/next-page-link";
import { handFont } from "@/onchain-suite-website/components/retention-playbook/playbook-fonts";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { PlaybookMobileBar } from "@/onchain-suite-website/components/retention-playbook/playbook-mobile-bar";
import { PlaybookRail } from "@/onchain-suite-website/components/retention-playbook/playbook-rail";
import { ReadingProgress } from "@/onchain-suite-website/components/retention-playbook/reading-progress";
import { PlaybookHero } from "@/onchain-suite-website/components/retention-playbook/sections/playbook-hero";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import {
  META,
  OVERVIEW,
  SUMMARY,
} from "@/onchain-suite-website/data/retention-playbook";
import { PLAYBOOK_MAP } from "@/onchain-suite-website/utils/playbook-toc";

/**
 * /retention-playbook: the landing page. The hero, then the short case for
 * email on-chain, with the three growth and retention strategies in the rail.
 * Each strategy is its own page.
 */
export function RetentionPlaybookPage() {
  return (
    <NsShell>
      <div className={`rp-page ${handFont.variable}`}>
        <LegacyHashRedirect />
        <InitialHashScroll />
        <PlaybookHeader />
        <ReadingProgress />
        <div className="wrap rp">
          <PlaybookHero />
          <div className="rp-grid">
            <PlaybookRail
              title={META.title}
              entries={PLAYBOOK_MAP}
              currentId={OVERVIEW.id}
            />
            <div className="rp-main">
              <PlaybookMobileBar
                entries={PLAYBOOK_MAP}
                currentId={OVERVIEW.id}
              />
              <ChapterShell chapter={SUMMARY} showHead={false} />
              <NextPageLink currentId={OVERVIEW.id} />
            </div>
          </div>
        </div>
        <Annotator />
      </div>
    </NsShell>
  );
}
