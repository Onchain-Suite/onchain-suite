import { CheckIcon, XMarkIcon } from "@heroicons/react/20/solid";

import { RichText } from "@/onchain-suite-website/components/retention-playbook/rich-text";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { RichSegment } from "@/onchain-suite-website/utils/glossary-marker";

const key = (segments: RichSegment[]) => segments.map((s) => s.text).join("");

/** "What email says, and what it never says": two side-by-side lists. */
export function SaysPanel({
  always,
  never,
}: {
  always: RichSegment[][];
  never: RichSegment[][];
}) {
  return (
    <div className="rp-says">
      <div className="rp-says-col is-always">
        <p className="rp-says-k">{UI.always}</p>
        <ul>
          {always.map((item) => (
            <li key={key(item)}>
              <CheckIcon className="rp-says-icon" aria-hidden="true" />
              <span>
                <RichText segments={item} />
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rp-says-col is-never">
        <p className="rp-says-k">{UI.never}</p>
        <ul>
          {never.map((item) => (
            <li key={key(item)}>
              <XMarkIcon className="rp-says-icon" aria-hidden="true" />
              <span>
                <RichText segments={item} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
