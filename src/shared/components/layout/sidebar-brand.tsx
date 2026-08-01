"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

/**
 * Brand row: mark + wordmark on the left, collapse toggle on the right. When
 * the sidebar collapses to the icon rail the row stacks so the mark keeps the
 * top slot and the toggle sits directly beneath it.
 */
export function SidebarBrand({
  name,
  href = "/",
  mark,
  markClassName,
}: {
  name: string;
  href?: string;
  /** Custom brand mark; defaults to the first letter of `name` in a filled tile. */
  mark?: React.ReactNode;
  /** Overrides the tile behind the mark — e.g. a neutral fill for a real logo. */
  markClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-3 group-data-[collapsible=icon]:pt-3">
      <Link
        href={href}
        className="flex min-w-0 items-center gap-2 rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-base font-semibold text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg",
            markClassName
          )}
        >
          {mark ?? name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
          {name}
        </span>
      </Link>
      <SidebarCollapseToggle className="ml-auto group-data-[collapsible=icon]:ml-0" />
    </div>
  );
}

/** Icon-only toggle that mirrors the sidebar state in its label. */
function SidebarCollapseToggle({ className }: { className?: string }) {
  const { state, toggleSidebar } = useSidebar();
  const label = state === "expanded" ? "Collapse sidebar" : "Expand sidebar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={label}
          aria-expanded={state === "expanded"}
          className={cn(
            "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            className
          )}
        >
          {state === "expanded" ? (
            <ChevronLeftIcon className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
