import { ArrowRightIcon } from "@heroicons/react/20/solid";

import { RichText } from "./rich-text";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

export interface MarkedLoop {
  name: string;
  startsWhen: RichSegment[];
  sends: RichSegment[];
  stopsWhen: RichSegment[];
}

/** Each Loop as a card: Starts when, then What it sends, then Stops when. */
export function LoopCards({
  loops,
  headingLevel = 3,
}: {
  loops: MarkedLoop[];
  headingLevel?: 3 | 4;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <ul className="rp-loops">
      {loops.map((loop) => {
        const steps = [
          { label: UI.startsWhen, text: loop.startsWhen },
          { label: UI.sends, text: loop.sends },
          { label: UI.stopsWhen, text: loop.stopsWhen },
        ];
        return (
          <li key={loop.name} className="rp-loop">
            <Heading className="rp-loop-name">{loop.name}</Heading>
            <ol className="rp-flow">
              {steps.map((step, i) => (
                <li key={step.label} className="rp-flow-step">
                  <span className="rp-flow-k">{step.label}</span>
                  <span className="rp-flow-v">
                    <RichText segments={step.text} />
                  </span>
                  {i < steps.length - 1 && (
                    <ArrowRightIcon
                      className="rp-flow-arrow"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </li>
        );
      })}
    </ul>
  );
}
