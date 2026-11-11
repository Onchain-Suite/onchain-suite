import {
  AiBrain01Icon,
  ChartLineData01Icon,
  Clock01Icon,
  DashboardSquare01Icon,
  DatabaseIcon,
  FileSearchIcon,
  FilterIcon,
  GridViewIcon,
  Home01Icon,
  InboxIcon,
  LeftToRightListBulletIcon,
  Megaphone01Icon,
  RepeatIcon,
  Settings02Icon,
  TaskDaily01Icon,
  Upload04Icon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";

import type { IconSvgElement } from "@/shared/components/common/hugeicon";
import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/* What ⌘K and Quick create offer. Kept together so the two can never drift:
 * Quick create lists CREATE_ITEMS, ⌘K lists them too, and the keyboard
 * shortcuts jump to the same DESTINATIONS. */

export type PaletteGroup =
  | "Recent"
  | "Contacts"
  | "Campaigns"
  | "Loops"
  | "Forms"
  | "Segments"
  | "From your workspace"
  | "Create"
  | "Go to"
  | "Ask";

/** Groups in a fixed order, so the list does not jump about as you type. */
export const GROUP_ORDER: PaletteGroup[] = [
  "Recent",
  "Contacts",
  "Campaigns",
  "Loops",
  "Forms",
  "Segments",
  "From your workspace",
  "Create",
  "Go to",
  "Ask",
];

/** A record's glyph by its group, so recents (stored as JSON) get theirs back. */
export const GROUP_ICON: Record<PaletteGroup, IconSvgElement> = {
  Recent: Clock01Icon,
  Contacts: UserIcon,
  Campaigns: Megaphone01Icon,
  Loops: RepeatIcon,
  Forms: TaskDaily01Icon,
  Segments: FilterIcon,
  "From your workspace": FileSearchIcon,
  Create: Megaphone01Icon,
  "Go to": DashboardSquare01Icon,
  Ask: AiBrain01Icon,
};

export interface CreateItem {
  label: string;
  hint: string;
  icon: IconSvgElement;
  /** The screen that makes it: each thing is made where it lives. */
  href: string;
}

/** Grouped as: things that send, people, then views. */
export const CREATE_GROUPS: CreateItem[][] = [
  [
    {
      label: "Campaign",
      hint: "Email or in-app push, sent once",
      icon: Megaphone01Icon,
      href: PRIVATE_ROUTES.NEW_CAMPAIGN,
    },
    {
      label: "Loop",
      hint: "Runs on its own when something happens",
      icon: RepeatIcon,
      href: PRIVATE_ROUTES.NEW_AUTOMATION,
    },
    {
      label: "Form",
      hint: "Collect sign-ups and wallets",
      icon: TaskDaily01Icon,
      href: `${PRIVATE_ROUTES.FORMS}?new=1`,
    },
  ],
  [
    {
      label: "Import contacts",
      hint: "From a CSV file",
      icon: Upload04Icon,
      href: `${PRIVATE_ROUTES.AUDIENCE}/import-export`,
    },
    {
      label: "Segment",
      hint: "A group defined by rules",
      icon: FilterIcon,
      href: "/intelligence/segments/create",
    },
  ],
  [
    {
      label: "Dashboard",
      hint: "Charts of your own",
      icon: GridViewIcon,
      href: PRIVATE_ROUTES.ANALYTICS,
    },
  ],
];

export const CREATE_ITEMS: CreateItem[] = CREATE_GROUPS.flat();

export interface Destination {
  label: string;
  href: string;
  icon: IconSvgElement;
  /** Other words people type for it. */
  keywords?: string[];
  /** `G` then this key jumps here (see the shortcuts help). */
  key?: string;
}

/* Everywhere you can go, whether or not the sidebar has a row for it: the
 * palette is the keyboard route to any destination, so Settings and Segments
 * are here even though neither has a sidebar row. */
export const DESTINATIONS: Destination[] = [
  {
    label: "Home",
    href: PRIVATE_ROUTES.DASHBOARD,
    icon: Home01Icon,
    keywords: ["dashboard", "overview"],
    key: "h",
  },
  {
    label: "Inbox",
    href: PRIVATE_ROUTES.INBOX,
    icon: InboxIcon,
    keywords: ["replies", "messages"],
    key: "i",
  },
  {
    label: "Campaigns",
    href: PRIVATE_ROUTES.CAMPAIGNS,
    icon: Megaphone01Icon,
    keywords: ["email", "send", "broadcast"],
    key: "c",
  },
  {
    label: "Loops",
    href: PRIVATE_ROUTES.AUTOMATIONS,
    icon: RepeatIcon,
    keywords: ["automations", "workflows", "triggers", "plays"],
    key: "l",
  },
  {
    label: "Forms",
    href: PRIVATE_ROUTES.FORMS,
    icon: TaskDaily01Icon,
    keywords: ["sign-up", "capture"],
    key: "f",
  },
  {
    label: "Contacts",
    href: PRIVATE_ROUTES.AUDIENCE,
    icon: UserGroupIcon,
    keywords: ["audience", "people", "wallets"],
    key: "a",
  },
  {
    label: "Segments",
    href: `${PRIVATE_ROUTES.AUDIENCE}?tab=segments`,
    icon: FilterIcon,
    keywords: ["groups", "rules"],
    key: "s",
  },
  {
    label: "Lists",
    href: "/campaigns/lists",
    icon: LeftToRightListBulletIcon,
    keywords: ["tags"],
  },
  {
    label: "Analytics",
    href: PRIVATE_ROUTES.ANALYTICS,
    icon: ChartLineData01Icon,
    keywords: ["dashboards", "reports", "numbers"],
    key: "n",
  },
  {
    label: "Intelligence",
    href: PRIVATE_ROUTES.INTELLIGENCE,
    icon: AiBrain01Icon,
    keywords: ["ask", "ai", "query", "sql"],
    key: "q",
  },
  {
    label: "Integrations",
    href: PRIVATE_ROUTES.INTEGRATIONS,
    icon: DatabaseIcon,
    keywords: ["sources", "connections", "data"],
    key: "p",
  },
  {
    label: "Settings",
    href: PRIVATE_ROUTES.SETTINGS,
    icon: Settings02Icon,
    keywords: ["billing", "team", "workspace", "account"],
    key: ",",
  },
];

/** `G` then a letter. */
export const GO_TO = DESTINATIONS.filter(
  (d): d is Destination & { key: string } => typeof d.key === "string"
);

export const askHref = (question: string) =>
  `${PRIVATE_ROUTES.INTELLIGENCE}?q=${encodeURIComponent(question)}`;
