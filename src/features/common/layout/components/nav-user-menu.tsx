"use client";

import {
  ArrowRightOnRectangleIcon,
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

import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * Account row pinned to the bottom of the sidebar. Carries over the avatar and
 * menu that used to sit in the old navbar's footer; collapses to just the
 * avatar on the icon rail.
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

  const displayName = fullName && fullName.length > 0 ? fullName : "User";
  const initials = fullName ? getInitials(fullName) : "U";
  const avatarColor = userId ? getAvatarColor(userId) : undefined;
  const showImage = imageUrl && isValidImageUrl(imageUrl) && !imgError;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="Open user menu"
              className="gap-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
              ) : null}
              <ChevronUpDownIcon
                aria-hidden="true"
                className="ml-auto size-4 text-muted-foreground"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm leading-none font-medium">{displayName}</p>
            </DropdownMenuLabel>
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
