import { track } from "@vercel/analytics";

import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";

/** Where a walkthrough button sits: top bar, hero, a playbook or the close. */
export type WalkthroughSource = "header" | "hero" | CategoryId | "next-step";

export type PlaybookEvent =
  | {
      name: "retention_playbook_category_click";
      category: CategoryId;
      location: "summary";
    }
  | { name: "retention_playbook_playbook_pill_click"; category: CategoryId }
  | {
      name: "retention_playbook_walkthrough_click";
      section: WalkthroughSource;
    };

type Clarity = (command: "event", name: string) => void;

/**
 * Sends one proposal event to Vercel Web Analytics (mounted in the root
 * layout) and, when it is loaded, to Microsoft Clarity. Analytics must never
 * break navigation, so failures are swallowed.
 */
export function trackPlaybookEvent(event: PlaybookEvent): void {
  const { name, ...properties } = event;
  try {
    track(name, properties);
    const { clarity } = window as unknown as { clarity?: Clarity };
    if (typeof clarity === "function") {
      clarity("event", name);
    }
  } catch {
    // Analytics is best effort.
  }
}
