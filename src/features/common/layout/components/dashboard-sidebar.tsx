"use client";

import { useEffect } from "react";

import { useCommandPalette } from "@/components/common/command-palette";
import { NavMain } from "@/components/layout/nav-main";
import { NavSecondary } from "@/components/layout/nav-secondary";
import type { NavItem } from "@/components/layout/nav-utils";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { SidebarEdgeToggle } from "@/components/layout/sidebar-edge-toggle";
import { SidebarSearch } from "@/components/layout/sidebar-search";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { useGetLogo } from "@/hooks/client";

import { BrandLogo } from "./brand-logo";
import { NavUserMenu } from "./nav-user-menu";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { defaultLogos } from "@/shared/hooks/client/use-get-logo";

interface DashboardSidebarProps {
  navMain: NavItem[];
  navSecondary: NavItem[];
  hasActiveOrganization: boolean;
  userFullName?: string;
  userId?: string;
  userImageUrl?: string;
}

export function DashboardSidebar({
  navMain,
  navSecondary,
  hasActiveOrganization,
  userFullName,
  userId,
  userImageUrl,
}: DashboardSidebarProps) {
  const palette = useCommandPalette();
  const { lightIcon, darkIcon, favicon, isCustom } = useGetLogo();

  // Org branding owns the tab icon; carried over from the old navbar so
  // white-labelled workspaces keep their favicon.
  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [favicon]);

  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <SidebarBrand
          name="OnchainSuite"
          href={PRIVATE_ROUTES.DASHBOARD}
          // Neutral tile: the org's own logo shouldn't sit on a brand fill.
          markClassName="bg-muted text-foreground"
          mark={
            <>
              {/* Org logos can live on hosts outside next.config's
                  remotePatterns — BrandLogo skips the optimizer for those and
                  falls back to the platform mark when the URL is stale. */}
              <BrandLogo
                src={lightIcon}
                fallbackSrc={defaultLogos.lightIcon}
                size={18}
                alt=""
                className="dark:hidden"
                unoptimized={isCustom}
              />
              <BrandLogo
                src={darkIcon}
                fallbackSrc={defaultLogos.darkIcon}
                size={18}
                alt=""
                className="hidden dark:block"
                unoptimized={isCustom}
              />
            </>
          }
        />
        {hasActiveOrganization ? (
          <SidebarSearch onClick={() => palette.open()} />
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <NavMain label="Platform" items={navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavSecondary items={navSecondary} />
        <SidebarSeparator className="mx-0" />
        <NavUserMenu
          fullName={userFullName}
          userId={userId}
          imageUrl={userImageUrl}
          showName={hasActiveOrganization}
        />
      </SidebarFooter>

      <SidebarEdgeToggle />
    </Sidebar>
  );
}
