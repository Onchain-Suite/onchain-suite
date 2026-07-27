import type { LucideIcon } from "lucide-react";

export type NavSubItem = {
  title: string;
  url: string;
  /** Fallback for prototype links (`#`) that pathname matching can't resolve. */
  isActive?: boolean;
};

export type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  /** Renders a status dot on the trailing edge of the row (hidden when collapsed). */
  badge?: "dot";
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
