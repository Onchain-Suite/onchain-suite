/**
 * Sections still in active development. They are hidden from the sidebar nav
 * and the ⌘K palette in production builds, so dev and main can share
 * identical code — no more re-commenting nav entries after every merge.
 *
 * Resolution:
 * - `NEXT_PUBLIC_SHOW_WIP_SECTIONS=true`  → always show (e.g. a dev preview)
 * - `NEXT_PUBLIC_SHOW_WIP_SECTIONS=false` → always hide
 * - unset → show in local dev (`next dev`), hide in production builds
 *
 * Routes stay reachable by direct URL — this is nav-level hiding only,
 * matching the previous commented-out behavior.
 */
export const SHOW_WIP_SECTIONS =
  process.env.NEXT_PUBLIC_SHOW_WIP_SECTIONS === "true" ||
  (process.env.NEXT_PUBLIC_SHOW_WIP_SECTIONS !== "false" &&
    process.env.NODE_ENV !== "production");

export interface WipSection {
  prefix: string;
  label: string;
  description: string;
  /** Rough completion toward the v1 production release, 0–100. */
  percentComplete: number;
}

export const WIP_SECTIONS: WipSection[] = [
  {
    prefix: "/forms",
    label: "Forms",
    description:
      "Build signup and capture forms that turn visitors into wallet-first contacts — embeddable anywhere, synced straight into your audience.",
    percentComplete: 35,
  },
  {
    prefix: "/inbox",
    label: "Inbox",
    description:
      "A shared inbox for replies to your campaigns — read, assign, and answer conversations without leaving the suite.",
    percentComplete: 30,
  },
];

/** The WIP section a href belongs to, or null. */
export const getWipSection = (href: string): WipSection | null =>
  WIP_SECTIONS.find(
    (section) =>
      href === section.prefix || href.startsWith(`${section.prefix}/`)
  ) ?? null;

/** True when the href belongs to a work-in-progress section. */
export const isWipHref = (href: string) => getWipSection(href) !== null;
