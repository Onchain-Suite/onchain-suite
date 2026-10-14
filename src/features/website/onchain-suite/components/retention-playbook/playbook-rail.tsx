"use client";

import { useMemo } from "react";

import { usePlaybook } from "./playbook-context";
import { TocList } from "./toc-list";
import { UI } from "@/onchain-suite-website/data/retention-playbook";
import { useActiveSection } from "@/onchain-suite-website/hooks/use-active-section";
import {
  type TocChapter,
  trackedIds,
  visibleIds,
} from "@/onchain-suite-website/utils/playbook-toc";

/**
 * Desktop: the sticky contents rail, Atlas style, with a running count of
 * where the reader is ("3/14") across the sections on the page.
 */
export function PlaybookRail({ toc }: { toc: TocChapter[] }) {
  const ids = useMemo(() => trackedIds(toc), [toc]);
  const active = useActiveSection(ids);
  const { category } = usePlaybook();
  const visible = useMemo(() => visibleIds(toc, category), [toc, category]);
  const position = active ? visible.indexOf(active) + 1 : 0;

  return (
    <aside className="rp-rail">
      <nav aria-label={UI.contentsLabel}>
        <p className="rp-rail-title">{UI.contents}</p>
        <TocList toc={toc} active={active} />
        <p className="rp-rail-foot">
          <span>{UI.scrollForMore}</span>
          <span aria-hidden="true">
            {position}/{visible.length}
          </span>
        </p>
      </nav>
    </aside>
  );
}
