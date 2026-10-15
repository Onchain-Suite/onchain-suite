import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import { WalkthroughButton } from "./walkthrough-button";
import { nextEntry } from "@/onchain-suite-website/utils/playbook-toc";

/**
 * The foot of every page, Atlas style: the next page in the map, by name and
 * focus. The last sector has no next page, so it ends on the booking button.
 */
export function NextPageLink({ currentId }: { currentId: string }) {
  const next = nextEntry(currentId);
  if (!next) {
    return (
      <nav className="rp-nextpage" aria-label="Next">
        <WalkthroughButton section="next-step" size="hero" />
      </nav>
    );
  }
  return (
    <nav className="rp-nextpage" aria-label="Next">
      <Link href={next.href} className="rp-nextpage-link">
        <ArrowRightIcon className="rp-nextpage-arrow" aria-hidden="true" />
        <span className="rp-nextpage-label">{next.label}</span>
        {next.line && <span className="rp-nextpage-line">{next.line}</span>}
      </Link>
    </nav>
  );
}
