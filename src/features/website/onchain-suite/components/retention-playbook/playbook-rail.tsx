"use client";

import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import Link from "next/link";

import { TocList } from "./toc-list";
import { useRailCurrent } from "./use-rail-current";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import type { MapEntry } from "@/onchain-suite-website/utils/playbook-toc";

/**
 * Desktop: the sticky rail. On a strategy page it is everything in that
 * strategy, with the section being read circled; on the landing page it is
 * the three strategies.
 */
export function PlaybookRail({
  title,
  entries,
  currentId,
  backHref,
}: {
  title: string;
  entries: MapEntry[];
  /** Set on the landing page, where the rail lists pages, not sections. */
  currentId?: string;
  /** Set on a strategy page: the way back to all three strategies. */
  backHref?: string;
}) {
  const current = useRailCurrent(entries, currentId);
  return (
    <aside className="rp-rail">
      <nav aria-label={UI.contentsLabel}>
        {backHref && (
          <Link href={backHref} className="rp-rail-back">
            <ArrowLeftIcon className="rp-icon-sm" aria-hidden="true" />
            {UI.allStrategies}
          </Link>
        )}
        <p className="rp-rail-title">{title}</p>
        <TocList entries={entries} currentId={current} />
      </nav>
    </aside>
  );
}
