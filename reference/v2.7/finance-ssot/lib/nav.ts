// Navigation shapes and the icon registry. A nav entry names its icon rather than importing one, so
// site.config.ts stays a plain data file and the sidebar owns the imports.
import type * as React from 'react';

export type NavChild = { href: string; label: string };
export type NavLink = { href: string; label: string };
export type NavEntry = { href: string; label: string; icon?: IconName; children?: NavChild[] };
export type IconName =
  | 'home' | 'palette' | 'squares' | 'layout' | 'table' | 'list' | 'form' | 'users' | 'gear'
  | 'book' | 'chart' | 'bell' | 'folder' | 'search' | 'sparkle' | 'shield';

/** How many children a nav entry shows before it links to the page for the rest. */
export const NAV_CHILDREN_MAX = 12;

/** True when a nav href is the current page (or an ancestor of it). */
export const isActive = (href: string, path: string) =>
  href === '/' ? path === '/' : path === href || path.startsWith(href + '/');

export type IconMap = Record<IconName, React.ReactNode>;
