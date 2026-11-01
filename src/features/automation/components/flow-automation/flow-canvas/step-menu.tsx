"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

/** How many options one page holds when the menu is paginated. */
const PAGE_SIZE = 6;

export interface StepMenuItem {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
  /** Shown instead of the hint, and the option can't be picked. */
  disabledReason?: string;
}

export interface StepMenuGroup {
  label: string;
  items: StepMenuItem[];
}

/**
 * The step and trigger pickers: search on top, the catalogue below. Two or
 * more groups with more than a handful of options show as columns, so the
 * whole catalogue is visible at once. Focus stays in the search box: up and
 * down move through the options, left and right jump columns, Enter picks.
 *
 * With `paginate`, the catalogue is split into pages of {@link PAGE_SIZE}
 * instead of one long scroll (the trigger picker, which has a long fixed
 * list). The highlighted option always sits on the shown page, so the arrow
 * keys page through it and left/right step whole pages.
 */
export function StepMenu({
  title,
  placeholder,
  groups,
  onPick,
  paginate = false,
}: {
  title: string;
  placeholder: string;
  groups: StepMenuGroup[];
  onPick: (id: string) => void;
  paginate?: boolean;
}) {
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const query = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) =>
        `${i.label} ${i.hint}`.toLowerCase().includes(query)
      ),
    }))
    .filter((g) => g.items.length > 0);
  const flat = shown.flatMap((g) => g.items);
  const starts = shown.map((_, gi) =>
    shown.slice(0, gi).reduce((n, g) => n + g.items.length, 0)
  );
  const groupOf = (n: number) =>
    starts.reduce((g, st, i) => (st <= n ? i : g), 0);

  // Pagination is on only once there is more than one page to show; below
  // that it behaves exactly like the plain list.
  const paged = paginate && flat.length > PAGE_SIZE;
  const pageCount = paged ? Math.ceil(flat.length / PAGE_SIZE) : 1;
  const page = paged ? Math.min(pageCount - 1, Math.floor(at / PAGE_SIZE)) : 0;
  const pageStart = page * PAGE_SIZE;
  const pageEnd = paged
    ? Math.min(flat.length, pageStart + PAGE_SIZE)
    : flat.length;
  const inPage = (n: number) => !paged || (n >= pageStart && n < pageEnd);
  // Columns only make sense for the one-glance list, not the paged one.
  const columns =
    !paged &&
    groups.length > 1 &&
    groups.reduce((n, g) => n + g.items.length, 0) > 6;

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);
  // The highlighted option stays in view as the arrows move it.
  useEffect(() => {
    document
      .getElementById(`${listId}-${at}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [at, listId]);

  const pick = (item: StepMenuItem | undefined) => {
    if (item && !item.disabledReason) onPick(item.id);
  };

  const toPage = (p: number) => {
    const next = Math.max(0, Math.min(pageCount - 1, p));
    setAt(next * PAGE_SIZE);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAt((v) => Math.min(flat.length - 1, v + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAt((v) => Math.max(0, v - 1));
    } else if (paged && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      toPage(page + (e.key === "ArrowRight" ? 1 : -1));
    } else if (
      columns &&
      (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
      shown.length > 1
    ) {
      e.preventDefault();
      const g = groupOf(at);
      const to = Math.max(
        0,
        Math.min(shown.length - 1, g + (e.key === "ArrowRight" ? 1 : -1))
      );
      setAt(
        Math.min(
          starts[to] + (at - starts[g]),
          starts[to] + shown[to].items.length - 1
        )
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(flat[at]);
    }
  };

  return (
    <div className="ab-menu" role="dialog" aria-label={title}>
      <div className="ab-menu__search">
        <MagnifyingGlassIcon aria-hidden="true" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAt(0);
          }}
          placeholder={placeholder}
          aria-label={`Search ${title.toLowerCase()}`}
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={flat[at] ? `${listId}-${at}` : undefined}
          onKeyDown={onKey}
        />
        <kbd>esc</kbd>
      </div>
      <div
        className={`ab-menu__list${columns ? " ab-menu__list--cols" : ""}`}
        role="listbox"
        id={listId}
        aria-label={title}
      >
        {flat.length === 0 && (
          <p className="ab-menu__none">Nothing matches &ldquo;{q}&rdquo;</p>
        )}
        {shown.map((g, gi) => {
          // On a paged menu, skip groups that have no option on this page so
          // their header does not sit above an empty space.
          const anyOnPage = g.items.some((_, k) => inPage(starts[gi] + k));
          if (!anyOnPage) return null;
          return (
            <div
              key={g.label}
              className="ab-menu__col"
              role="group"
              aria-label={g.label}
            >
              <span className="ab-menu__group" aria-hidden="true">
                {g.label}
              </span>
              {g.items.map((item, k) => {
                const n = starts[gi] + k;
                if (!inPage(n)) return null;
                return (
                  <button
                    key={item.id}
                    id={`${listId}-${n}`}
                    type="button"
                    role="option"
                    aria-selected={n === at}
                    aria-disabled={!!item.disabledReason}
                    disabled={!!item.disabledReason}
                    tabIndex={-1}
                    className={n === at ? "is-on" : undefined}
                    onMouseEnter={() => setAt(n)}
                    onClick={() => pick(item)}
                  >
                    <span className="ab-menu__ic">{item.icon}</span>
                    <span>
                      <b>{item.label}</b>
                      <em>{item.disabledReason ?? item.hint}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {paged && (
        <div className="ab-menu__pager">
          <button
            type="button"
            className="ab-menu__pagebtn"
            onClick={() => toPage(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeftIcon aria-hidden="true" />
          </button>
          <span className="ab-menu__pagecount" aria-live="polite">
            {pageStart + 1}&ndash;{pageEnd} of {flat.length}
          </span>
          <button
            type="button"
            className="ab-menu__pagebtn"
            onClick={() => toPage(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
