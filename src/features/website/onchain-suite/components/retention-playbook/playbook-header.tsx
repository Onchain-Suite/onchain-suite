import Image from "next/image";

import { WalkthroughButton } from "@/onchain-suite-website/components/retention-playbook/walkthrough-button";
import { SENDER } from "@/onchain-suite-website/data/retention-playbook";

/**
 * The playbook's own top bar: Surgence Labs sends these playbooks, so its mark
 * and name replace the site navigation here (hidden for this page only in
 * styles/header.css). The booking button still opens OnchainSuite's calendar.
 * Surgence's mark is white, so the bar uses the site's dark navy.
 */
export function PlaybookHeader() {
  return (
    <header className="rp-brandbar">
      <div className="rp-brandbar-in">
        <a
          className="rp-brand"
          href={SENDER.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${SENDER.name} (opens ${SENDER.domain} in a new tab)`}
        >
          <Image src={SENDER.mark} alt="" width={36} height={36} priority />
          <span>{SENDER.name}</span>
        </a>
        <WalkthroughButton section="header" />
      </div>
    </header>
  );
}
