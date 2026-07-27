"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

/**
 * Search affordance in the sidebar header. Reads as an input when expanded and
 * shrinks to an icon button (with a tooltip) on the collapsed rail.
 */
export function SidebarSearch({ onClick }: { onClick?: () => void }) {
  const { state, isMobile } = useSidebar();
  // Resolved after mount so SSR and client agree; the slot keeps a fixed width
  // so filling it in doesn't shift the row.
  const [shortcut, setShortcut] = useState<string | null>(null);

  useEffect(() => {
    setShortcut(navigator.userAgent.includes("Mac") ? "⌘K" : "Ctrl K");
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          // Labelled explicitly: the visible text is display:none on the rail,
          // which also drops it from the accessibility tree.
          aria-label="Search"
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 text-sm text-muted-foreground outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="group-data-[collapsible=icon]:hidden">
            Search...
          </span>
          {/* Slot holds its width from first paint so resolving the shortcut
              doesn't shift the row — but stays chromeless until then, rather
              than flashing an empty key cap. */}
          <kbd
            className={cn(
              "pointer-events-none ml-auto flex h-5 min-w-10 items-center justify-center rounded px-1.5 font-mono text-[10px] font-medium select-none group-data-[collapsible=icon]:hidden",
              shortcut && "border border-sidebar-border bg-surface-subtle"
            )}
            aria-hidden="true"
          >
            {shortcut}
          </kbd>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" hidden={state !== "collapsed" || isMobile}>
        Search
      </TooltipContent>
    </Tooltip>
  );
}
