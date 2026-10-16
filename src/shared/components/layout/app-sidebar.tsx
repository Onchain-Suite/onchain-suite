"use client";

import {
  BoltIcon,
  BookOpenIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  CreditCardIcon,
  LifebuoyIcon,
  PlayIcon,
  SignalIcon,
  Squares2X2Icon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type * as React from "react";

import { useCommandPalette } from "@/components/common/command-palette";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import type { NavItem } from "./nav-utils";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarEdgeToggle } from "./sidebar-edge-toggle";
import { SidebarSearch } from "./sidebar-search";
import { TeamSwitcher } from "./team-switcher";

// Sample data - swap `#` for real routes and the rows light up from the
// pathname on their own (see `isNavActive`).
const data = {
  teams: [
    { name: "Vercel", logo: PlayIcon, plan: "Enterprise" },
    { name: "OnchainSuite", logo: SignalIcon, plan: "Startup" },
    { name: "Evil Corp.", logo: CommandLineIcon, plan: "Free" },
  ],
  navMain: [
    { title: "Overview", url: "#", icon: Squares2X2Icon, isActive: true },
    {
      title: "Customers",
      url: "#",
      icon: UsersIcon,
      items: [
        { title: "Segments", url: "#" },
        { title: "Accounts", url: "#", isActive: true },
        { title: "Health Scores", url: "#" },
      ],
    },
    {
      title: "Subscriptions",
      url: "#",
      icon: CreditCardIcon,
      items: [
        { title: "Plans", url: "#" },
        { title: "Invoices", url: "#" },
        { title: "Renewals", url: "#" },
      ],
    },
    {
      title: "Revenue",
      url: "#",
      icon: ChartBarIcon,
      badge: "dot",
    },
    { title: "Automation", url: "#", icon: BoltIcon },
    { title: "Support", url: "#", icon: LifebuoyIcon },
  ] satisfies NavItem[],
  navSecondary: [
    { title: "Settings", url: "#", icon: Cog6ToothIcon },
    { title: "Invite Team", url: "#", icon: UsersIcon },
    { title: "Documentation", url: "#", icon: BookOpenIcon },
  ] satisfies NavItem[],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const palette = useCommandPalette();

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        <SidebarBrand name="ReUI" />
        <SidebarSearch onClick={() => palette.open()} />
      </SidebarHeader>

      <SidebarContent>
        <NavMain label="Platform" items={data.navMain} />
      </SidebarContent>

      {/* Utility links, then the workspace switcher pinned to the bottom. */}
      <SidebarFooter>
        <NavSecondary items={data.navSecondary} />
        <SidebarSeparator className="mx-0" />
        <TeamSwitcher teams={data.teams} />
      </SidebarFooter>

      <SidebarEdgeToggle />
    </Sidebar>
  );
}
