import { YAUGA } from "./yauga";
import type { Chapter } from "@/onchain-suite-website/types/retention-playbook";

/**
 * A strategy written for one client, on the same structure as the sector
 * pages. Reached by its link only: never on the landing page, its tiles or
 * the map, and never a "next strategy" from another page.
 */
export interface ClientStrategy {
  /** The page's path segment: /retention-playbook/<slug>. */
  slug: string;
  chapter: Chapter;
  /** Who it is written for, on the cover: "the Yauga team". */
  preparedFor?: string;
  /** The client's name and logo, shown beside ours inside the cover. */
  client?: { name: string; logo: string };
  /** The Suite plans priced on the book's pricing page, one card each. */
  pricing?: StrategyPricing;
}

export interface StrategyPricing {
  /** Each option is a contact count; its level and price follow from it. */
  options: { contacts: number; label?: string }[];
  /** One line under the cards, e.g. what the contact counts are based on. */
  note?: string;
}

export const CLIENT_STRATEGIES: ClientStrategy[] = [
  {
    slug: "yauga",
    chapter: YAUGA,
    preparedFor: "the Yauga team",
    client: { name: "Yauga", logo: "/site/logos/yauga.jpg" },
    pricing: {
      // The two sizes the strategy itself names in "Running it on OnchainSuite".
      options: [
        { contacts: 2_500, label: "To start" },
        { contacts: 25_000, label: "As cities grow" },
      ],
      note: "The plan follows the contacts Yauga imports, so the level moves up as cities launch.",
    },
  },
];

export function clientStrategy(slug: string): ClientStrategy | undefined {
  return CLIENT_STRATEGIES.find((s) => s.slug === slug);
}
