"use client";

import {
  ArrowTurnBackwardIcon,
  Loading03Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { cn } from "@/lib/utils";

import { CREATE_ITEMS, DESTINATIONS } from "./palette-data";
import { buildRows, type PaletteRow } from "./palette-model";
import { readRecent } from "./recent";
import { usePaletteRecords } from "./use-palette-records";
import { Icon } from "@/shared/components/common/hugeicon";

/*
 * ⌘K, the one door (2.7 reference, 7 Nov 2026). It finds any contact,
 * campaign, Loop, form or segment by name, makes anything, goes to any page,
 * and when nothing fits offers to ask Intelligence the question as typed.
 *
 * Keyboard first: the arrows move, Enter opens, Escape closes. The input is a
 * combobox driving the list through aria-activedescendant, so the options
 * themselves only take the mouse.
 */
export function CommandPaletteDialog({
  open,
  onOpenChange,
  initialQuery,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Text to start with, e.g. when opened from a search field. */
  initialQuery: string;
  onSelect: (row: PaletteRow) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-[12vh] max-w-[600px] translate-y-0 gap-0 overflow-hidden rounded-xl border border-(--border-subtle) bg-(--bg-main) p-0 shadow-(--elevation-3) sm:max-w-[600px]"
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        {/* Remounted on every open, so the query and selection start fresh. */}
        {open ? (
          <PaletteBody initialQuery={initialQuery} onSelect={onSelect} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({
  initialQuery,
  onSelect,
}: {
  initialQuery: string;
  onSelect: (row: PaletteRow) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  // Read once per open: what you opened last time, not what you open now.
  const [recent] = useState(readRecent);
  const { records, searching } = usePaletteRecords(true, query);

  const rows = useMemo(
    () =>
      buildRows(query, {
        recent,
        records,
        creates: CREATE_ITEMS,
        destinations: DESTINATIONS,
      }),
    [query, recent, records]
  );

  // A new result set starts at the top; a shorter one never points past its end.
  useEffect(() => setActive(0), [query]);
  const current = Math.min(active, Math.max(0, rows.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [current]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(rows.length - 1, current + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(0, current - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[current];
      if (row) onSelect(row);
    }
  };

  const typed = query.trim().length > 0;
  const onlyAsk = typed && rows.length === 1 && !searching;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-(--border-subtle) px-4 py-3">
        <Icon
          icon={searching ? Loading03Icon : Search01Icon}
          className={cn(
            "size-[18px] shrink-0 text-(--text-tertiary)",
            searching && "animate-spin"
          )}
        />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search people, campaigns, Loops... or ask a question"
          aria-label="Search"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={
            rows[current] ? `palette-${current}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          data-palette-input=""
          className="h-7 flex-1 bg-transparent text-[15px] text-(--text-primary) outline-none placeholder:text-(--text-tertiary)"
        />
        <kbd className="shrink-0 rounded border border-(--border-subtle) px-1.5 py-0.5 font-mono text-[10px] text-(--text-tertiary)">
          esc
        </kbd>
      </div>

      <div
        ref={listRef}
        id="palette-list"
        role="listbox"
        aria-label="Results"
        className="max-h-[min(60vh,440px)] overflow-y-auto p-1.5"
      >
        {onlyAsk ? (
          <p className="px-3 pt-2 pb-1 text-xs text-(--text-tertiary)">
            Nothing in your workspace is called that.
          </p>
        ) : null}
        {rows.map((row, i) => {
          const heading =
            row.group !== "Ask" && row.group !== rows[i - 1]?.group;
          const on = i === current;
          return (
            <div key={row.key}>
              {heading ? (
                <div
                  aria-hidden="true"
                  className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium text-(--text-tertiary)"
                >
                  {row.group}
                </div>
              ) : null}
              {/* Keyboard drives the combobox above; options take the mouse. */}
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
              <div
                id={`palette-${i}`}
                data-index={i}
                role="option"
                aria-selected={on}
                tabIndex={-1}
                onMouseMove={() => {
                  if (!on) setActive(i);
                }}
                onClick={() => onSelect(row)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2",
                  on ? "bg-(--tint-hover)" : "bg-transparent",
                  row.group === "Ask" && "mt-1"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg border border-(--border-subtle)",
                    row.group === "Ask"
                      ? "bg-primary/10 text-primary"
                      : "bg-card text-(--text-secondary)"
                  )}
                >
                  <Icon icon={row.icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-(--text-primary)">
                    {row.title}
                  </span>
                  {row.sub ? (
                    <span className="block truncate text-xs text-(--text-tertiary)">
                      {row.sub}
                    </span>
                  ) : null}
                </span>
                {on ? (
                  <Icon
                    icon={ArrowTurnBackwardIcon}
                    className="size-3.5 shrink-0 text-(--text-tertiary)"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="flex items-center gap-4 border-t border-(--border-subtle) px-4 py-2 text-[11px] text-(--text-tertiary)"
      >
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span>
          <Kbd>↵</Kbd> open
        </span>
        <span>
          <Kbd>?</Kbd> all shortcuts
        </span>
      </div>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded border border-(--border-subtle) px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}
