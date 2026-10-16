'use client';
// The left pane: shadcn Sidebar, inset, collapsing to icons (cmd+b or the rail). Navigation is data
// from site.config.ts; an entry with children opens as a Collapsible whose label still goes to the
// page and whose chevron opens the list. Icons are Phosphor only, named in the config and mapped here.
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowSquareOutIcon, BellIcon, BookOpenIcon, CaretRightIcon, ChartLineUpIcon, FolderIcon, GearIcon, HouseIcon,
  LayoutIcon, ListChecksIcon, MagnifyingGlassIcon, PaletteIcon, ShieldIcon, SparkleIcon, SquaresFourIcon, TableIcon, TextboxIcon, UsersThreeIcon,
} from '@phosphor-icons/react';
import { site } from '@/site.config';
import { isActive, NAV_CHILDREN_MAX, type IconMap } from '@/lib/nav';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuAction,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarRail,
} from '@/components/ui/sidebar';

const ICONS: IconMap = {
  home: <HouseIcon />, palette: <PaletteIcon />, squares: <SquaresFourIcon />, layout: <LayoutIcon />, table: <TableIcon />,
  list: <ListChecksIcon />, form: <TextboxIcon />, users: <UsersThreeIcon />, gear: <GearIcon />, book: <BookOpenIcon />,
  chart: <ChartLineUpIcon />, bell: <BellIcon />, folder: <FolderIcon />, search: <MagnifyingGlassIcon />, sparkle: <SparkleIcon />, shield: <ShieldIcon />,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const path = usePathname();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!" render={<Link href="/" />}>
              <Image src="/brand/datum-mark.png" alt="" width={24} height={24} className="size-6 shrink-0 rounded-[6px]" priority />
              <span className="text-base font-semibold">datum<span className="text-(--brand-blue)">labs</span></span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Pages</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {site.nav.map((n) => {
                const rows = n.children ?? [];
                const button = (
                  <SidebarMenuButton tooltip={n.label} isActive={isActive(n.href, path)} render={<Link href={n.href} />}>
                    {(n.icon && ICONS[n.icon]) ?? <SquaresFourIcon />}<span>{n.label}</span>
                  </SidebarMenuButton>
                );
                if (!rows.length) return <SidebarMenuItem key={n.href}>{button}</SidebarMenuItem>;
                return (
                  <Collapsible key={n.href} defaultOpen={isActive(n.href, path)} className="group/collapsible" render={<SidebarMenuItem />}>
                    {button}
                    <CollapsibleTrigger render={<SidebarMenuAction showOnHover={false} aria-label={`Open ${n.label.toLowerCase()} list`} />}>
                      <CaretRightIcon className="transition-transform group-data-[open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {rows.slice(0, NAV_CHILDREN_MAX).map((r) => (
                          <SidebarMenuSubItem key={r.href}>
                            <SidebarMenuSubButton size="sm" isActive={path === r.href} render={<Link href={r.href} />}><span className="truncate">{r.label}</span></SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        {rows.length > NAV_CHILDREN_MAX ? (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton size="sm" render={<Link href={n.href} />}><span className="text-muted-foreground">All {rows.length} {n.label.toLowerCase()}</span></SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ) : null}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Local change: the kit renders this group unconditionally, so a project with no links
            gets a "Datum" heading with nothing under it. Worth fixing upstream; until then a
            `datum-ui sync` will bring the unconditional version back. */}
        {site.links.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>Datum</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {site.links.map((l) => (
                  <SidebarMenuItem key={l.href}>
                    <SidebarMenuButton tooltip={l.label} render={<a href={l.href} target="_blank" rel="noreferrer" />}><ArrowSquareOutIcon /><span>{l.label}</span></SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <div className="truncate px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">{site.name}</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
