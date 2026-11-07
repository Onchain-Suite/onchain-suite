import {
  Brain,
  ChartLine,
  ClipboardText,
  Database,
  Lightning,
  Megaphone,
  SquaresFour,
  Users,
} from "@phosphor-icons/react/ssr";

import type { NavItem, NavSection } from "@/shared/components/layout/nav-utils";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";
import { isWipHref, SHOW_WIP_SECTIONS } from "@/shared/config/wip-sections";

/**
 * The sidebar, in the 2.7 reference's sections. Home and Intelligence sit
 * above both groups because they look across all of it; Engage is everything
 * that sends; Growth is who you reach, what happened, and what feeds it.
 * Routes are unchanged (Home is still /dashboard, Loops still /automations);
 * Settings lives in the profile menu at the foot of the sidebar.
 *
 * Icons are Phosphor, as in the reference: one concept, one glyph.
 */

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
      { title: "Home", url: PRIVATE_ROUTES.DASHBOARD, icon: SquaresFour },
      { title: "Intelligence", url: PRIVATE_ROUTES.INTELLIGENCE, icon: Brain },
    ],
  },
  {
    label: "Engage",
    items: [
      { title: "Campaigns", url: PRIVATE_ROUTES.CAMPAIGNS, icon: Megaphone },
      { title: "Loops", url: PRIVATE_ROUTES.AUTOMATIONS, icon: Lightning },
      { title: "Forms", url: PRIVATE_ROUTES.FORMS, icon: ClipboardText },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        // Every conversation is with a contact, so Inbox sits under Audience.
        title: "Audience",
        url: PRIVATE_ROUTES.AUDIENCE,
        icon: Users,
        items: [
          { title: "Contacts", url: PRIVATE_ROUTES.AUDIENCE },
          { title: "Segments", url: `${PRIVATE_ROUTES.AUDIENCE}?tab=segments` },
          { title: "Inbox", url: PRIVATE_ROUTES.INBOX },
        ],
      },
      { title: "Analytics", url: PRIVATE_ROUTES.ANALYTICS, icon: ChartLine },
      {
        title: "Integrations",
        url: PRIVATE_ROUTES.INTEGRATIONS,
        icon: Database,
      },
    ],
  },
];

export const NAV_SECTIONS: NavSection[] = RAW.map((section) => ({
  ...section,
  items: section.items.map(withWip),
}));
