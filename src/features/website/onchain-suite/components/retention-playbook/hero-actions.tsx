"use client";

import { ArrowDownIcon } from "@heroicons/react/20/solid";

import { JumpLink } from "./jump-link";
import { usePlaybook } from "./playbook-context";
import { WalkthroughButton } from "./walkthrough-button";
import { PICKER_ID, UI } from "@/onchain-suite-website/data/retention-playbook";

/**
 * Hero buttons: book a walkthrough, and get to the reader's playbook. A link
 * with ?category= jumps straight to that playbook; otherwise the button goes
 * to the category picker. The label depends only on the link, never on a
 * later card click, so the hero never changes size under the reader.
 */
export function HeroActions() {
  const { category, fromLink } = usePlaybook();
  const toPlaybook = fromLink && category !== null;
  return (
    <div className="ctas rp-hero-ctas load" style={{ animationDelay: ".18s" }}>
      <WalkthroughButton section="hero" size="hero" />
      <JumpLink target={toPlaybook ? category : PICKER_ID} className="btn lg">
        {toPlaybook ? UI.jumpToPlaybook : UI.findPlaybook}
        <ArrowDownIcon className="rp-icon-sm" aria-hidden="true" />
      </JumpLink>
    </div>
  );
}
