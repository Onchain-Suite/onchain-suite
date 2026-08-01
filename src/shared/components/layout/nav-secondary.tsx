"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";

import { isNavActive, type NavItem, navTooltip } from "./nav-utils";

/**
 * Utility links that sit below the primary nav (settings, invites, docs).
 * Same row anatomy as `NavMain`, minus grouping and disclosure.
 */
export function NavSecondary({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "";

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={navTooltip(item)}
                isActive={isNavActive(pathname, item)}
                className={cn(
                  "[&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-sidebar-accent-foreground",
                  item.wip && "opacity-50 hover:opacity-80"
                )}
              >
                <Link href={item.url}>
                  {item.icon ? <item.icon aria-hidden="true" /> : null}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
