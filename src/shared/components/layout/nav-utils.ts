import type * as React from "react";

/** Any icon component that takes svg props - Heroicons and lucide both match. */
export type NavIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export type NavSubItem = {
  title: string;
  url: string;
  /** Fallback for prototype links (`#`) that pathname matching can't resolve. */
  isActive?: boolean;
};

export type NavItem = {
  title: string;
  url: string;
  icon?: NavIcon;
  /** Renders a status dot on the trailing edge of the row (hidden when collapsed). */
  badge?: "dot";
  /** Work-in-progress section: rendered faded, routes to a coming-soon panel. */
  wip?: boolean;
  /** Fallback for prototype links (`#`) that pathname matching can't resolve. */
  isActive?: boolean;
  items?: NavSubItem[];
};

/**
 * Route matching for nav rows. Placeholder links (`#`, empty) never match, so
 * prototype data can fall back to an explicit `isActive` flag; real routes match
 * themselves and their descendants, and `/` only matches exactly.
 */
export function isNavActive(
  pathname: string,
  item: { url: string; isActive?: boolean }
) {
  const { url } = item;
  if (!url || url === "#") return Boolean(item.isActive);
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

/** True when the item itself or any of its children is the current route. */
export function isBranchActive(pathname: string, item: NavItem) {
  return (
    isNavActive(pathname, item) ||
    (item.items?.some((subItem) => isNavActive(pathname, subItem)) ?? false)
  );
}

/** Row tooltip - WIP sections say so rather than repeating the label. */
export function navTooltip(item: NavItem) {
  return item.wip ? `${item.title} - coming in v1` : item.title;
}
