import { WalkthroughButton } from "@/onchain-suite-website/components/retention-playbook/walkthrough-button";
import { SENDER } from "@/onchain-suite-website/data/retention-playbook";

/**
 * The strategy pages' own top bar: the OnchainSuite mark and name, with the
 * booking button, in place of the site navigation (hidden for these pages
 * only in styles/header.css). The mark is the site's own sprite symbol,
 * drawn white on the site's dark navy.
 */
export function PlaybookHeader() {
  return (
    <header className="rp-brandbar">
      <div className="rp-brandbar-in">
        <a
          className="rp-brand"
          href={SENDER.url}
          aria-label={`${SENDER.name} home`}
        >
          <svg className="rp-brand-mark" aria-hidden="true">
            <use href="#ocs-mark" fill="#FFFFFF" />
          </svg>
          <span>{SENDER.name}</span>
        </a>
        <WalkthroughButton section="header" />
      </div>
    </header>
  );
}
