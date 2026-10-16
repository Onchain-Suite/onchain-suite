/**
 * Analytics tab definitions. Server-safe (no "use client"), so the route segment
 * can validate `[tab]` against `ANALYTICS_TABS` - importing these from the client
 * dashboard module would hand the server a client-reference stub, not the array.
 */
export const ANALYTICS_TAB_DEFS = [
  { id: "overview", label: "Overview" },
  { id: "conversions", label: "Conversions" },
  { id: "engagement", label: "Engagement" },
  { id: "retention", label: "Retention" },
] as const;

export type AnalyticsTab = (typeof ANALYTICS_TAB_DEFS)[number]["id"];

export const ANALYTICS_TABS: readonly AnalyticsTab[] = ANALYTICS_TAB_DEFS.map(
  (t) => t.id
);
