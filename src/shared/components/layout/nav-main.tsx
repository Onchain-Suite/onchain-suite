"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { cn } from "@/lib/utils";

import {
  isBranchActive,
  isNavActive,
  type NavItem,
  navTooltip,
} from "./nav-utils";

// Dims the glyph on idle rows; the active row inherits the accent color.
// Roomier than the shadcn default: taller rows, larger glyphs and label text so
// the rail reads spacious (matches the reference shell).
const ROW =
  "h-11 gap-3 rounded-lg px-3 text-[15px] [&>svg]:size-5 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!";

/** Sections still in development read as reachable but not ready. */
const WIP = "opacity-50 hover:opacity-80";

export function NavMain({
  label,
  items,
}: {
  label?: string;
  items: NavItem[];
}) {
  // `usePathname` is null while Next resolves the route on first paint.
  const pathname = usePathname() ?? "";

  return (
    <SidebarGroup>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:items-center">
        {items.map((item) =>
          item.items?.length ? (
            <CollapsibleRow key={item.title} item={item} pathname={pathname} />
          ) : (
            <LinkRow key={item.title} item={item} pathname={pathname} />
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/** Leaf row — navigates directly, no disclosure. */
function LinkRow({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={navTooltip(item)}
        isActive={isNavActive(pathname, item)}
        className={cn(ROW, item.wip && WIP)}
      >
        <Link href={item.url}>
          {item.icon ? <item.icon aria-hidden="true" /> : null}
          <span className="group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
        </Link>
      </SidebarMenuButton>
      {item.badge === "dot" ? <StatusDot /> : null}
    </SidebarMenuItem>
  );
}

/**
 * Parent row with children. Opens by default when it owns the current route.
 * On the collapsed rail the sub-menu and chevron are hidden and the row falls
 * back to its tooltip, so the disclosure never fires invisibly.
 */
function CollapsibleRow({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const branchActive = isBranchActive(pathname, item);

  return (
    <Collapsible
      asChild
      defaultOpen={branchActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={navTooltip(item)}
            isActive={isNavActive(pathname, item)}
            className={cn(ROW, item.wip && WIP)}
          >
            {item.icon ? <item.icon aria-hidden="true" /> : null}
            <span className="group-data-[collapsible=icon]:hidden">
              {item.title}
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="ml-auto transition-transform duration-(--duration-base) group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Hairline dropped: the reference indents children without a tree line. */}
          <SidebarMenuSub className="border-none">
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isNavActive(pathname, subItem)}
                >
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** Trailing activity dot (e.g. Revenue). Hidden on the collapsed rail. */
function StatusDot() {
  return (
    <SidebarMenuBadge>
      <span className="size-2 rounded-full bg-(--status-success-border)" />
      <span className="sr-only">Has updates</span>
    </SidebarMenuBadge>
  );
}
