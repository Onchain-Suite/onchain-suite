"use client";

import { useEffect } from "react";

import { NavSections } from "@/components/layout/nav-main";
import type { NavSection } from "@/components/layout/nav-utils";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

import { useGetLogo } from "@/hooks/client";

import { BrandLogo } from "./brand-logo";
import { NavUserMenu } from "./nav-user-menu";
import { QuickCreate } from "./quick-create";
import { GettingStarted } from "@/features/dashboard/components/getting-started";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { defaultLogos } from "@/shared/hooks/client/use-get-logo";

interface DashboardSidebarProps {
  sections: NavSection[];
  userFullName?: string;
  userId?: string;
  userImageUrl?: string;
}

export function DashboardSidebar({
  sections,
  userFullName,
  userId,
  userImageUrl,
}: DashboardSidebarProps) {
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
    // Inset: the sidebar sits on the shell colour and the workspace is one
    // raised panel beside it (2.7 reference frame).
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-0 px-0.5 pt-0 pb-0">
        <SidebarBrand
          name="OnchainSuite"
          href={PRIVATE_ROUTES.DASHBOARD}
          showName={false}
          // Reference logo row: 56px tall, the 26px mark 20px from the edge.
          className="min-h-12 pt-0 pl-2.5 group-data-[collapsible=icon]:pl-0 group-data-[collapsible=icon]:pt-2"
          markClassName="size-auto h-[26px] rounded-none bg-transparent group-data-[collapsible=icon]:size-auto group-data-[collapsible=icon]:h-[26px] group-data-[collapsible=icon]:rounded-none"
          mark={
            <>
              {/* Org logos can live on hosts outside next.config's
                  remotePatterns - BrandLogo skips the optimizer for those and
                  falls back to the platform mark when the URL is stale. */}
              <BrandLogo
                src={lightIcon}
                fallbackSrc={defaultLogos.lightIcon}
                size={26}
                alt=""
                className="h-[26px] w-auto dark:hidden"
                unoptimized={isCustom}
              />
              <BrandLogo
                src={darkIcon}
                fallbackSrc={defaultLogos.darkIcon}
                size={26}
                alt=""
                className="hidden h-[26px] w-auto dark:block"
                unoptimized={isCustom}
              />
            </>
          }
        />
        <QuickCreate />
      </SidebarHeader>

      <SidebarContent className="px-0 pt-3 pb-2 [scrollbar-width:thin]">
        <NavSections sections={sections} />
      </SidebarContent>

      <SidebarFooter className="px-0.5">
        {/* The checklist runs the full sidebar width, as in the reference. */}
        <div className="-mx-2.5 group-data-[collapsible=icon]:mx-0">
          <GettingStarted />
        </div>
        <NavUserMenu
          fullName={userFullName}
          userId={userId}
          imageUrl={userImageUrl}
          showName={Boolean(userFullName)}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
