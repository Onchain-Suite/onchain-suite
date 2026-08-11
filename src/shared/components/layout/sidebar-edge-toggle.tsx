"use client";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

// Half of the grip - 8×2, so the pair reads as a single 16×2 line. Only the
// outer ends are rounded (`rounded-t/b-full`); rounding the joint too would
// pinch the middle and give away that this is two elements.
const SEGMENT =
  // `rotate`, not `transform`: Tailwind v4's rotate-* utilities set the
  // standalone CSS rotate property, so transitioning `transform` would leave
  // the bend snapping instantly.
  "block h-2 w-0.5 bg-foreground/40 transition-[rotate,background-color] duration-(--duration-fast) ease-standard group-hover/edge:bg-foreground/60 group-focus-visible/edge:bg-foreground/60";

const TILT =
  "group-hover/edge:rotate-[40deg] group-focus-visible/edge:rotate-[40deg]";
const TILT_BACK =
  "group-hover/edge:-rotate-[40deg] group-focus-visible/edge:-rotate-[40deg]";

/**
 * Expand/Collapse control pinned to the outer edge of the sidebar, replacing
 * the invisible drag rail. At rest it's a thin vertical grip; on hover or focus
 * the grip *becomes* a caret - it's two halves that pivot about their shared
 * joint, so the line bends rather than swapping for an icon. The tip points the
 * way the panel will move. Desktop only - mobile uses the sheet.
 */
export function SidebarEdgeToggle({ className }: { className?: string }) {
  const { state, toggleSidebar, isMobile } = useSidebar();

  if (isMobile) return null;

  const collapsed = state === "collapsed";
  const label = collapsed ? "Expand" : "Collapse";

  // Each half pivots about the joint (the shared inner end), never about its
  // outer tip - pivoting about the tips would tear the line apart mid-morph.
  // Collapsed points the caret right (›), expanded points it left (‹).
  const upper = collapsed ? TILT_BACK : TILT;
  const lower = collapsed ? TILT : TILT_BACK;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={`${label} sidebar`}
          aria-expanded={!collapsed}
          className={cn(
            "group/edge absolute top-1/2 -right-3 z-20 hidden h-12 w-6 -translate-y-1/2 cursor-pointer flex-col items-center justify-center rounded-full outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring md:flex",
            // Offsets are measured from the container's padding box. The
            // floating/inset variants pad the container by 8px, so the card's
            // edge sits 8px further in - pull the button back to straddle it.
            "group-data-[variant=floating]:-right-1 group-data-[variant=inset]:-right-1",
            className
          )}
        >
          <span
            aria-hidden="true"
            className={cn(SEGMENT, "origin-bottom rounded-t-full", upper)}
          />
          <span
            aria-hidden="true"
            className={cn(SEGMENT, "origin-top rounded-b-full", lower)}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
