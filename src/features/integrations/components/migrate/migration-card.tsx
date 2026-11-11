"use client";

import {
  CheckmarkCircle02Icon,
  File01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";

import type { Migration } from "../../types/sources";
import type { MigrationCoverage } from "../../utils/sources";
import { SourceMark } from "../sources/source-visuals";
import { Icon } from "@/shared/components/common/hugeicon";

const COVERAGE: Record<
  MigrationCoverage,
  { label: string; icon: typeof File01Icon; tone: string }
> = {
  full: {
    label: "Everything comes across",
    icon: CheckmarkCircle02Icon,
    tone: "text-(--status-success-text)",
  },
  partial: {
    label: "Some data stays behind",
    icon: InformationCircleIcon,
    tone: "text-(--text-tertiary)",
  },
  file: {
    label: "Comes in as a CSV export",
    icon: File01Icon,
    tone: "text-(--text-tertiary)",
  },
};

/**
 * One tool you can migrate from, laid out like a source card next door. It
 * says what comes across, and whether anything stays behind, before anything
 * starts: someone leaving a tool already knows which tool, what they need to
 * know is what they lose.
 */
export function MigrationCard({
  migration,
  categoryLabel,
  coverage,
  connected,
  onOpen,
}: {
  migration: Migration;
  categoryLabel: string;
  coverage: MigrationCoverage;
  connected: boolean;
  onOpen: (migration: Migration) => void;
}) {
  const c = COVERAGE[coverage];
  return (
    <button
      type="button"
      onClick={() => onOpen(migration)}
      className="flex h-full flex-col gap-2 rounded-xl border border-(--border-subtle) bg-card p-3 text-left transition-[border-color,box-shadow] hover:border-(--border-default) hover:shadow-(--elevation-1) focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
    >
      <span className="flex items-start gap-3">
        <SourceMark source={migration} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-medium text-(--text-primary)">
            <span className="truncate">{migration.name}</span>
            {connected ? (
              <span
                role="img"
                aria-label="Connected"
                className="shrink-0 text-(--status-success-text)"
              >
                <Icon icon={CheckmarkCircle02Icon} className="size-3.5" />
              </span>
            ) : null}
          </span>
          <span className="block truncate text-xs text-(--text-tertiary)">
            {categoryLabel}
          </span>
        </span>
      </span>

      <span className="line-clamp-2 text-xs text-(--text-secondary)">
        {migration.brings}
      </span>

      <span
        className={`mt-auto inline-flex items-center gap-1 pt-1 text-[11px] font-medium ${c.tone}`}
      >
        <Icon icon={c.icon} className="size-3" />
        {c.label}
      </span>
    </button>
  );
}
