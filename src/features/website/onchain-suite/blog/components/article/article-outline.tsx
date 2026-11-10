"use client";

import { ArrowUpIcon } from "@heroicons/react/20/solid";
import { useMemo } from "react";

import { useActiveHeading } from "../../hooks/use-active-heading";
import { prefersReducedMotion } from "../../hooks/use-scroll-frame";
import type { OutlineItem } from "../../utils/outline";

/**
 * "On this page", pinned beside the article on wide screens. The section being
 * read is marked with an accent rule and `aria-current`; sections already
 * passed are a shade darker than those still ahead.
 */
export function ArticleOutline({
  items,
  bodyId,
}: {
  items: OutlineItem[];
  bodyId: string;
}) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const { active, goTo } = useActiveHeading(ids, bodyId);

  return (
    <nav className="ba-toc" aria-label="On this page">
      <p className="ba-toc-title">On this page</p>
      <ol>
        {items.map((item, index) => {
          const state =
            active === null || index > active
              ? undefined
              : index === active
                ? "location"
                : "read";
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => goTo(event, item.id)}
                aria-current={state === "location" ? "location" : undefined}
                data-read={state === "read" ? "" : undefined}
                className={item.level === 3 ? "is-sub" : undefined}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="ba-totop"
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          })
        }
      >
        <ArrowUpIcon aria-hidden="true" className="size-3.5" />
        Back to top
      </button>
    </nav>
  );
}
