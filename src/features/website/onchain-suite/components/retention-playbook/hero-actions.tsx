import { ArrowDownIcon } from "@heroicons/react/20/solid";

import { JumpLink } from "./jump-link";
import { WalkthroughButton } from "./walkthrough-button";
import { PICKER_ID, UI } from "@/onchain-suite-website/data/retention-playbook";

/**
 * Hero buttons: book a walkthrough, and get to the category picker, where
 * each playbook is a link to its own page.
 */
export function HeroActions() {
  return (
    <div className="ctas rp-hero-ctas load" style={{ animationDelay: ".18s" }}>
      <WalkthroughButton section="hero" size="hero" />
      <JumpLink target={PICKER_ID} className="btn lg">
        {UI.findPlaybook}
        <ArrowDownIcon className="rp-icon-sm" aria-hidden="true" />
      </JumpLink>
    </div>
  );
}
