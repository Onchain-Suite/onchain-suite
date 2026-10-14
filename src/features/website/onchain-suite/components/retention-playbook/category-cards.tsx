"use client";

import { ArrowRightIcon, CheckIcon } from "@heroicons/react/20/solid";
import type { MouseEvent } from "react";

import { usePlaybook } from "./playbook-context";
import {
  CATEGORIES,
  UI,
} from "@/onchain-suite-website/data/retention-playbook";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";
import { trackPlaybookEvent } from "@/onchain-suite-website/utils/playbook-analytics";

/**
 * The three category cards. Each is a real #anchor link, so it works before
 * JavaScript loads and can be opened in a new tab; a plain click picks the
 * category, scrolls to the playbook and updates the hash.
 */
export function CategoryCards({
  location,
  compact = false,
}: {
  location: "summary";
  compact?: boolean;
}) {
  const { category, openPlaybook } = usePlaybook();

  function onPick(e: MouseEvent<HTMLAnchorElement>, id: CategoryId) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    trackPlaybookEvent({
      name: "retention_playbook_category_click",
      category: id,
      location,
    });
    openPlaybook(id);
  }

  return (
    <ul className={`rp-cats${compact ? " is-compact" : ""}`}>
      {CATEGORIES.map((c) => {
        const selected = category === c.id;
        return (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              className={`rp-cat${selected ? " is-selected" : ""}`}
              aria-current={selected ? "true" : undefined}
              onClick={(e) => onPick(e, c.id)}
            >
              <span className="rp-cat-sec">{c.section}</span>
              <span className="rp-cat-label">{c.label}</span>
              {!compact && <span className="rp-cat-line">{c.line}</span>}
              <span className="rp-cat-foot">
                {/* Compact cards keep a fixed slot for the check, so picking a
                    card never rewraps a label and shifts the page. */}
                {compact && (
                  <CheckIcon className="rp-cat-check" aria-hidden="true" />
                )}
                {!compact && selected && (
                  <span className="rp-cat-sel">
                    <CheckIcon className="rp-icon-sm" aria-hidden="true" />
                    {UI.selected}
                  </span>
                )}
                <ArrowRightIcon className="rp-cat-arrow" aria-hidden="true" />
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
