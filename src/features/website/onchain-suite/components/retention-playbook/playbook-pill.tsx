"use client";

import { BookOpenIcon } from "@heroicons/react/20/solid";

import { usePlaybook } from "./playbook-context";
import {
  CATEGORIES,
  UI,
} from "@/onchain-suite-website/data/retention-playbook";
import { trackPlaybookEvent } from "@/onchain-suite-website/utils/playbook-analytics";

/** Floating "Your playbook" pill, shown once a category is chosen. */
export function PlaybookPill() {
  const { category, openPlaybook } = usePlaybook();
  const card = CATEGORIES.find((c) => c.id === category);
  if (!category || !card) {
    return null;
  }
  return (
    <button
      type="button"
      className="rp-pill"
      onClick={() => {
        trackPlaybookEvent({
          name: "retention_playbook_playbook_pill_click",
          category,
        });
        openPlaybook(category);
      }}
    >
      <BookOpenIcon className="rp-icon-sm" aria-hidden="true" />
      <span className="rp-pill-k">{UI.yourPlaybook}</span>{" "}
      <span className="rp-pill-v">{card.label}</span>
    </button>
  );
}
