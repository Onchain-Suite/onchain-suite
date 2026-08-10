import { PRIVATE_ROUTES, publicRoutes } from "@/shared/config/app-routes";

export type BreadcrumbItem = { href: string; label: string };

const HOME: BreadcrumbItem = { href: publicRoutes.HOME, label: "Home" };

/**
 * Route → breadcrumb mapping for the shared dashboard shell. Replaces the
 * per-page constants that lived in each route file before DashboardLayout was
 * hoisted into the (dashboard) group layout. Ordered - first match wins, so
 * deeper paths must precede their parents.
 */
const MATCHERS: Array<{
  match: (pathname: string) => boolean;
  crumbs: BreadcrumbItem[];
}> = [
  {
    match: (p) => p.startsWith("/settings/company"),
    crumbs: [
      HOME,
      { href: PRIVATE_ROUTES.SETTINGS, label: "Settings" },
      { href: "/settings/company", label: "Company" },
    ],
  },
  {
    match: (p) => p.startsWith("/settings"),
    crumbs: [HOME, { href: PRIVATE_ROUTES.SETTINGS, label: "Settings" }],
  },
  {
    match: (p) => p.startsWith("/inbox"),
    crumbs: [HOME, { href: PRIVATE_ROUTES.INBOX, label: "Inbox" }],
  },
  {
    match: (p) => p.startsWith("/forms"),
    crumbs: [HOME, { href: PRIVATE_ROUTES.FORMS, label: "Forms" }],
  },
  {
    match: (p) => p.startsWith("/intelligence/segments"),
    crumbs: [
      HOME,
      { href: PRIVATE_ROUTES.INTELLIGENCE_SEGMENTS, label: "Segments" },
    ],
  },
  {
    match: (p) => p.startsWith("/intelligence/reports"),
    crumbs: [
      HOME,
      { href: PRIVATE_ROUTES.INTELLIGENCE_REPORTS, label: "Report" },
    ],
  },
  {
    match: (p) => p.startsWith("/intelligence"),
    crumbs: [
      HOME,
      { href: PRIVATE_ROUTES.INTELLIGENCE, label: "Intelligence" },
    ],
  },
  {
    match: (p) => p.startsWith("/campaigns"),
    crumbs: [HOME, { href: PRIVATE_ROUTES.CAMPAIGNS, label: "Campaigns" }],
  },
  {
    match: (p) => p.startsWith("/automations/"),
    crumbs: [
      HOME,
      { href: PRIVATE_ROUTES.NEW_AUTOMATION, label: "Create New Automation" },
    ],
  },
  {
    match: (p) => p.startsWith("/automations"),
    crumbs: [HOME, { href: PRIVATE_ROUTES.AUTOMATIONS, label: "Automations" }],
  },
  {
    match: (p) => p.startsWith("/audience"),
    crumbs: [HOME, { href: PRIVATE_ROUTES.AUDIENCE, label: "Audience" }],
  },
];

export const getBreadcrumbsForPath = (
  pathname: string
): BreadcrumbItem[] | undefined =>
  MATCHERS.find((m) => m.match(pathname))?.crumbs;
