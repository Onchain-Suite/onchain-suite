import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/** One step of the trail. The current page is the last one and has no `href`. */
export interface Crumb {
  label: string;
  href?: string;
}

// "Home" in the authenticated shell is the dashboard, not the marketing landing.
const HOME: Required<Crumb> = { label: "Home", href: PRIVATE_ROUTES.DASHBOARD };

interface Section {
  /** The section's root path; everything under it belongs to the section. */
  prefix: string;
  label: string;
  /**
   * The name of a page one level down, from the path after the prefix
   * (`/new`, `/abc123`). Null when that path is still the section itself, as
   * with a tab that lives in the address.
   */
  child?: (rest: string) => string | null;
}

/**
 * Every section of the signed-in app. Labels match the sidebar, so the trail
 * and the nav never name one place two ways (`/automations` reads "Loops").
 */
const SECTIONS: Section[] = [
  { prefix: "/inbox", label: "Inbox" },
  {
    prefix: "/audience",
    label: "Audience",
    child: (rest) =>
      rest.startsWith("/import-export") ? "Import and export" : "Contact",
  },
  {
    prefix: "/campaigns",
    label: "Campaigns",
    child: (rest) => {
      if (rest.startsWith("/new")) return "New campaign";
      if (rest.startsWith("/editor")) return "Email editor";
      if (rest.startsWith("/lists")) return "Lists";
      return "Campaign";
    },
  },
  {
    prefix: "/automations",
    label: "Loops",
    child: (rest) => (rest.startsWith("/new") ? "New Loop" : "Loop"),
  },
  { prefix: "/forms", label: "Forms", child: () => "Form" },
  // Analytics tabs and dashboards are views of one page, not pages under it.
  { prefix: "/analytics", label: "Analytics" },
  {
    prefix: "/intelligence",
    label: "Intelligence",
    child: (rest) => {
      if (rest.startsWith("/segments/create")) return "New segment";
      if (rest.startsWith("/segments")) return "Segment";
      if (rest.startsWith("/reports")) return "Report";
      return null;
    },
  },
  { prefix: "/integrations", label: "Integrations" },
  {
    prefix: "/settings",
    label: "Settings",
    child: (rest) => (rest.startsWith("/company") ? "Company" : null),
  },
];

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * The trail for a route in the dashboard shell (2.7): always "Home /" first,
 * because Home is the reflex for going back, then the section, then the page
 * inside it. On Home itself the trail is the single word, since "Home / Home"
 * says nothing twice. A route no section claims still gets the way home.
 */
export function breadcrumbsFor(pathname: string): Crumb[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (under(path, PRIVATE_ROUTES.DASHBOARD)) return [{ label: HOME.label }];

  const section = SECTIONS.find((s) => under(path, s.prefix));
  if (!section) return [HOME];

  const rest = path.slice(section.prefix.length);
  const page = rest.length > 1 ? (section.child?.(rest) ?? null) : null;
  if (page === null) return [HOME, { label: section.label }];
  return [
    HOME,
    { label: section.label, href: section.prefix },
    { label: page },
  ];
}
