import "./playbook-styles";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { ChapterShell } from "@/onchain-suite-website/components/retention-playbook/chapter-shell";
import { InitialHashScroll } from "@/onchain-suite-website/components/retention-playbook/initial-hash-scroll";
import { LegacyHashRedirect } from "@/onchain-suite-website/components/retention-playbook/legacy-hash-redirect";
import { NextPageLink } from "@/onchain-suite-website/components/retention-playbook/next-page-link";
import { handFont } from "@/onchain-suite-website/components/retention-playbook/playbook-fonts";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { ReadingProgress } from "@/onchain-suite-website/components/retention-playbook/reading-progress";
import { PlaybookHero } from "@/onchain-suite-website/components/retention-playbook/sections/playbook-hero";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import {
  OVERVIEW,
  SUMMARY,
} from "@/onchain-suite-website/data/retention-playbook";

/**
 * /retention-playbook: the landing page. The hero, then the short case for
 * retention on-chain in one centred column, with no rail. Each growth and
 * retention strategy is its own page, starting from the link at the foot.
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
          <div className="rp-solo">
            <ChapterShell chapter={SUMMARY} showHead={false} />
            <NextPageLink currentId={OVERVIEW.id} />
          </div>
        </div>
        <Annotator />
      </div>
    </NsShell>
  );
}
