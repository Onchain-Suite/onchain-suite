"use client";

import {
  ArrowDataTransferHorizontalIcon,
  Bug01Icon,
  KeyboardIcon,
  Logout01Icon,
  MapsIcon,
  SentIcon,
  Settings02Icon,
  Tick02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CerebraBugReport } from "@/features/intelligence/components/cerebra/cerebra-bug-report";
import { startTour } from "@/features/onboarding/hooks/use-tour";
import { useCommandPalette } from "@/shared/components/command-palette";
import { Icon } from "@/shared/components/common/hugeicon";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

const MENU_ICON = "mr-2 size-4";

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
  const palette = useCommandPalette();
  const [imgError, setImgError] = useState(false);
  // Report a problem used to live in the floating assistant; that is gone
  // (⌘K is the one door), so it opens from here.
  const [reportOpen, setReportOpen] = useState(false);
  const {
    activeOrg,
    activeOrgLogo,
    organizations,
    confirmedActiveOrgId,
    switchOrg,
    isLoading,
    isMounted,
  } = useOrgSwitcherContext();

  // Identity (name/avatar) and org name are client-only. Hold them until mount
  // so the server and first client render agree - otherwise the avatar renders
  // "U"/no-color on the server and the real initials/color on the client,
  // which trips a hydration mismatch.
  const displayName =
    isMounted && fullName && fullName.length > 0 ? fullName : "User";
  const initials = isMounted && fullName ? getInitials(fullName) : "U";
  const avatarColor = isMounted && userId ? getAvatarColor(userId) : undefined;
  const showImage =
    isMounted && imageUrl && isValidImageUrl(imageUrl) && !imgError;
  const orgName = showName && isMounted ? activeOrg?.name : undefined;
  const workspaceName = orgName ?? "Workspace";

  // `showName` is derived from client-only org state, so gating the name block's
  // *presence* on it directly makes the server and first client render disagree
  // (hydration mismatch). Keep the block mounted until we're client-side, then
  // honor showName - so the initial DOM is identical on both sides.
  const showNameBlock = !isMounted || showName;

  return (
    <>
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
                {showNameBlock ? (
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
                <Icon
                  icon={UnfoldMoreIcon}
                  className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-md p-1"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              {/* Workspace header */}
              <DropdownMenuLabel className="flex items-center gap-2 py-1.5 font-normal">
                <Avatar className="size-7 shrink-0 rounded-md ring-1 ring-border/60">
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
              {/* Settings has no sidebar row: workspace-level controls live here. */}
              <DropdownMenuItem
                onClick={() =>
                  router.push(`${PRIVATE_ROUTES.SETTINGS}?tab=account`)
                }
              >
                <Icon icon={Settings02Icon} className={MENU_ICON} />
                <span>Workspace settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`${PRIVATE_ROUTES.SETTINGS}?tab=team`)
                }
              >
                <Icon icon={SentIcon} className={MENU_ICON} />
                <span>Invite people</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={startTour}>
                <Icon icon={MapsIcon} className={MENU_ICON} />
                <span>Take the tour</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={palette.openShortcuts}>
                <Icon icon={KeyboardIcon} className={MENU_ICON} />
                <span>Keyboard shortcuts</span>
                <kbd className="ml-auto font-mono text-[11px] text-muted-foreground">
                  ?
                </kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Icon icon={Bug01Icon} className={MENU_ICON} />
                <span>Report a problem</span>
              </DropdownMenuItem>

              {/* Switch workspace (absorbs the old top-bar org-switcher) */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Icon
                    icon={ArrowDataTransferHorizontalIcon}
                    className={MENU_ICON}
                  />
                  <span>Switch workspace</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-52 rounded-md p-1">
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
                        <Icon
                          icon={Tick02Icon}
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
                <Icon icon={Logout01Icon} className={MENU_ICON} />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              Tell us what went wrong. Screenshots help; the team gets it by
              email.
            </DialogDescription>
          </DialogHeader>
          <CerebraBugReport />
        </DialogContent>
      </Dialog>
    </>
  );
}
