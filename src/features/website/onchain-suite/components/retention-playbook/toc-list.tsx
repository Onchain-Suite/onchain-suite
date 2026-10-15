"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { JumpLink } from "./jump-link";
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
 * listed under it. A chapter that lives on its own page is a plain link to it.
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
  const current = chapterOf(toc, active);

  return (
    <ol className="rp-chaps">
      {toc.map((chapter) => {
        const isCurrent = current?.id === chapter.id;
        const body = (
          <>
            <span className="rp-chap-num">
              {chapter.number}
              {isCurrent && <NumberCircle seed={chapter.id} />}
            </span>
            <span className="rp-chap-label">{chapter.label}</span>
          </>
        );
        return (
          <li
            key={chapter.id}
            className={`rp-chap${isCurrent ? " is-current" : ""}`}
          >
            {chapter.href ? (
              <Link
                href={chapter.href}
                className="rp-chap-link"
                onClick={onPick}
              >
                {body}
              </Link>
            ) : (
              <JumpLink
                target={chapter.id}
                className="rp-chap-link"
                ariaCurrent={
                  isCurrent && !active?.startsWith(`${chapter.id}-`)
                    ? "location"
                    : undefined
                }
                onJump={onPick}
              >
                {body}
              </JumpLink>
            )}
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
