"use client";

import { CheckIcon, PlusIcon, TagIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

interface ApplyTagsPopoverProps {
  /** Tag names already known to the org (for quick selection). */
  availableTags: string[];
  /** Tag names already present on the target(s) - shown as checked. */
  activeTags?: string[];
  /**
   * Apply the chosen tags. Parent owns the mutation + cache invalidation so it
   * can fan the write out across one or many profiles.
   */
  onApply: (tags: string[]) => Promise<void> | void;
  isApplying?: boolean;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
}

export function ApplyTagsPopover({
  availableTags,
  activeTags = [],
  onApply,
  isApplying = false,
  trigger,
  align = "end",
}: ApplyTagsPopoverProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const normalizedQuery = query.trim();
  const activeSet = useMemo(
    () => new Set(activeTags.map((t) => t.toLowerCase())),
    [activeTags]
  );

  const suggestions = useMemo(() => {
    const q = normalizedQuery.toLowerCase();
    return availableTags
      .filter((t) => !activeSet.has(t.toLowerCase()))
      .filter((t) => (q ? t.toLowerCase().includes(q) : true))
      .slice(0, 50);
  }, [availableTags, activeSet, normalizedQuery]);

  const canCreate =
    normalizedQuery.length > 0 &&
    !availableTags.some(
      (t) => t.toLowerCase() === normalizedQuery.toLowerCase()
    ) &&
    !activeSet.has(normalizedQuery.toLowerCase());

  const toggle = (tag: string) =>
    setSelected((prev) =>
      prev.some((t) => t.toLowerCase() === tag.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== tag.toLowerCase())
        : [...prev, tag]
    );

  const reset = () => {
    setQuery("");
    setSelected([]);
  };

  const handleApply = async () => {
    if (selected.length === 0) return;
    try {
      await onApply(selected);
      reset();
      setOpen(false);
    } catch {
      // Parent surfaces the error via toast; keep the popover open for retry.
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!isApplying) {
          setOpen(next);
          if (!next) reset();
        }
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-0">
        <div className="border-b border-border p-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or create a tag…"
            autoComplete="off"
            className="h-9"
          />
        </div>

        <div className="max-h-56 overflow-y-auto p-1">
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                toggle(normalizedQuery);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent/40"
            >
              <PlusIcon
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              Create <span className="font-medium">{normalizedQuery}</span>
            </button>
          )}

          {suggestions.map((tag) => {
            const isSelected = selected.some(
              (t) => t.toLowerCase() === tag.toLowerCase()
            );
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent/40"
              >
                <span className="flex items-center gap-2">
                  <TagIcon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {tag}
                </span>
                {isSelected && (
                  <CheckIcon
                    className="h-4 w-4 text-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {suggestions.length === 0 && !canCreate && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              {availableTags.length === 0
                ? "Type a name to create your first tag."
                : "No matching tags."}
            </p>
          )}
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
            {selected.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border p-2">
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={selected.length === 0 || isApplying}
          >
            {isApplying
              ? "Applying…"
              : `Apply${selected.length > 0 ? ` ${selected.length}` : ""}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
