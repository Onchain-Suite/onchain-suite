"use client";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  LockOpenIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useGetLogo } from "@/hooks/client";
import { signOut } from "@/lib/auth-client";
import { getAvatarColor, getInitials, isValidImageUrl } from "@/lib/user-utils";
import { cn } from "@/lib/utils";

import { BrandLogo } from "./brand-logo";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { defaultLogos } from "@/shared/hooks/client/use-get-logo";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Work-in-progress section: rendered faded, routes to a coming-soon panel. */
  wip?: boolean;
}

interface DashboardNavbarProps {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  navItems: NavItem[];
  activePath: string;
  unreadCount: number;
  isLocked: boolean;
  onToggleLock: () => void;
  userFullName?: string;
  userId?: string;
  userImageUrl?: string;
  hasActiveOrganization?: boolean;
}

export function DashboardNavbar({
  isCollapsed,
  setCollapsed,
  navItems,
  activePath,
  unreadCount,
  isLocked,
  onToggleLock,
  userFullName,
  userId,
  userImageUrl,
  hasActiveOrganization = true,
}: DashboardNavbarProps) {
  const router = useRouter();
  const initials = userFullName ? getInitials(userFullName) : "U";
  const displayName =
    userFullName && userFullName.length > 0 ? userFullName : "User";
  const avatarColor = userId ? getAvatarColor(userId) : undefined;
  const logoData = useGetLogo();
  const { lightIcon, darkIcon, favicon, isCustom } = logoData;

  useEffect(() => {
    if (favicon) {
      let link: HTMLLinkElement | null =
        document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = favicon;
    }
  }, [favicon]);

  const [imgError, setImgError] = useState(false);
  const validImage = userImageUrl && isValidImageUrl(userImageUrl);

  return (
    <aside
      className={cn(
        // Hidden below lg - mobile navigation lives in the header's sheet menu.
        "fixed inset-y-0 left-0 z-30 transition-all duration-300 max-lg:hidden",
        isCollapsed ? "w-20" : "w-64"
      )}
      onMouseEnter={() => {
        if (!isLocked) setCollapsed(false);
      }}
      onMouseLeave={() => {
        if (!isLocked) setCollapsed(true);
      }}
    >
      <div
        className={cn(
          "m-3 h-[calc(100%-1.5rem)] rounded-2xl bg-card border border-border",
          "shadow-[0_10px_40px_rgba(34,42,53,0.08),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04)]",
          "backdrop-blur-md",
          "flex flex-col items-center justify-between"
        )}
      >
        <div className="w-full p-4 flex flex-col items-center gap-4">
          <Link
            href={PRIVATE_ROUTES.DASHBOARD}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground"
            )}
          >
            {/* Org-branded logos can live on arbitrary hosts (backend/storage)
                that aren't in next.config images.remotePatterns - skip the
                optimizer for them, and fall back to the platform logo when
                the branded URL fails to load. */}
            <BrandLogo
              src={lightIcon}
              fallbackSrc={defaultLogos.lightIcon}
              size={20}
              alt="Onchain Logo"
              className="dark:hidden"
              unoptimized={isCustom}
            />
            <BrandLogo
              src={darkIcon}
              fallbackSrc={defaultLogos.darkIcon}
              size={20}
              alt="Onchain Logo"
              className="hidden dark:block"
              unoptimized={isCustom}
            />
          </Link>

          <TooltipProvider>
            <nav className="mt-2 flex flex-col items-center gap-2 w-full">
              {navItems.map((item) => {
                const active =
                  item.href === PRIVATE_ROUTES.DASHBOARD
                    ? activePath === PRIVATE_ROUTES.DASHBOARD
                    : activePath.startsWith(item.href);
                return (
                  <Tooltip key={`${item.href}-${item.label}`}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center",
                          isCollapsed ? "justify-center" : "justify-start",
                          "gap-3 rounded-full",
                          isCollapsed ? "h-10 w-10" : "h-10 w-full px-3",
                          active
                            ? "bg-accent text-(--brand-oxford-blue) dark:text-foreground shadow-[0_6px_20px_rgba(34,42,53,0.12)]"
                            : "text-(--brand-oxford-blue) dark:text-muted-foreground hover:bg-muted",
                          item.wip && "opacity-50 hover:opacity-80"
                        )}
                      >
                        <div className="h-4 w-4 text-(--brand-blue) dark:text-inherit">
                          {item.icon}
                        </div>
                        {!isCollapsed && (
                          <span className="text-sm text-(--brand-oxford-blue) dark:text-foreground">
                            {item.label}
                          </span>
                        )}
                        {item.label === "Notifications" && unreadCount > 0 && (
                          <span className="absolute right-1 top-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.wip ? `${item.label} - coming in v1` : item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>
        </div>

        <div className="w-full p-4 flex flex-col items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onToggleLock}
            aria-label="Toggle sidebar lock"
            title="Lock sidebar"
          >
            {isLocked ? (
              <LockClosedIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <LockOpenIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full",
                  "focus-visible:outline-2 focus-visible:outline-ring"
                )}
                aria-label="Open user menu"
              >
                <Avatar
                  className="h-8 w-8 lg:h-10 lg:w-10 ring-1 ring-border shadow-sm"
                  aria-label="User avatar"
                  title={displayName}
                >
                  {validImage && !imgError ? (
                    <AvatarImage
                      alt={displayName}
                      src={userImageUrl as string}
                      loading="lazy"
                      onError={() => setImgError(true)}
                      className="object-cover"
                    />
                  ) : null}
                  {!validImage || imgError ? (
                    <AvatarFallback
                      style={{ backgroundColor: avatarColor, color: "#fff" }}
                    >
                      {initials}
                    </AvatarFallback>
                  ) : null}
                </Avatar>
                {!isCollapsed && userFullName && hasActiveOrganization && (
                  <span className="text-sm font-medium">{userFullName}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" side="right">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium leading-none">
                  {displayName}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  router.push(`${PRIVATE_ROUTES.SETTINGS}?tab=profile`)
                }
              >
                <UserIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(PRIVATE_ROUTES.SETTINGS)}
              >
                <Cog6ToothIcon aria-hidden="true" className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive"
              >
                <ArrowRightOnRectangleIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4"
                />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
