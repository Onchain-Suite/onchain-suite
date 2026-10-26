import { track } from "@vercel/analytics";

/** Where a walkthrough button sits: the top bar, the hero, or the last page's foot. */
export type WalkthroughSource = "header" | "hero" | "next-step";

export type PlaybookEvent =
  | { name: "retention_playbook_pdf_download"; strategy: string }
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
