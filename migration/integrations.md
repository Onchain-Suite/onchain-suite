# v2.7 migration: Integrations

Branch `v2.7-integrations` (off `v2.7`). Reference: `reference/v2.7/web/src`. Start
with `reference/v2.7/HANDOFF.md`.

## Target architecture (decided)

One top-level Integrations screen, reference-faithful (`DataScreen.tsx`), with six
tabs: `sources, events, migrate, channels, webhooks, api`. The mental model is
"every connection in and out: sources in, channels out". **This branch owns the
screen shell plus sources / events / migrate / webhooks / api.** The `channels`
tab is built on `v2.7-channels` and plugs into this shell, so keep the shell's
tab contract stable and coordinate that one slot (see `docs/migration/channels.md`).

Today: Integrations is a Settings sub-tab (3 cards); there is no top-level screen,
no route, no connector catalog.

## Preserve (the app already does these better than the reference mock)

The reference's `ApiPanel` / `PushInstall` are mocks. The app versions are real and
richer. Adopt the reference's layout, not its behaviour.

- Developer API: `src/features/settings/components/integrations/developer-api.tsx` +
  `developer.service.ts` (sk keys, roll, status, HMAC webhooks).
- In-app web SDK: `inapp.tsx` + `inapp.service.ts` (origins, publishable key, live
  session count, test push).
- Mobile push: `push-credentials.tsx` + `push-credentials.service.ts` (real APNs/FCM
  verify, `verified`/`lastError`).
- CSV + contract import: `src/features/audience/components/import-export.tsx`,
  `import-contracts-dialog.tsx` + `projectSettingsService`.
- Role-gating (OWNER/ADMIN) and org scoping (`x-org-id`) throughout.

## Steps

- [x] **1. Scaffold the screen, route, and nav.** Done: top-level `/integrations`
  route + sidebar entry (between Analytics and Settings) + a six-tab screen shell
  (`sources/events/migrate/channels/webhooks/api`) with `?tab=` deep-linking and
  per-tab placeholders. Files: `src/app/(dashboard)/integrations/page.tsx`,
  `src/features/integrations/pages/integrations.page.tsx`, route in
  `src/shared/config/app-routes.ts`, nav in the dashboard layout. The old unused
  `INTEGRATIONS: "settings/integrations"` route constant was removed.
  FROM `reference/v2.7/web/src/screens/DataScreen.tsx` (tab frame, empty-state
  "Start here: index your contract" nudge) and `shell/Shell.tsx:34` (nav entry).
  INTO new route `src/app/(dashboard)/integrations/page.tsx` + feature dir
  `src/features/integrations/`; add the sidebar entry in
  `src/shared/components/layout/nav-main.tsx`. Decide what the old Settings ->
  Integrations tab becomes (redirect to the new screen, or an "API & SDKs" tab).
  Use app shells (`PageHeader`, `SettingsCard`, Tabs), not reference CSS.

- [x] **2. Port the connector data-seam.** Done: catalog ported verbatim (~20
  connectors, 5 kinds, 14 migrations) into `src/features/integrations/` as
  `types/sources.ts` (domain types), `data/sources.ts` (static catalog +
  `FRESHNESS`/`LANE_LABEL`/`SOURCE_KINDS`/`SOURCES`/`MIGRATIONS`/`FALLBACK_IDS`),
  `utils/sources.ts` (pure `searchSources`/`sourcesOfKind`/`sourceCount`/
  `fallbackSources`/`setupDocUrl`/`searchMigrations`, unit-tested), and
  `hooks/use-requested-sources.ts` (the "request a source" store, localStorage
  short-term, SSR-safe). Icons are kept as a `SourceKindIcon` key the UI maps to
  Heroicons. Em-dashes from the reference converted to hyphens per house style.
  FROM `reference/v2.7/web/src/data/sources.ts` (whole file: `DataSource`,
  `SourceKind`, `SourceStatus`, `Freshness`+`FRESHNESS`, `Lane`+`LANE_LABEL`,
  `SOURCE_KINDS`, `SOURCES` (~20 connectors), `searchSources`/`sourcesOfKind`/
  `sourceCount`, `FALLBACK_IDS`/`fallbackSources`, `requestSource`/
  `useRequestedSources`, `setupDocUrl`, `MIGRATIONS`/`searchMigrations`).
  INTO `src/features/integrations/data/sources.ts` (catalog as static typed data) +
  `src/features/integrations/contracts/` for the types. Replace the
  `useSyncExternalStore`/localStorage request-store with a React Query mutation
  (or keep localStorage short-term). Keep the `Freshness`/`Lane`/`status`
  taxonomies verbatim - they are load-bearing for the UX.

- [ ] **3. Sources tab (catalog UI).**
  FROM `reference/v2.7/web/src/components/SourceDirectory.tsx` (search + category
  rail + cards + detail + connect modal + search-miss "request a source" flow) and
  `source-directory.css`.
  INTO `src/features/integrations/components/source-directory.tsx` with
  shadcn/Tailwind + heroicons / `brand-logos.ts`. Wire real connect where a backend
  exists (CSV, contracts, dev SDK); keep "Authorise" as a stubbed toast for OAuth
  connectors not yet implemented, matching the reference.

- [ ] **4. On-chain connector -> the real contract flow (do not rebuild the mock).**
  FROM `reference/v2.7/web/src/components/AddContract.tsx` + `ContractResolver.tsx`
  (richer paste-address/deployer/explorer/website resolver UX, if wanted).
  INTO the existing real path `src/features/audience/components/import-contracts-dialog.tsx`
  + `src/features/settings/project-settings.service.ts`. The "Your contracts" card
  and the Events tab read/write this, not a new store.

- [ ] **5. Events tab (indexed contracts + product events).**
  FROM `reference/v2.7/web/src/screens/DataScreen.tsx:93-169` + `data/productEvents.ts`.
  INTO `src/features/integrations/components/events-tab.tsx`. Indexed contracts <-
  `projectSettingsService.contractAddresses`; the product-events table needs a
  backend (none today - flag as new work or seed-only).

- [ ] **6. Migrate tab.**
  FROM `reference/v2.7/web/src/components/MigrateList.tsx` + `migrate.css` +
  `MIGRATIONS` (14 tools, from `sources.ts`).
  INTO `src/features/integrations/components/migrate-list.tsx`. The CSV-fallback path
  reuses `import-export.tsx` / `audienceService`; per-tool migrations are stubbed
  toasts initially.

- [ ] **7. API + Webhooks tabs (relocation, not rebuild).**
  FROM `reference/v2.7/web/src/components/ApiPanel.tsx` (tab split `only="keys"` /
  `only="webhooks"`, the endpoint reference, the `/identify` wallet-only note).
  INTO the existing real `developer-api.tsx` + `developer.service.ts`. Keep app
  behaviour (HMAC, roll, status); adopt only the reference's tab organisation and
  the endpoint-reference block.

- [ ] **8. Channels tab slot.** This branch provides the tab slot in the shell; the
  implementation lands via `v2.7-channels` (`docs/migration/channels.md`).

- [ ] **9. Cleanup.** Remove the stale marketing `integrationsList` and `webhooks`
  demo arrays in `src/features/settings/utils/index.ts:148-170` once the real
  catalog lands (confirm no remaining references first).

## Gotchas

- The reference connect flow is a mock ("Authorise" -> toast). Real OAuth / API-key /
  webhook connect flows are net-new backend work; stub them in the UI meanwhile.
- No inbound ingestion endpoint exists yet (see the channels + integrations scoping
  doc). The streaming connectors (Segment, PostHog, Zapier, Inbound webhook) do
  nothing until that lands.
