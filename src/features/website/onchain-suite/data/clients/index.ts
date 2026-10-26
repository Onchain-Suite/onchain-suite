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
}

export const CLIENT_STRATEGIES: ClientStrategy[] = [
  { slug: "yauga", chapter: YAUGA },
];
