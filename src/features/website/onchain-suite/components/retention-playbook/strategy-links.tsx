import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import { OVERVIEW } from "@/onchain-suite-website/data/retention-playbook";
import { PLAYBOOK_MAP } from "@/onchain-suite-website/utils/playbook-toc";

/**
 * The foot of the landing page: every growth and retention strategy, by name
 * and focus. The landing page has no rail, so this is where all three live.
 */
export function StrategyLinks() {
  const strategies = PLAYBOOK_MAP.filter((e) => e.id !== OVERVIEW.id);
  return (
    <nav className="rp-nextpage" aria-label="Strategies">
      <ul className="rp-strategies">
        {strategies.map((s) => (
          <li key={s.id}>
            <Link href={s.href} className="rp-nextpage-link">
              <ArrowRightIcon
                className="rp-nextpage-arrow"
                aria-hidden="true"
              />
              <span className="rp-nextpage-label">{s.label}</span>
              {s.line && <span className="rp-nextpage-line">{s.line}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
