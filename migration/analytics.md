# v2.7 migration: Analytics

Branch `v2.7-analytics` (off `v2.7`). Reference: `reference/v2.7/web/src`. Start
with `reference/v2.7/HANDOFF.md` and `reference/v2.7/web/src/screens/AnalyticsScreen.tsx`.

## Reality check (read first)

The reference Analytics screen is a 4-tab dashboard (Overview / Conversions /
Engagement / Retention) of rich charts, plus custom dashboards and a chart
builder. The current app's "Analytics" (`/intelligence/analytics`) is 4 real KPI
cards + honest "Not available yet" empty states + a static report-template
launcher. So **this is mostly a new build, and most of it is backend-gated** -
attribution, cohorts, lanes, reachable value, and org-wide funnels all need
endpoints that do not exist. The charts themselves are low-risk: the app already
ships `recharts` and the same shadcn chart wrapper (`src/shared/components/ui/chart.tsx`)
the reference uses.

## Two decisions

1. **Routing.** Reference Analytics is a top-level `/analytics` section with
   URL-addressable tabs/dashboards. The app buries it at `/intelligence/analytics`
   (with a declared-but-unbuilt `/intelligence/analytics/advanced`). Decide:
   promote to a top-level `/analytics` route (reference-faithful, URL-driven
   tabs) or keep it nested. This shapes steps 2+.
2. **Honesty rule stays.** Keep the app's `meta.backing` system (real /
   value-only / none): render a real chart only where an endpoint exists, keep
   the "Not available yet" state everywhere else. Do not port the reference's
   seeded mock numbers as if they were real.

## Preserve (the app does these better than the reference mock)

- Real ESP metrics: `CampaignEmailFunnel` / `CampaignInAppFunnel` (bounces,
  complaints, denominator-aware open/click) in `campaigns.service.ts`.
- PAYG / prepaid allowance in analytics (`CampaignAnalyticsOverview.allowance`).
- `meta.backing` honesty; the pooled cross-surface open rate
  (`use-campaign-engagement.ts`); real endpoints + org tenancy + defensive
  normalization.

## Steps (FE = frontend-only, BE = needs a new/changed endpoint)

- [x] **1. Charting foundation (FE).** Done: reusable, typed Cartesian primitives
  in `src/features/analytics/components/charts/` on top of the shared
  `ChartContainer` + recharts - `AnalyticsBarChart` (single/stacked),
  `AnalyticsLineChart` (multi-series time series), `AnalyticsHBarChart`
  (labelled breakdowns), plus a pure `seriesConfig` helper (unit-tested) that
  wires `--color-<key>` so marks, tooltips and legend stay in sync. The Sankey
  helpers (`FunnelNode` / `FlowNode`) are deferred to the step that first needs
  them (step 4, the org funnel).
- [x] **2. Tab shell + routing (FE).** Done: promoted Analytics to a top-level
  `/analytics` route with URL-addressable tabs (`/analytics/<tab>`,
  Overview / Conversions / Engagement / Retention). `analytics-dashboard.tsx`
  owns the title + tab bar; the Overview tab renders the existing real analytics
  (extracted from `AnalyticsPage` into a header-less `AnalyticsOverview`), the
  other three are honest "in migration" empty states. `/analytics` redirects to
  `/analytics/overview`, the old `/intelligence/analytics` redirects there too,
  and `PRIVATE_ROUTES.ANALYTICS` points at `/analytics`. Tab constants live in a
  server-safe `analytics-tabs.ts` (the route segment validates `[tab]` against
  them - importing from the `"use client"` dashboard handed the server a
  client-reference stub, caught in the dev-server compile check).
- [x] **3. Overview tab - cheap wins (FE where data exists).** Done (FE part):
  added a real **"Messages sent by channel"** bar chart to the Overview tab,
  built on the step-1 `AnalyticsBarChart` and the real `/campaigns/analytics/overview`
  (email vs in-app `sent`), sharing the Campaigns overview's query key, with
  loading + "no messages yet" states. The KPI strip stays as-is (already wired:
  `/dashboard/overview` + pooled open rate). **Still BE:** the per-day-by-channel
  series (overview returns aggregates, not daily-by-channel) and the "Conversion
  rate over time" line chart.
