"use client";

import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface PropertySelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface PropertySelectProps {
  value: string;
  options: PropertySelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Themed, animated single-select used across the automation Properties panel.
 * Replaces native <select> so the menu can be styled and animated. Fully
 * keyboard accessible (Enter/Space/ArrowUp/ArrowDown/Escape/Home/End) and closes
 * on outside click. Colors derive from semantic tokens so light + dark both work.
 */
export function PropertySelect({
  value,
  options,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className = "",
}: PropertySelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // When opening, focus the currently-selected option.
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.children[activeIndex] as
      HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const commit = useCallback(
    (idx: number) => {
      const opt = options[idx];
      if (!opt) return;
      onChange(opt.value);
      close();
    },
    [options, onChange, close]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-background px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? "border-primary/50 ring-1 ring-primary/30"
            : "border-border hover:border-primary/30"
        }`}
      >
        <span
          className={`truncate ${
            selected ? "text-foreground" : "text-muted-foreground/60"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronUpDownIcon
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? "text-primary" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="scrollbar-sleek absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)]"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No options
              </li>
            ) : (
              options.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={opt.value || opt.label}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => commit(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        commit(idx);
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground"
                    } ${isSelected ? "font-medium text-foreground" : ""}`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {opt.label}
                      {opt.hint ? (
                        <span className="ml-1 text-[11px] text-muted-foreground/70">
                          {opt.hint}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <CheckIcon
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-primary"
                      />
                    ) : null}
                  </li>
                );
              })
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PropertySelect;

/**
 * Styling for the property panel's non-select fields, kept beside PropertySelect
 * so a panel field looks the same wherever it is rendered from.
 */
export const PROPERTY_LABEL_CLASS =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground";

export const PROPERTY_INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/30";

export const PROPERTY_HINT_CLASS =
  "text-[11px] leading-5 text-muted-foreground";
