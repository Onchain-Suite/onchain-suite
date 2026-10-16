// The only file most projects need to edit. Name the project, its navigation and the links in the
// footer. Everything else in the template reads from here, so a new project is this file plus pages.
import type { NavEntry, NavLink } from '@/lib/nav';

// Twelve pages in the order the document reads: where we stand, the business as it is, the business
// as projected, then the controls that keep the first three honest. The numbers are part of the
// labels because other documents cite this one by page number.
const NAV: NavEntry[] = [
  { href: '/', label: '01 Overview', icon: 'home' },
  { href: '/market', label: '02 Market research', icon: 'search' },
  { href: '/catalogue', label: '03 Catalogue and pricing', icon: 'table' },
  { href: '/cost-model', label: '04 Cost model', icon: 'squares' },
  { href: '/cost-per-user', label: '05 Cost per user', icon: 'users' },
  { href: '/unit-economics', label: '06 Unit economics', icon: 'chart' },
  { href: '/financial-model', label: '07 Financial model', icon: 'layout' },
  { href: '/growth', label: '08 Growth and retention', icon: 'sparkle' },
  { href: '/runway', label: '09 Break-even and runway', icon: 'bell' },
  { href: '/assumptions', label: '10 Assumptions register', icon: 'list' },
  { href: '/governance', label: '11 Governance and definitions', icon: 'shield' },
  { href: '/decisions', label: '12 Company decisions', icon: 'book' },
  { href: '/workings', label: '13 Monthly working', icon: 'table' },
  { href: '/sensitivity', label: '14 Sensitivity', icon: 'chart' },
];

// Empty on purpose. This is an internal document, and a list of outbound links in the sidebar of
// one is chrome rather than navigation.
const LINKS: NavLink[] = [];

export const site = {
  name: 'OnchainSuite Finance SSOT',
  // One sentence: what this is and who it is for. Used as the meta description and on the home page.
  description:
    'Internal single source of truth for OnchainSuite pricing, costs, unit economics and the financial model. Every figure is either an input or derived from one.',
  // The line under the wordmark in the sidebar, and the browser tab suffix.
  owner: 'Datum Labs',
  // Left nav. `icon` is a name from lib/nav.ts ICONS; `children` render as a collapsible list.
  nav: NAV,
  // Shown in the footer and the command palette's "Datum" group.
  links: LINKS,
  // One line in the footer: what a reader should know about this app. Keep it honest.
  footnote:
    'Internal. Every figure is an input or is derived from one, and nothing is typed in twice. Change an input and the whole document recalculates.',
};
export type Site = typeof site;
