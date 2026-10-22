import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

/** One reader's path through the lifecycle, told as dated steps. */
export function PathSteps({
  name,
  steps,
}: {
  name: string;
  steps: { when: string; what: RichSegment[] }[];
}) {
  return (
    <div className="rp-path">
      <p className="rp-path-name">{name}</p>
      <ol className="rp-path-list">
        {steps.map((step) => (
          <li key={step.when}>
            <span className="rp-path-when">{step.when}</span>
            <span className="rp-path-what">
              <RichText segments={step.what} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
