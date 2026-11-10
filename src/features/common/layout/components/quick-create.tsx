"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { Fragment } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";

import { CREATE_GROUPS } from "@/shared/components/command-palette";
import { Icon } from "@/shared/components/common/hugeicon";

/*
 * Everything you can make, from one place (2.7 reference "Quick create"),
 * grouped as: things that send, people, then views. Each goes to the screen
 * where that thing is actually made. ⌘K offers the same list (CREATE_GROUPS),
 * so the two can never disagree.
 */
const GROUPS = CREATE_GROUPS;

/** The primary action at the top of the sidebar; an icon button on the rail. */
export function QuickCreate() {
  const { state, isMobile } = useSidebar();
  const rail = state === "collapsed" && !isMobile;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={rail ? "Quick create" : undefined}
          className="flex h-[34px] w-full cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-[var(--elevation-xs),inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors outline-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:bg-primary/90 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Icon icon={PlusSignIcon} className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">
            Quick create
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={rail ? "right" : "bottom"}
        align="start"
        sideOffset={6}
        className="w-80 p-1.5"
      >
        {GROUPS.map((group, gi) => (
          <Fragment key={group[0]?.label ?? gi}>
            {gi > 0 ? <DropdownMenuSeparator className="my-1" /> : null}
            {group.map((option) => (
              <DropdownMenuItem
                key={option.label}
                asChild
                className="gap-2.5 px-2 py-1.5"
              >
                <Link href={option.href}>
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-lg border border-(--border-subtle) bg-card text-(--text-secondary)">
                    <Icon icon={option.icon} className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="text-[13.5px] font-medium text-(--text-primary)">
                      {option.label}
                    </span>
                    <span className="truncate text-xs text-(--text-tertiary)">
                      {option.hint}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
