"use client";

import {
  ArrowRightOnRectangleIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { signOut } from "@/lib/auth-client";
import { getAvatarColor, getInitials, isValidImageUrl } from "@/lib/user-utils";
import { cn } from "@/lib/utils";

import { useOrgSwitcherContext } from "./org-switcher-context";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const orgInitials = (name: string) =>
  (name.trim().slice(0, 2) || "?").toUpperCase();

/**
 * Account row pinned to the bottom of the sidebar. The trigger shows the
 * signed-in user; the menu is workspace-centric (matching the reference shell):
 * a workspace header, invite/settings actions, a Switch workspace submenu that
 * absorbs the old top-bar org-switcher, and sign out.
 */
export function NavUserMenu({
  fullName,
  userId,
  imageUrl,
  showName = true,
}: {
  fullName?: string;
  userId?: string;
  imageUrl?: string;
  /** Hidden while no organization is selected, matching the old shell. */
  showName?: boolean;
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [imgError, setImgError] = useState(false);
  const {
    activeOrg,
    activeOrgLogo,
    organizations,
    confirmedActiveOrgId,
    switchOrg,
    isLoading,
    isMounted,
  } = useOrgSwitcherContext();

  const displayName = fullName && fullName.length > 0 ? fullName : "User";
  const initials = fullName ? getInitials(fullName) : "U";
  const avatarColor = userId ? getAvatarColor(userId) : undefined;
  const showImage = imageUrl && isValidImageUrl(imageUrl) && !imgError;
  // Org name comes from client-only storage - hold it until mount so the
  // server and first client render agree (no hydration mismatch).
  const orgName = showName && isMounted ? activeOrg?.name : undefined;
  const workspaceName = orgName ?? "Workspace";

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="Open account menu"
              disabled={isLoading}
              className="gap-2.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
            >
              <Avatar className="size-8 shrink-0 ring-1 ring-border">
                {showImage ? (
                  <AvatarImage
                    alt={displayName}
                    src={imageUrl}
                    loading="lazy"
                    onError={() => setImgError(true)}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback
                  style={{ backgroundColor: avatarColor, color: "#fff" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              {showName ? (
                <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold">
                    {displayName}
                  </span>
                  {orgName ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {isLoading ? "Switching…" : orgName}
                    </span>
                  ) : null}
                </div>
              ) : null}
              <ChevronUpDownIcon
                aria-hidden="true"
                className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {/* Workspace header */}
            <DropdownMenuLabel className="flex items-center gap-2.5 py-2 font-normal">
              <Avatar className="size-8 shrink-0 rounded-md ring-1 ring-border/60">
                {activeOrgLogo ? (
                  <AvatarImage src={activeOrgLogo} alt={workspaceName} />
                ) : null}
                <AvatarFallback className="rounded-md text-xs font-semibold">
                  {orgInitials(workspaceName)}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 leading-tight">
                <span className="truncate text-sm font-semibold text-foreground">
                  {workspaceName}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Workspace
                </span>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                router.push(`${PRIVATE_ROUTES.SETTINGS}?tab=account`)
              }
            >
              <PaperAirplaneIcon aria-hidden="true" className="mr-2 size-4" />
              <span>Invite people</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                router.push(`${PRIVATE_ROUTES.SETTINGS}?tab=account`)
              }
            >
              <Cog6ToothIcon aria-hidden="true" className="mr-2 size-4" />
              <span>Workspace settings</span>
            </DropdownMenuItem>

            {/* Switch workspace (absorbs the old top-bar org-switcher) */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowsRightLeftIcon
                  aria-hidden="true"
                  className="mr-2 size-4"
                />
                <span>Switch workspace</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56">
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
                          <AvatarImage
                            src={org.logo ?? org.logoUrl}
                            alt={org.name}
                          />
                        ) : null}
                        <AvatarFallback className="rounded-md text-[10px]">
                          {orgInitials(org.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{org.name}</span>
                      <CheckIcon
                        aria-hidden="true"
                        className={cn(
                          "ml-auto size-4 text-primary",
                          confirmedActiveOrgId === org.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No workspaces yet
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <ArrowRightOnRectangleIcon
                aria-hidden="true"
                className="mr-2 size-4"
              />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
