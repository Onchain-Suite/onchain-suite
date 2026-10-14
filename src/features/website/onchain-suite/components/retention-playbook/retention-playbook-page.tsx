import "./styles/layout.css";
import "./styles/header.css";
import "./styles/hero.css";
import "./styles/hero-visual.css";
import "./styles/chapter.css";
import "./styles/blocks.css";
import "./styles/sketch.css";
import "./styles/cards.css";
import "./styles/flows.css";
import "./styles/closing.css";
import { Annotator } from "@/onchain-suite-website/components/retention-playbook/annotator";
import { ChapterShell } from "@/onchain-suite-website/components/retention-playbook/chapter-shell";
import { PlaybookProvider } from "@/onchain-suite-website/components/retention-playbook/playbook-context";
import { PlaybookEnd } from "@/onchain-suite-website/components/retention-playbook/playbook-end";
import { handFont } from "@/onchain-suite-website/components/retention-playbook/playbook-fonts";
import { PlaybookFrame } from "@/onchain-suite-website/components/retention-playbook/playbook-frame";
import { PlaybookHeader } from "@/onchain-suite-website/components/retention-playbook/playbook-header";
import { PlaybookMobileBar } from "@/onchain-suite-website/components/retention-playbook/playbook-mobile-bar";
import { PlaybookPill } from "@/onchain-suite-website/components/retention-playbook/playbook-pill";
import { PlaybookRail } from "@/onchain-suite-website/components/retention-playbook/playbook-rail";
import { ReadingProgress } from "@/onchain-suite-website/components/retention-playbook/reading-progress";
import { ClosingChapter } from "@/onchain-suite-website/components/retention-playbook/sections/closing-chapter";
import { NextStepSection } from "@/onchain-suite-website/components/retention-playbook/sections/next-step-section";
import { PlaybookHero } from "@/onchain-suite-website/components/retention-playbook/sections/playbook-hero";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import {
  PLAYBOOK_CHAPTERS,
  PLAYBOOK_TOC_LABELS,
} from "@/onchain-suite-website/data/playbooks";
import {
  CLOSING,
  NEXT_STEP,
  SUMMARY,
} from "@/onchain-suite-website/data/retention-playbook";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";
import { buildToc } from "@/onchain-suite-website/utils/playbook-toc";

/** Contents for the rail: built here, on the server, and passed down. */
const TOC = buildToc([
  SUMMARY,
  ...PLAYBOOK_CHAPTERS.map((c) => ({
    ...c,
    category: c.id,
    tocLabel: PLAYBOOK_TOC_LABELS[c.id],
  })),
  CLOSING,
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
 * /retention-playbook: Surgence Labs' email and in-app playbooks for perp
 * DEXs, prediction markets and DeFi, on OnchainSuite. Server rendered; the
 * navigation, playbook switch, toggles, tooltips and hand-drawn layer
 * hydrate. One playbook shows at a time.
 */
export function RetentionPlaybookPage({
  client,
  category,
}: {
  client: string | null;
  category: CategoryId | null;
}) {
  return (
    <NsShell>
      <PlaybookProvider initialCategory={category}>
        <div className={`rp-page ${handFont.variable}`}>
          <PlaybookHeader />
          <ReadingProgress />
          <div className="wrap rp">
            <PlaybookHero client={client} />
            <div className="rp-grid">
              <PlaybookRail toc={TOC} />
              <div className="rp-main">
                <PlaybookMobileBar toc={TOC} />
                <ChapterShell chapter={SUMMARY} />
                {PLAYBOOK_CHAPTERS.map((chapter) => (
                  <PlaybookFrame key={chapter.id} id={chapter.id}>
                    <ChapterShell
                      chapter={chapter}
                      footer={<PlaybookEnd id={chapter.id} />}
                    />
                  </PlaybookFrame>
                ))}
                <ClosingChapter />
                <NextStepSection />
              </div>
            </div>
          </div>
          <PlaybookPill />
          <Annotator />
        </div>
      </PlaybookProvider>
    </NsShell>
  );
}
