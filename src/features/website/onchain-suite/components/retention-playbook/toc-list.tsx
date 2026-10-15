import Link from "next/link";
import type { CSSProperties } from "react";

import { JumpLink } from "./jump-link";
import type { MapEntry } from "@/onchain-suite-website/utils/playbook-toc";
import {
  roughEllipse,
  seededRandom,
  seedFrom,
} from "@/onchain-suite-website/utils/sketch";

/** The pen circle drawn around the current entry's number. */
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
 * The rail's list, Atlas style: numbered entries, each with an optional
 * one-line focus, and the current one circled. A "#anchor" entry scrolls
 * within the page; anything else is a link to another page.
 */
export function TocList({
  entries,
  currentId,
  onPick,
}: {
  entries: MapEntry[];
  currentId: string | null;
  onPick?: () => void;
}) {
  return (
    <ol className="rp-chaps">
      {entries.map((entry) => {
        const isCurrent = entry.id === currentId;
        const body = (
          <>
            <span className="rp-chap-num">
              {entry.number}
              {isCurrent && <NumberCircle seed={entry.id} />}
            </span>
            <span className="rp-chap-label">
              {entry.label}
              {entry.line && <span className="rp-chap-line">{entry.line}</span>}
            </span>
          </>
        );
        return (
          <li
            key={entry.id}
            className={`rp-chap${isCurrent ? " is-current" : ""}`}
          >
            {entry.href.startsWith("#") ? (
              <JumpLink
                target={entry.href.slice(1)}
                className="rp-chap-link"
                ariaCurrent={isCurrent ? "location" : undefined}
                onJump={onPick}
              >
                {body}
              </JumpLink>
            ) : (
              <Link
                href={entry.href}
                className="rp-chap-link"
                aria-current={isCurrent ? "page" : undefined}
                onClick={onPick}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
