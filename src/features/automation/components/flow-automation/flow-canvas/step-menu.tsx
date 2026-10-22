"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

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
 */
export function StepMenu({
  title,
  placeholder,
  groups,
  onPick,
}: {
  title: string;
  placeholder: string;
  groups: StepMenuGroup[];
  onPick: (id: string) => void;
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
  const columns =
    groups.length > 1 && groups.reduce((n, g) => n + g.items.length, 0) > 6;
  const starts = shown.map((_, gi) =>
    shown.slice(0, gi).reduce((n, g) => n + g.items.length, 0)
  );
  const groupOf = (n: number) =>
    starts.reduce((g, st, i) => (st <= n ? i : g), 0);

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

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAt((v) => Math.min(flat.length - 1, v + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAt((v) => Math.max(0, v - 1));
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
        {shown.map((g, gi) => (
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
        ))}
      </div>
    </div>
  );
}
