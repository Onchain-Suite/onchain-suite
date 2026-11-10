import {
  AiBrain01Icon,
  ChartLineData01Icon,
  DashboardSquare01Icon,
  DatabaseIcon,
  FlashIcon,
  InboxIcon,
  Megaphone01Icon,
  TaskDaily01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { hugeicon } from "@/shared/components/common/hugeicon";
import type { NavItem, NavSection } from "@/shared/components/layout/nav-utils";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { isWipHref, SHOW_WIP_SECTIONS } from "@/shared/config/wip-sections";

/**
 * The sidebar, regrouped by what people come to do (2.7 reference, 7 Nov 2026).
 *
 * Home, Inbox and Audience sit on top, unlabelled: what needs you, the
 * conversations, and the people both are about. Engage is everything that
 * sends. Insights is the numbers, the questions, and the sources that feed
 * them. Settings has no row: it is in the account menu under your name.
 * Audience is one row; Segments is a tab on the page itself.
 *
 * Routes are unchanged (Home is still /dashboard, Loops still /automations).
 */

/** Rows that carry a live number, filled in by the sidebar at render. */
export const INBOX_URL = PRIVATE_ROUTES.INBOX;

/** WIP destinations stay in the nav but render faded (rows) or tagged (sub-rows). */
const withWip = (item: NavItem): NavItem => ({
  ...item,
  wip: !SHOW_WIP_SECTIONS && isWipHref(item.url),
  items: item.items?.map((sub) => ({
    ...sub,
    wip: !SHOW_WIP_SECTIONS && isWipHref(sub.url),
  })),
});

const RAW: NavSection[] = [
  {
    items: [
      {
        title: "Home",
        url: PRIVATE_ROUTES.DASHBOARD,
        icon: hugeicon(DashboardSquare01Icon, "HomeGlyph"),
      },
      {
        title: "Inbox",
        url: PRIVATE_ROUTES.INBOX,
        icon: hugeicon(InboxIcon, "InboxGlyph"),
      },
      {
        title: "Audience",
        url: PRIVATE_ROUTES.AUDIENCE,
        icon: hugeicon(UserGroupIcon, "AudienceGlyph"),
      },
    ],
  },
  {
    label: "Engage",
    items: [
      {
        title: "Campaigns",
        url: PRIVATE_ROUTES.CAMPAIGNS,
        icon: hugeicon(Megaphone01Icon, "CampaignsGlyph"),
      },
      {
        title: "Loops",
        url: PRIVATE_ROUTES.AUTOMATIONS,
        icon: hugeicon(FlashIcon, "LoopsGlyph"),
      },
      {
        title: "Forms",
        url: PRIVATE_ROUTES.FORMS,
        icon: hugeicon(TaskDaily01Icon, "FormsGlyph"),
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        title: "Analytics",
        url: PRIVATE_ROUTES.ANALYTICS,
        icon: hugeicon(ChartLineData01Icon, "AnalyticsGlyph"),
      },
      {
        title: "Intelligence",
        url: PRIVATE_ROUTES.INTELLIGENCE,
        icon: hugeicon(AiBrain01Icon, "IntelligenceGlyph"),
      },
      {
        title: "Integrations",
        url: PRIVATE_ROUTES.INTEGRATIONS,
        icon: hugeicon(DatabaseIcon, "IntegrationsGlyph"),
      },
    ],
  },
];

export const NAV_SECTIONS: NavSection[] = RAW.map((section) => ({
  ...section,
  items: section.items.map(withWip),
}));

/** The sections with live counts on their rows (unread replies on Inbox). */
export function withCounts(
  sections: NavSection[],
  counts: { inbox?: number }
): NavSection[] {
  if (!counts.inbox) return sections;
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.url === INBOX_URL ? { ...item, count: counts.inbox } : item
    ),
  }));
}
