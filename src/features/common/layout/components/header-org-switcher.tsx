"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";

import { useOrgSwitcherContext } from "./org-switcher-context";

const initialsOf = (name: string) =>
  (name.trim().slice(0, 2) || "?").toUpperCase();

/**
 * Compact workspace switcher for the top bar (beside search). Shows the active
 * org with its logo and a dropdown to switch — a visible, first-class control
 * rather than being tucked into the account menu.
 */
export function HeaderOrgSwitcher() {
  const {
    organizations,
    activeOrg,
    activeOrgLogo,
    confirmedActiveOrgId,
    isLoading,
    isMounted,
    hasResolved,
    switchOrg,
  } = useOrgSwitcherContext();

  // Hold a skeleton until org state resolves from client storage — avoids a
  // hydration mismatch and the empty/"no workspace" flash on first paint.
  if (!isMounted || (!hasResolved && organizations.length === 0)) {
    return <Skeleton className="h-9 w-9 rounded-lg sm:w-44" />;
  }

  const name = activeOrg?.name ?? "Select workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch workspace"
          className="flex h-9 w-auto items-center gap-2 rounded-lg border border-border bg-background px-2 text-sm transition-colors hover:bg-muted data-[state=open]:bg-muted sm:w-44 sm:px-2.5"
        >
          <Avatar className="size-6 shrink-0 rounded-md ring-1 ring-border/60">
            {activeOrgLogo ? (
              <AvatarImage src={activeOrgLogo} alt={name} />
            ) : null}
            <AvatarFallback className="rounded-md text-[10px] font-semibold">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-1 truncate text-left font-medium text-foreground sm:block">
            {isLoading ? "Switching…" : name}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground sm:ml-1"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-(--radix-dropdown-menu-trigger-width) min-w-44 rounded-lg"
      >
        <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {organizations.length > 0 ? (
          organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onSelect={() => switchOrg(org.id)}
              className="cursor-pointer"
            >
              <Avatar className="mr-2 size-6 rounded-md ring-1 ring-border/50">
                {(org.logo ?? org.logoUrl) ? (
                  <AvatarImage src={org.logo ?? org.logoUrl} alt={org.name} />
                ) : null}
                <AvatarFallback className="rounded-md text-[10px]">
                  {initialsOf(org.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{org.name}</span>
              <CheckIcon
                aria-hidden="true"
                className={cn(
                  "ml-auto size-4 text-primary",
                  confirmedActiveOrgId === org.id ? "opacity-100" : "opacity-0"
                )}
              />
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No workspaces yet
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
