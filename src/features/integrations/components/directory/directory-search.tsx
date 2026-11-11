"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Icon } from "@/shared/components/common/hugeicon";

/** The search box over a directory: one field that spans every category. */
export function DirectorySearch({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The field's accessible name ("Search sources"). */
  label: string;
  placeholder: string;
}) {
  return (
    <div className="flex h-11 items-center gap-2.5 rounded-xl border border-(--border-default) bg-card px-3.5 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/15">
      <Icon
        icon={Search01Icon}
        className="size-4 shrink-0 text-(--text-tertiary)"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        aria-label={label}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-(--text-primary) outline-none placeholder:text-(--text-tertiary)"
      />
      {value.trim() ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-(--tint-hover) text-(--text-tertiary) hover:text-(--text-primary)"
        >
          <Icon icon={Cancel01Icon} className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