- [ ] **4. Normalized funnel model + org funnel (FE types, BE data).** Port
  `Funnel` / `ChannelSlice` / `ENGAGED_LABEL` + goal/route types FROM
  `data/campaignModel.ts` + `attribution.ts` INTO
  `src/features/analytics/*.types.ts`; wire the `CampaignFunnel` Sankey. **BE:**
  needs `GET /campaigns/analytics/funnel` (reached/engaged/converted/lost across
  channels) - today only per-campaign `/campaigns/{id}/analytics` exists.
- [ ] **5. Conversions tab - attribution (BE, the hardest).** `AttributionWindows`
  + Direct/Influenced credit bar FROM `retentionCharts.tsx` / `attribution.ts`.
  **BE:** on-chain conversion attribution (goal events matched to messages within
  per-channel windows) - chain indexing + an attribution service. `convertedOnchain`
  backing is `"none"` today. Ship behind an empty state until the endpoint lands.
- [ ] **6. Engagement tab (BE).** Off-chain / on-chain HBar breakdowns, the
  org-wide push delivery funnel (Queued -> Delivered -> Viewed -> Clicked + leaks),
  `FatigueCard`, `ListGrowthChart`. All need org-wide aggregation endpoints that
  don't exist (empty cards today).
- [ ] **7. Retention tab (BE).** `CohortGrid` (triangle heatmap), `LifecycleFlow`
  (Sankey), retention curve, `LifecycleCard` FROM `retentionCharts.tsx` +
  `data/retentionAnalysis.ts` + `data/lifecycle.ts`. Needs cohort / lifecycle /
  stage-movement endpoints (none exist; dashboard shows "coming soon").
- [ ] **8. Reachable value + Lanes (BE, highest product value).** `LanesChart`
  (product + on-chain + message on one timeline) FROM `screens/LanesChart.tsx` +
  `data/chartBuilder.ts`; `ReachableValueCard` (% of total ETH reachable) FROM
  `retentionCharts.tsx` + `data/holders.ts`. Both need the indexed holder base +
  wallet<->channel edges joined to ETH value. The signature product views.
- [ ] **9. Custom dashboards + chart builder + publish (FE + BE).**
  `ChartBuilder` / `ChartCard` / `computeSpec` + `PublishDialog` / public
  dashboard. FE for the builder UI + localStorage; BE for server persistence and
  public share links. Lowest priority - defer until the data tabs are real.
- [ ] **10. Range picker (FE then BE).** 7d/30d/90d `RangePicker`. Campaigns
  overview already takes `days=1..90`; `/dashboard/overview` is fixed 30d, so
  parameterizing it is **BE**.

## Key file map (port FROM -> INTO)

- `reference/.../screens/AnalyticsScreen.tsx` -> `src/features/analytics/analytics-page.tsx` (+ routes).
- `reference/.../screens/dashCharts.tsx` -> `src/features/analytics/components/charts/`.
- `reference/.../screens/retentionCharts.tsx` (CampaignFunnel, AttributionWindows, CohortGrid, LifecycleFlow, ReachableValueCard, FatigueCard) -> `src/features/analytics/components/`.
- `reference/.../screens/LanesChart.tsx` -> `src/features/analytics/components/lanes-chart.tsx`.
- `reference/.../data/{campaignModel,attribution,retentionAnalysis,workspaceTotals,holders,lifecycle,chartBuilder}.ts` -> `src/features/analytics/*.types.ts` + new typed services calling new endpoints.
- Extend: `src/features/analytics/analytics.service.ts`, `src/features/campaigns/campaigns.service.ts`.

## Bottom line

Steps 1-2 and the Overview relayout are the real frontend-shippable work now.
Steps 4-10 are gated on new backend endpoints (attribution and chain indexing
are the big lifts) - build each chart behind the existing honest empty state and
switch it on when its endpoint ships.
