"use client";

import {
  ArrowRightOnRectangleIcon,
  CheckIcon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

/**
 * Account row pinned to the bottom of the sidebar. Shows the signed-in user
 * with their active workspace as a subtitle, and folds workspace switching and
 * account actions into a single menu (matching the reference shell, which
 * merges the old header org-switcher into this block).
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
    organizations,
    activeOrg,
    confirmedActiveOrgId,
    isLoading,
    isMounted,
    switchOrg,
  } = useOrgSwitcherContext();

  const displayName = fullName && fullName.length > 0 ? fullName : "User";
  const initials = fullName ? getInitials(fullName) : "U";
  const avatarColor = userId ? getAvatarColor(userId) : undefined;
  const showImage = imageUrl && isValidImageUrl(imageUrl) && !imgError;
  // Org name comes from client-only storage — hold it until mount so the
  // server and first client render agree (no hydration mismatch).
  const orgName = showName && isMounted ? activeOrg?.name : undefined;

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
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm leading-none font-medium">{displayName}</p>
            </DropdownMenuLabel>

            {organizations.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Workspaces
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onSelect={() => switchOrg(org.id)}
                      className="cursor-pointer"
                    >
                      <Avatar className="mr-2 size-6 ring-1 ring-border/50">
                        {(org.logo ?? org.logoUrl) ? (
                          <AvatarImage
                            src={org.logo ?? org.logoUrl}
                            alt={org.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-[10px]">
                          {org.name.substring(0, 2).toUpperCase()}
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
                  ))}
                </DropdownMenuGroup>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                router.push(`${PRIVATE_ROUTES.SETTINGS}?tab=profile`)
              }
            >
              <UserIcon aria-hidden="true" className="mr-2 size-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(PRIVATE_ROUTES.SETTINGS)}
            >
              <Cog6ToothIcon aria-hidden="true" className="mr-2 size-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <ArrowRightOnRectangleIcon
                aria-hidden="true"
                className="mr-2 size-4"
              />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
