import { ArrowDownIcon } from "@heroicons/react/20/solid";

import { JumpLink } from "@/onchain-suite-website/components/retention-playbook/jump-link";
import { WalkthroughButton } from "@/onchain-suite-website/components/retention-playbook/walkthrough-button";
import { CLOSING, UI } from "@/onchain-suite-website/data/retention-playbook";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";

/** Two ways out of a playbook: book a walkthrough, or read on. */
export function PlaybookEnd({ id }: { id: CategoryId }) {
  return (
    <div className="rp-playbook-end">
      <WalkthroughButton section={id} size="hero" />
      <JumpLink target={CLOSING.id} className="btn lg">
        {UI.continueReading}
        <ArrowDownIcon className="rp-icon-sm" aria-hidden="true" />
      </JumpLink>
    </div>
  );
}
