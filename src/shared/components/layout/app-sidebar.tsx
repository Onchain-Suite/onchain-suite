"use client";

import {
  AudioWaveformIcon,
  BookOpenIcon,
  ChartColumnIcon,
  CommandIcon,
  CreditCardIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  SettingsIcon,
  TriangleIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
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

// Sample data — swap `#` for real routes and the rows light up from the
// pathname on their own (see `isNavActive`).
const data = {
  teams: [
    { name: "Vercel", logo: TriangleIcon, plan: "Enterprise" },
    { name: "Acme Corp.", logo: AudioWaveformIcon, plan: "Startup" },
    { name: "Evil Corp.", logo: CommandIcon, plan: "Free" },
  ],
  navMain: [
    { title: "Overview", url: "#", icon: LayoutGridIcon, isActive: true },
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
      icon: ChartColumnIcon,
      badge: "dot",
    },
    { title: "Automation", url: "#", icon: ZapIcon },
    { title: "Support", url: "#", icon: LifeBuoyIcon },
  ] satisfies NavItem[],
  navSecondary: [
    { title: "Settings", url: "#", icon: SettingsIcon },
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
