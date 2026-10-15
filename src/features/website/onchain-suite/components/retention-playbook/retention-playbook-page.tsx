import "./playbook-styles";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { ChapterShell } from "@/onchain-suite-website/components/retention-playbook/chapter-shell";
import { InitialHashScroll } from "@/onchain-suite-website/components/retention-playbook/initial-hash-scroll";
import { LegacyHashRedirect } from "@/onchain-suite-website/components/retention-playbook/legacy-hash-redirect";
import { handFont } from "@/onchain-suite-website/components/retention-playbook/playbook-fonts";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { PlaybookMobileBar } from "@/onchain-suite-website/components/retention-playbook/playbook-mobile-bar";
import { PlaybookRail } from "@/onchain-suite-website/components/retention-playbook/playbook-rail";
import { ReadingProgress } from "@/onchain-suite-website/components/retention-playbook/reading-progress";
import { NextStepSection } from "@/onchain-suite-website/components/retention-playbook/sections/next-step-section";
import { PlaybookHero } from "@/onchain-suite-website/components/retention-playbook/sections/playbook-hero";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import {
  PLAYBOOK_CHAPTERS,
  PLAYBOOK_TOC_LABELS,
} from "@/onchain-suite-website/data/playbooks";
import {
  NEXT_STEP,
  SUMMARY,
} from "@/onchain-suite-website/data/retention-playbook";
import { buildToc } from "@/onchain-suite-website/utils/playbook-toc";
import { playbookPath } from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * Contents for the rail: the summary, then the three playbooks as links to
 * their own pages, then the closing call to action. Built on the server.
 */
const TOC = buildToc([
  SUMMARY,
  ...PLAYBOOK_CHAPTERS.map((c) => ({
    ...c,
    href: playbookPath(c.id),
    tocLabel: PLAYBOOK_TOC_LABELS[c.id],
  })),
  {
    id: NEXT_STEP.id,
    number: NEXT_STEP.number,
    kicker: "",
    title: NEXT_STEP.title,
    dek: "",
    sections: [],
  },
]);

/**
 * /retention-playbook: the landing page. The hero, the summary chapter and the
 * picker, where each of the three playbooks is a link to its own page. The
 * playbooks themselves are not on this page, so a reader only loads the one
 * they pick.
 */
export function RetentionPlaybookPage({ client }: { client: string | null }) {
  return (
    <NsShell>
      <div className={`rp-page ${handFont.variable}`}>
        <LegacyHashRedirect client={client} />
        <InitialHashScroll />
        <PlaybookHeader />
        <ReadingProgress />
        <div className="wrap rp">
          <PlaybookHero client={client} />
          <div className="rp-grid">
            <PlaybookRail toc={TOC} />
            <div className="rp-main">
              <PlaybookMobileBar toc={TOC} />
              <ChapterShell chapter={SUMMARY} />
              <NextStepSection />
            </div>
          </div>
        </div>
        <Annotator />
      </div>
    </NsShell>
  );
}
