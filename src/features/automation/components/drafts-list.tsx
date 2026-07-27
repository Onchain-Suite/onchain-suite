import {
  ArrowRightIcon,
  BoltIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { formatDateTime, formatRelativeTime } from "@/lib/date";

import { type Draft } from "@/features/automation/types";

interface DraftsListProps {
  drafts: Draft[];
  onDelete: (draft: Draft) => void;
}

export const DraftsList = ({ drafts, onDelete }: DraftsListProps) => {
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <PencilSquareIcon
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
        <h3 className="mt-4 text-lg font-semibold text-foreground">
          No drafts yet
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Start creating a new automation and your unfinished work will show up
          here so you can pick up where you left off.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(14rem,1fr))]"
    >
      {drafts.map((draft) => (
        <motion.div
          layout
          key={draft.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/70 hover:shadow-md hover:shadow-amber-500/10"
        >
          {/* amber WIP accent stripe */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-400/40 to-transparent"
          />

          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
              <PencilSquareIcon className="h-3 w-3" aria-hidden="true" />
              Draft
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="-mr-1 rounded-lg p-1 text-muted-foreground opacity-0 transition-colors hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                  <EllipsisHorizontalIcon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(draft)}
                >
                  Delete draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="mt-2.5 text-sm font-semibold leading-snug text-foreground">
            {draft.name || "Untitled automation"}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {draft.description?.trim()
              ? draft.description
              : "Not finished yet, a few steps left before this can go live."}
          </p>

          {/* trigger summary */}
          <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            <BoltIcon className="h-3 w-3 text-amber-500" aria-hidden="true" />
            <span className="truncate">
              {draft.trigger?.event || "No trigger set"}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-muted-foreground">
            <span
              className="flex items-center gap-1.5"
              title={formatDateTime(draft.lastEdited)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Saved {formatRelativeTime(draft.lastEdited) || "recently"}
            </span>
            <Link
              href={`/automations/${draft.id}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/40 px-2 py-1 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-500 hover:text-white dark:text-amber-300"
            >
              Resume
              <ArrowRightIcon
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
