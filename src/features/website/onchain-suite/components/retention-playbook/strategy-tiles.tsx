import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import {
  CATEGORIES,
  STRATEGIES_HEADING,
} from "@/onchain-suite-website/data/retention-playbook";
import { playbookPath } from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * Straight under the hero: the three growth and retention strategies as
 * tiles, named by sector, so a reader can go to theirs without scrolling the
 * whole page. The heading names them once; the tiles carry only the sector.
 */
export function StrategyTiles() {
  return (
    <section
      id="strategies"
      className="rp-tiles"
      aria-labelledby="rp-tiles-title"
    >
      <h2 className="rp-tiles-title" id="rp-tiles-title">
        {STRATEGIES_HEADING}
      </h2>
      <ul className="rp-tiles-list">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              href={playbookPath(c.id)}
              className="rp-tile"
              aria-label={c.label}
            >
              <span className="rp-tile-name">{c.sector}</span>
              <span className="rp-tile-line">{c.line}</span>
              <ArrowRightIcon className="rp-tile-arrow" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
