"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

/**
 * Floating Expand/Collapse control pinned to the outer edge of the sidebar.
 * Replaces the invisible drag rail with a visible affordance: it fades in when
 * the sidebar is hovered or the button takes keyboard focus, and the chevron
 * points the way the panel will move. Desktop only — mobile uses the sheet.
 */
export function SidebarEdgeToggle({ className }: { className?: string }) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (isMobile) return null;

  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand" : "Collapse";
  const Icon = collapsed ? ChevronRightIcon : ChevronLeftIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={`${label} sidebar`}
          aria-expanded={!collapsed}
          className={cn(
            "absolute top-1/2 -right-3 z-20 hidden size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-background text-muted-foreground opacity-0 shadow-xs outline-hidden transition-[opacity,color,background-color] duration-(--duration-base) ease-(--ease-standard) md:flex",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            // Revealed on sidebar hover, and always while focused so keyboard
            // users can see what they've landed on.
            "group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            className
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
