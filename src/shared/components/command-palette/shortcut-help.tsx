"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { GO_TO } from "./palette-data";

/*
 * Keyboard shortcuts (2.7, 7 Nov 2026). A small set that follows the tools
 * people already use (Linear, Gmail, GitHub): G then a letter jumps to a
 * section, J and K walk a list, Enter opens the row, ⌘K finds anything and ?
 * shows this list. None of them fire while you are typing in a field.
 */
export function ShortcutHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <section className="space-y-4">
            <Group
              title="Anywhere"
              rows={[
                ["Find anything, or ask", ["⌘", "K"]],
                ["Same, one key", ["/"]],
                ["This list", ["?"]],
              ]}
            />
            <Group
              title="In a list"
              rows={[
                ["Next row", ["J"]],
                ["Previous row", ["K"]],
                ["Open it", ["Enter"]],
              ]}
            />
          </section>
          <section>
            <Group
              title="Go to"
              rows={GO_TO.map((g) => [
                g.label,
                ["G", g.key === "," ? "," : g.key.toUpperCase()],
              ])}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ title, rows }: { title: string; rows: [string, string[]][] }) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-medium text-(--text-tertiary)">
        {title}
      </h3>
      <dl className="space-y-1">
        {rows.map(([label, keys]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-(--text-secondary)">{label}</dt>
            <dd className="flex gap-1">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-(--border-subtle) bg-(--tint-hover) px-1 font-mono text-[11px] text-(--text-secondary)"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
