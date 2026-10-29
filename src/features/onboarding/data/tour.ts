import { PRIVATE_ROUTES } from "@/shared/config/app-routes";

/**
 * The product tour's stops (v2.7 onboarding migration, step 6; anchored upgrade).
 *
 * A workspace a minute after signup has nothing in it, so every screen is an
 * empty state, and nine empty states in a row explain nothing about how the
 * product fits together. The tour walks the sidebar one section at a time: what
 * the section is for and what it is waiting on. It ends at Integrations, where
 * every other section's data comes from.
 *
 * Copy describes the SECTION, not demo data: it has to stay true for a workspace
 * with nothing in it, which is the only kind that sees the tour. Routes come
 * from `PRIVATE_ROUTES` so a route rename can't silently point the tour at a
 * 404. Pure and server-safe: data only.
 */

export interface TourStop {
  /** Route this stop opens. */
  to: string;
  /**
   * What the callout points at, by its `data-tour` name. Defaults to the sidebar
   * row for `to`; set it when a stop points at something other than its own row
   * (e.g. the getting-started checklist in the sidebar footer).
   */
  anchor?: string;
  title: string;
  body: string;
}

export const TOUR: TourStop[] = [
  {
    to: PRIVATE_ROUTES.DASHBOARD,
    title: "This is your dashboard",
    body: "Where you land. Once your data arrives it shows what moved across your workspace today.",
  },
  {
    to: PRIVATE_ROUTES.DASHBOARD,
    anchor: "getting-started",
    title: "Start with this checklist",
    body: "Six steps from paying to your first send. It stays here in the sidebar until they are done. Open any step to see what it needs.",
  },
  {
    to: PRIVATE_ROUTES.CAMPAIGNS,
    title: "Campaigns",
    body: "One-off sends to an audience, by email or in-app push. They need someone to send to, so they come alive once your contacts arrive.",
  },
  {
    to: PRIVATE_ROUTES.AUTOMATIONS,
    title: "Automations",
    body: "Flows that run without you. A wallet goes quiet, stakes, or finishes onboarding and moves through the steps you set. They trigger on on-chain and product events.",
  },
  {
    to: PRIVATE_ROUTES.FORMS,
    title: "Forms",
    body: "Sign-up forms that turn visitors into verified contacts. These work before any data arrives, so you can build one while indexing runs.",
  },
  {
    to: PRIVATE_ROUTES.AUDIENCE,
    title: "Audience",
    body: "Everyone you can reach: holders from your contracts, with email and push joined on. Lists and segments live here too.",
  },
  {
    to: PRIVATE_ROUTES.INTELLIGENCE,
    title: "Intelligence",
    body: "Ask about your holders in plain language: who went dormant, who the whales are, who opened but never clicked. Answers come from your own data.",
  },
  {
    to: PRIVATE_ROUTES.ANALYTICS,
    title: "Analytics",
    body: "Your numbers as dashboards. Any of them can be published to a link your team can open without an account.",
  },
  {
    to: PRIVATE_ROUTES.INTEGRATIONS,
    title: "Start here: Integrations",
    body: "Integrations is where data comes in. Index a contract and connect the channels you send on. Every other section fills in from this.",
  },
];

/** Where a stop points: its named target, or the sidebar row for its route. */
export const anchorOf = (stop: TourStop): string => stop.anchor ?? stop.to;
