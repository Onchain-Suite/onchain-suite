"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

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
  flattenSections,
  isBranchRowActive,
  isRowActive,
  type NavItem,
  type NavSection,
  navTooltip,
  resolveActiveNavUrl,
} from "./nav-utils";
import { Icon } from "@/shared/components/common/hugeicon";

/*
 * Row anatomy from the 2.7 reference shell: 32px rows, 18px glyphs, secondary
 * text at rest. The current page is LIFTED out of the shell like the panel it
 * opens (raised fill, hairline border, xs elevation) rather than tinted.
 */
const ROW = cn(
  "h-8 gap-2.5 rounded-lg border border-transparent px-2.5 text-sm font-medium text-(--text-secondary) [&>svg]:size-[18px]",
  "hover:bg-(--tint-hover) hover:text-(--text-primary) data-[state=open]:hover:bg-(--tint-hover) data-[state=open]:hover:text-(--text-primary)",
  "data-[active=true]:border-(--border-subtle) data-[active=true]:bg-(--bg-main) data-[active=true]:text-(--text-primary) data-[active=true]:shadow-(--elevation-xs) data-[active=true]:hover:bg-(--bg-main)",
  "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
);

const SUB_ROW = cn(
  "h-auto gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] text-(--text-secondary)",
  "hover:bg-(--tint-hover) hover:text-(--text-primary)",
  "data-[active=true]:bg-(--tint-hover) data-[active=true]:font-medium data-[active=true]:text-(--text-primary)"
);

/** Sections still in development read as reachable but not ready. */
const WIP = "opacity-50 hover:opacity-80";

/**
 * The sidebar's labelled sections. One active row is resolved across ALL of
 * them (most specific URL wins, query-aware), so "Segments" and "Contacts" -
 * both on /audience - never light up together.
 */
export function NavSections({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname() ?? "";
  const search = useSearchParams()?.toString() ?? "";
  const activeUrl = resolveActiveNavUrl(
    pathname,
    flattenSections(sections),
    search
  );

  return (
    <div className="flex flex-col gap-2.5">
      {sections.map((section, index) => (
        <NavMain
          key={section.label ?? `section-${index}`}
          label={section.label}
          items={section.items}
          activeUrl={activeUrl}
          divider={index > 0}
        />
      ))}
    </div>
  );
}

export function NavMain({
  label,
  items,
  activeUrl: resolvedActiveUrl,
  divider = false,
}: {
  label?: string;
  items: NavItem[];
  /** Pre-resolved across sections; computed from these items when omitted. */
  activeUrl?: string;
  /** On the collapsed rail a section's label becomes a short rule. */
  divider?: boolean;
}) {
  // `usePathname` is null while Next resolves the route on first paint.
  const pathname = usePathname() ?? "";
  const activeUrl = resolvedActiveUrl ?? resolveActiveNavUrl(pathname, items);

  return (
    <SidebarGroup className="p-0 px-0.5">
      {divider ? (
        <div
          aria-hidden="true"
          className="mx-auto mb-2 hidden h-px w-6 bg-(--border-default) group-data-[collapsible=icon]:block"
        />
      ) : null}
      {label ? (
        <SidebarGroupLabel className="h-7 px-2.5 text-xs font-medium text-(--text-tertiary)">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:items-center">
        {items.map((item) =>
          item.items?.length ? (
            <CollapsibleRow
              key={item.title}
              item={item}
              activeUrl={activeUrl}
            />
          ) : (
            <LinkRow key={item.title} item={item} activeUrl={activeUrl} />
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/** Leaf row - navigates directly, no disclosure. */
function LinkRow({
  item,
  activeUrl,
}: {
  item: NavItem;
  activeUrl: string | undefined;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={navTooltip(item)}
        isActive={isRowActive(item, activeUrl)}
        className={cn(ROW, item.wip && WIP)}
      >
        <Link href={item.url} data-tour={item.url}>
          {item.icon ? <item.icon aria-hidden="true" /> : null}
          <span className="group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
        </Link>
      </SidebarMenuButton>
      {item.count ? (
        <CountBadge count={item.count} />
      ) : item.badge === "dot" ? (
        <StatusDot />
      ) : null}
    </SidebarMenuItem>
  );
}

/**
 * Parent row with children. Opens by default when it owns the current route.
 * On the collapsed rail the sub-menu and caret are hidden and the row falls
 * back to its tooltip, so the disclosure never fires invisibly.
 */
function CollapsibleRow({
  item,
  activeUrl,
}: {
  item: NavItem;
  activeUrl: string | undefined;
}) {
  const branchActive = isBranchRowActive(item, activeUrl);

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
            // The parent is only lifted while collapsed over the active child;
            // open, the child row itself shows where you are.
            isActive={branchActive}
            className={cn(
              ROW,
              item.wip && WIP,
              "group-data-[state=open]/collapsible:data-[active=true]:border-transparent group-data-[state=open]/collapsible:data-[active=true]:bg-transparent group-data-[state=open]/collapsible:data-[active=true]:shadow-none"
            )}
          >
            {item.icon ? <item.icon aria-hidden="true" /> : null}
            <span className="group-data-[collapsible=icon]:hidden">
              {item.title}
            </span>
            <Icon
              icon={ArrowDown01Icon}
              className="ml-auto size-3.5! text-(--text-tertiary) transition-transform duration-(--duration-base) group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* The reference hangs children off a hairline from the parent's glyph. */}
          <SidebarMenuSub className="mx-0 mt-0.5 mb-0.5 ml-[22px] gap-px border-l border-(--border-subtle) px-0 pl-3">
            {item.items?.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isRowActive(subItem, activeUrl)}
                  className={SUB_ROW}
                >
                  <Link href={subItem.url}>
                    <span
                      className={cn(subItem.wip && "text-(--text-tertiary)")}
                    >
                      {subItem.title}
                    </span>
                    {subItem.wip ? (
                      <span className="ml-auto text-[10.5px] text-(--text-tertiary)">
                        Soon
                      </span>
                    ) : null}
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

/** Trailing count (unread replies on Inbox). Hidden on the collapsed rail. */
function CountBadge({ count }: { count: number }) {
  return (
    <SidebarMenuBadge className="rounded-full bg-(--tint-hover) px-1.5 text-[11px] font-semibold text-(--text-secondary) tabular-nums">
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{count} unread</span>
    </SidebarMenuBadge>
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
