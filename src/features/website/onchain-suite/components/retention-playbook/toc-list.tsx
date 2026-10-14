"use client";

import type { CSSProperties, MouseEvent } from "react";

import { JumpLink } from "./jump-link";
import { usePlaybook } from "./playbook-context";
import {
  chapterOf,
  type TocChapter,
} from "@/onchain-suite-website/utils/playbook-toc";
import {
  roughEllipse,
  seededRandom,
  seedFrom,
} from "@/onchain-suite-website/utils/sketch";

/** The pen circle drawn around the current chapter's number. */
function NumberCircle({ seed }: { seed: string }) {
  const d = roughEllipse(18, 13, 15, 11, seededRandom(seedFrom(seed)));
  return (
    <svg
      className="rp-chap-circle"
      viewBox="0 0 36 26"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={d}
        pathLength={1}
        className="rp-ink"
        style={{ "--i": 0 } as CSSProperties}
      />
    </svg>
  );
}

/**
 * Atlas-style contents: numbered chapters, with the current chapter's sections
 * listed under it. A playbook that is not on the page opens when picked.
 */
export function TocList({
  toc,
  active,
  onPick,
}: {
  toc: TocChapter[];
  active: string | null;
  onPick?: () => void;
}) {
  const { category, openPlaybook, jumpTo } = usePlaybook();
  const current = chapterOf(toc, active);

  function onChapter(e: MouseEvent<HTMLAnchorElement>, chapter: TocChapter) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    onPick?.();
    if (chapter.category && chapter.category !== category) {
      openPlaybook(chapter.category);
    } else {
      jumpTo(chapter.id);
    }
  }

  return (
    <ol className="rp-chaps">
      {toc.map((chapter) => {
        const isCurrent = current?.id === chapter.id;
        const isMine =
          chapter.category !== undefined && chapter.category === category;
        return (
          <li
            key={chapter.id}
            className={`rp-chap${isCurrent ? " is-current" : ""}`}
          >
            <a
              href={`#${chapter.id}`}
              className="rp-chap-link"
              aria-current={
                isCurrent && !active?.startsWith(`${chapter.id}-`)
                  ? "location"
                  : undefined
              }
              onClick={(e) => onChapter(e, chapter)}
            >
              <span className="rp-chap-num">
                {chapter.number}
                {isCurrent && <NumberCircle seed={chapter.id} />}
              </span>
              <span className="rp-chap-label">
                {chapter.label}
                {isMine && <span className="rp-chap-mine" aria-hidden="true" />}
              </span>
            </a>
            {isCurrent && chapter.sections.length > 0 && (
              <ol className="rp-chap-secs">
                {chapter.sections.map((s) => (
                  <li key={s.id}>
                    <JumpLink
                      target={s.id}
                      className={`rp-toc-link${active === s.id ? " on" : ""}`}
                      ariaCurrent={active === s.id ? "location" : undefined}
                      onJump={onPick}
                    >
                      {s.label}
                    </JumpLink>
                  </li>
                ))}
              </ol>
            )}
          </li>
        );
      })}
    </ol>
  );
}
