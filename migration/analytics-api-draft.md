# Analytics: API draft for the backend

Status: **draft, 2026-10-22.** The frontend for everything below is built and
running on mocks (`src/features/analytics`). Each section says what the UI does
today, the routes and shapes it expects, and where the frontend switches over.

Conventions match the existing analytics endpoints: org-scoped via `x-org-id`,
`{ success, data }` envelope, `?period=7d|30d|90d` compared against the window of
equal length before it, rates as **percentages** (`42.3`), and `null` (never `0`)
for "can't be computed".

---

## 1. Custom dashboards, saved charts and published links

**Today:** stored in the browser (localStorage, per org) by
`localDashboardsApi` in `src/features/analytics/dashboards.service.ts`. An HTTP
client for the routes below is already written (`httpDashboardsApi`); set
`NEXT_PUBLIC_ANALYTICS_DASHBOARDS_API=1` to switch. Types:
`src/features/analytics/contracts/dashboards.ts`.

### Data model

```ts
type MetricId =
  | "reach_over_time" | "conversions_over_time" | "conversion_rate_over_time"
  | "messages_by_channel" | "engagement_rates" | "push_funnel"
  | "onchain_activity" | "conversions_by_event" | "new_contacts_by_week"
  | "reachability" | "lifecycle" | "segment_engagement"
  | "holders_by_balance" | "cohort_retention";

type ChartKind = "line" | "area" | "bar" | "stacked" | "hbar" | "donut" | "number" | "table";

interface ChartSpec { id: string; title: string; metric: MetricId; chart: ChartKind }

interface Dashboard {
  id: string;                 // "overview" | "conversions" | "engagement" | "retention" for built-ins
  name: string;
  builtIn: boolean;
  chartCount: number;
  createdAt: string | null;   // ISO
  updatedAt: string | null;
  period: "7d" | "30d" | "90d";
  charts: ChartSpec[];        // ordered; the UI renders them in this order
}

interface PublishedLink {
  token: string;              // unguessable, >= 128 bits
  dashboardId: string;
  title: string;
  url: string;                // absolute, e.g. https://app.onchainsuite.com/d/<token>
  createdAt: string;
}
```

A chart stores **what to show, never the numbers**: each `MetricId` maps to
endpoints that exist today (see `src/features/analytics/data/metric-catalog.ts`),
so charts always recompute. Validate `metric` and `chart` against the lists
above; reject unknown values with `400 INVALID_CHART`.

### Routes (OWNER/ADMIN/EDITOR write; VIEWER read)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/analytics/dashboards` | | `DashboardSummary[]` (built-ins first, then custom by `createdAt`) |
| POST | `/analytics/dashboards` | `{ name, charts? }` | `Dashboard` |
| GET | `/analytics/dashboards/:id` | | `Dashboard` (built-ins always resolve, with `charts: []` if never saved) |
| PATCH | `/analytics/dashboards/:id` | `{ name?, period?, charts? }` | `Dashboard` |
| POST | `/analytics/dashboards/:id/duplicate` | | `Dashboard` (`"<name> copy"`, new chart ids) |
| DELETE | `/analytics/dashboards/:id` | | 204 |
| GET | `/analytics/dashboards/:id/links` | | `PublishedLink[]` |
| POST | `/analytics/dashboards/:id/links` | `{ title? }` | `PublishedLink` |
| GET | `/analytics/links` | | `PublishedLink[]` (every live link in the org; the Getting started checklist ticks "Publish a dashboard" from it) |
| DELETE | `/analytics/links/:token` | | 204 |

Rules:

- Built-in ids are reserved. `PATCH` on a built-in accepts `charts` and `period`
  only (ignore or `400` a `name`); `DELETE` on a built-in is `400`.
- `DELETE` of a dashboard revokes all its links in the same transaction.
- Limits: 50 custom dashboards per org, 24 charts per dashboard, name 1–80 chars.
- Audit-log create/delete/publish/revoke.

### Public read (no auth)

`GET /public/dashboards/:token`

```ts
interface PublicDashboard {
  title: string;
  workspaceName: string;
  period: "7d" | "30d" | "90d";
  computedAt: string;
  charts: Array<{ spec: ChartSpec; data: ChartData }>;
}

interface ChartData {
  categoryKey: string;
  rows: Array<Record<string, string | number | null>>;
  series: Array<{ key: string; label: string }>;
  unit: "count" | "percent" | "seconds";
  total: number | null;
  emptyReason?: string;
}
```

