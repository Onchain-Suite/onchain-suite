import {
  DocumentMagnifyingGlassIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { ChapterHead } from "@/onchain-suite-website/components/retention-playbook/chapter-head";
import { PointCards } from "@/onchain-suite-website/components/retention-playbook/point-cards";
import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import {
  CLOSING,
  GLOSSARY,
  PRIVACY_POINTS,
  SETUP_STEPS,
  UI,
} from "@/onchain-suite-website/data/retention-playbook";
import type { PrivacyIcon } from "@/onchain-suite-website/types/retention-playbook";
import {
  createGlossaryTracker,
  markPoints,
} from "@/onchain-suite-website/utils/glossary-marker";
import { sectionAnchor } from "@/onchain-suite-website/utils/playbook-toc";

const ICONS: Record<PrivacyIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  wallet: WalletIcon,
  hidden: EyeSlashIcon,
  "read-only": DocumentMagnifyingGlassIcon,
  compliant: ShieldCheckIcon,
};

function Section({ id, children }: { id: string; children: ReactNode }) {
  const anchor = sectionAnchor(CLOSING.id, id);
  const title = CLOSING.sections.find((s) => s.id === id)?.title ?? id;
  return (
    <section id={anchor} className="rp-sec2" aria-labelledby={`${anchor}-h`}>
      <h3 className="rp-h3x" id={`${anchor}-h`} tabIndex={-1} data-jump-focus>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Chapter 04: privacy, getting started and the glossary. No pricing. */
export function ClosingChapter() {
  const privacy = markPoints(createGlossaryTracker(), PRIVACY_POINTS).map(
    (p, i) => {
      const Icon = ICONS[PRIVACY_POINTS[i].icon];
      return { ...p, icon: <Icon aria-hidden="true" /> };
    }
  );
  const g = createGlossaryTracker();
  const steps = SETUP_STEPS.map((s) => ({
    key: s.text,
    text: g.mark(s.text),
    need: g.mark(s.need),
  }));

  return (
    <article
      id={CLOSING.id}
      className="rp-chapter"
      aria-labelledby={`${CLOSING.id}-title`}
    >
      <ChapterHead chapter={CLOSING} />

      <Section id="privacy">
        <PointCards points={privacy} columns={2} />
      </Section>

      <Section id="getting-started">
        <ol className="rp-steps">
          {steps.map((s, i) => (
            <li key={s.key} className="rp-step">
              <span className="rp-step-n" aria-hidden="true">
                {i + 1}
              </span>
              <div className="rp-step-body">
                <p className="rp-step-text">
                  <RichText segments={s.text} />
                </p>
                <p className="rp-need">
                  <span className="rp-need-k">{UI.need}:</span>{" "}
                  <RichText segments={s.need} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="words-we-use">
        <dl className="rp-glossary">
          {GLOSSARY.entries.map((e) => (
            <div key={e.key}>
              <dt>{e.term}</dt>
              <dd>{e.definition}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </article>
  );
}
