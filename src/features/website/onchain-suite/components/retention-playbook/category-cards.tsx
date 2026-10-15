"use client";

import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CATEGORIES } from "@/onchain-suite-website/data/retention-playbook";
import type { CategoryId } from "@/onchain-suite-website/types/retention-playbook";
import { trackPlaybookEvent } from "@/onchain-suite-website/utils/playbook-analytics";
import { playbookPath } from "@/onchain-suite-website/utils/retention-playbook-params";

/**
 * The three category cards. Each is a real link to that playbook's own page,
 * so it works before JavaScript loads, opens in a new tab, and can be sent to
 * a prospect on its own. A ?client= on the landing page is carried across, so
 * "Prepared for" survives the click.
 */
export function CategoryCards({
  location,
  compact = false,
}: {
  location: "summary";
  compact?: boolean;
}) {
  // Null while the router is still warming up on a soft navigation.
  const client = useSearchParams()?.get("client") ?? null;

  function onPick(id: CategoryId) {
    trackPlaybookEvent({
      name: "retention_playbook_category_click",
      category: id,
      location,
    });
  }

  return (
    <ul className={`rp-cats${compact ? " is-compact" : ""}`}>
      {CATEGORIES.map((c) => (
        <li key={c.id}>
          <Link
            href={playbookPath(c.id, client)}
            className="rp-cat"
            onClick={() => onPick(c.id)}
          >
            <span className="rp-cat-sec">{c.section}</span>
            <span className="rp-cat-label">{c.label}</span>
            {!compact && <span className="rp-cat-line">{c.line}</span>}
            <span className="rp-cat-foot">
              <ArrowRightIcon className="rp-cat-arrow" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