The server computes every chart, so an anonymous viewer needs no org access.
`ChartData` is exactly what `resolveMetric()` in
`src/features/analytics/utils/resolve-metric.ts` produces today; porting that
function to the backend is the simplest correct implementation. For a built-in
dashboard, include the tab's built-in charts (listed in
`src/features/analytics/data/builtin-layouts.ts`) before the user's own.

Must hold: aggregates only, never contact-level rows; `404` for revoked or
unknown tokens (no difference between the two); cache 60s; rate-limit per token.

---

## 2. Which events count as conversions

**Today:** `/organization/analytics/overview`, `/timeseries` and `/attribution`
read `organization.metadata.analytics.conversionEvents`, but nothing in the API
can set it, so every conversion metric is `null` and the UI says "choose which
on-chain events count as conversions". No setting UI is shipped, because a
local mock would not change any number.

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/organization/analytics/conversion-events` | | `{ events: string[], windowHours: number, available: Array<{ event, source: "onchain" \| "product", count30d }> }` |
| PUT | `/organization/analytics/conversion-events` | `{ events: string[], windowHours?: number }` | same as GET |

`available` lists events seen in the last 30 days (on-chain watches plus
`/events/catalog`), so the UI can offer a picker. Cap at 25 events (the reader
already slices to 25); `windowHours` 1–720, default 72.

---

## 3. Metrics the not-measured-yet cards need

Each card renders a "Not measured yet" state today, in the reference layout.
All take `?period=`.

### 3.1 Reachable value (Overview)
`GET /organization/analytics/reachable-value`

```ts
{
  unit: "usd";
  total: number;            // holdings across indexed holders
  reachable: number;        // held by wallets with at least one reachable channel
  pct: number | null;
  byChannel: Array<{ channel: "email" | "inapp" | "x" | "telegram" | "discord" | "farcaster"; value: number; wallets: number }>;
  series: Array<{ bucket: string; reachable: number; outOfReach: number }>;
}
```

### 3.2 Direct vs influenced credit (Conversions)
Extend `/organization/analytics/attribution` with
`byChannel: Array<{ channel, direct: number, influenced: number }>` where direct
= clicked then converted within the channel's click window, influenced =
delivered/viewed then converted within the influence window. Return the windows
used: `windows: Array<{ channel, directMinutes, influencedHours }>`.

### 3.3 Time to convert (Conversions)
`GET /organization/analytics/attribution/delays`
`{ buckets: Array<{ label: "<15m" | "1h" | "4h" | "12h" | "24h" | "3d" | ">3d"; minutes: number; share: number }>, byChannel: Array<{ channel, medianMinutes, coveragePct }> }`

### 3.4 Sending frequency vs cost (Engagement)
`GET /organization/analytics/fatigue`
`{ rows: Array<{ perWeek: number; wallets: number; convPct: number | null; unsubPct: number | null }>, knee: number | null }`
Messages per wallet per week (1–7+), with conversion and unsubscribe rate at
each level; `knee` = the frequency after which conversions stop rising.

### 3.5 Lifecycle movement (Retention)
`GET /organization/analytics/lifecycle`
`{ counts: Array<{ stage, count }>, movements: Array<{ from, to, count }>, reactivated: number, slipping: number }`
Needs a daily snapshot of each contact's stage. Stages today come from
`/audience/overview` (`activeCount` / `coolingCount` / `coldCount`).

### 3.6 Retention curve split (Retention)
Add `?split=messaged` to `/analytics/reports/retention-cohorts`, returning
`{ cohorts, curves: { messaged: number[], neverMessaged: number[] } }` as
percentages by week since joining.

### 3.7 Smaller gaps
- `/organization/analytics/onchain`: `swaps` is always `null`.
- `/organization/analytics/timeseries`: add `messages_email` and
  `messages_inapp` metrics so "Messages sent by channel" can be per day.
- `/dashboard/overview` and `/organization/analytics/overview` overlap; the
  Analytics tabs use the latter. `messagesSent` has no previous-period value
  (`/campaigns/analytics/overview` returns no `previous`), so the KPI strip shows
  no delta for it.
- `/analytics/reports/engagement-by-segment`: `pushViewRate` is always `0`.
