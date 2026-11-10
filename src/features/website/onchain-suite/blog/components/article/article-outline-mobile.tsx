"use client";

import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useMemo, useRef } from "react";

import {
  scrollToHeading,
  useActiveHeading,
} from "../../hooks/use-active-heading";
import type { OutlineItem } from "../../utils/outline";

/**
 * Below the wide-screen breakpoint the side columns go away and the outline
 * becomes this bar, pinned under the navbar: the current section, opening to
 * the full list. A native <details> keeps it keyboard and
 * screen-reader friendly with no open/close state of our own.
 */
export function ArticleOutlineMobile({
  items,
  bodyId,
}: {
  items: OutlineItem[];
  bodyId: string;
}) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const { active } = useActiveHeading(ids, bodyId);
  const panel = useRef<HTMLDetailsElement>(null);
  const current = active === null ? null : items[active];

  return (
    <details ref={panel} className="ba-mobilebar">
      <summary>
        <span className="ba-mobilebar-label">
          {current ? current.text : "On this page"}
        </span>
        <ChevronDownIcon aria-hidden="true" className="ba-mobilebar-caret" />
      </summary>
      <nav aria-label="On this page">
        <ol>
          {items.map((item, index) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={index === active ? "location" : undefined}
                className={item.level === 3 ? "is-sub" : undefined}
                onClick={(event) => {
                  // Collapse the sheet first and scroll on the next frame:
                  // collapsing it in the same frame cancels a smooth scroll.
                  event.preventDefault();
                  if (panel.current) panel.current.open = false;
                  window.requestAnimationFrame(() => scrollToHeading(item.id));
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
