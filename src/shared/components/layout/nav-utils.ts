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

/**
 * The single most-specific nav URL matching the current path. `isNavActive`
 * matches an item AND its descendants, so a parent route (`/intelligence`) lit
 * up alongside a child that has its own nav entry (`/intelligence/analytics`).
 * Resolving one winner — the LONGEST matching real URL across every item and
 * sub-item — lets a row decide activeness by identity instead. `#`/empty
 * placeholder URLs are excluded (they fall back to their own `isActive` flag).
 */
export function resolveActiveNavUrl(
  pathname: string,
  items: NavItem[]
): string | undefined {
  const urls: string[] = [];
  for (const item of items) {
    if (item.url && item.url !== "#") urls.push(item.url);
    for (const subItem of item.items ?? []) {
      if (subItem.url && subItem.url !== "#") urls.push(subItem.url);
    }
  }
  return urls
    .filter((url) => isNavActive(pathname, { url }))
    .sort((a, b) => b.length - a.length)[0];
}

/** Whether a row is the resolved active one. Placeholder (`#`) rows keep using
 *  their explicit `isActive` flag, since pathname matching can't resolve them. */
export function isRowActive(
  item: { url: string; isActive?: boolean },
  activeUrl: string | undefined
): boolean {
  if (!item.url || item.url === "#") return Boolean(item.isActive);
  return item.url === activeUrl;
}

/** True when the row itself, or any of its children, is the resolved active one
 *  — for a collapsible parent's highlight + default-open. */
export function isBranchRowActive(
  item: NavItem,
  activeUrl: string | undefined
): boolean {
  return (
    isRowActive(item, activeUrl) ||
    (item.items?.some((subItem) => isRowActive(subItem, activeUrl)) ?? false)
  );
}

/** Row tooltip - WIP sections say so rather than repeating the label. */
export function navTooltip(item: NavItem) {
  return item.wip ? `${item.title} - coming in v1` : item.title;
}
