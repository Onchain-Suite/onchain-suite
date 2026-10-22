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

- [x] **3. Sources tab (catalog UI).** Done: search over the whole catalog, a
  category rail with counts (hidden while searching), vendor-favicon cards
  (DuckDuckGo favicon over a monogram fallback), a connector detail view, the
  connect dialog (stubbed "Authorise" toast + the real setup-doc handoff), and
  the search-miss "request a source" flow with the two fallbacks. Files under
  `src/features/integrations/components/sources/` (source-directory, source-card,
  source-detail, connect-source-dialog, source-visuals); wired into the screen's
  `sources` tab. `icons.duckduckgo.com` added to the CSP img-src allowlist.
  Live status for contracts/CSV is still the static catalog value - wired in
  step 4.
  FROM `reference/v2.7/web/src/components/SourceDirectory.tsx` (search + category
  rail + cards + detail + connect modal + search-miss "request a source" flow) and
  `source-directory.css`.
  INTO `src/features/integrations/components/source-directory.tsx` with
  shadcn/Tailwind + heroicons / `brand-logos.ts`. Wire real connect where a backend
  exists (CSV, contracts, dev SDK); keep "Authorise" as a stubbed toast for OAuth
  connectors not yet implemented, matching the reference.

- [x] **4. On-chain connector -> the real contract flow (do not rebuild the mock).**
  Done: the "Your contracts" card now shows a live status (connected once the
  workspace has indexed any contract, via `projectSettingsService` +
  `projectSettingsKey`), and its Connect action opens the real
  `ImportContractsDialog` instead of the stubbed dialog; a successful import
  invalidates the settings query so the card flips to connected. `SourceCard`
  and `SourceDetail` gained an optional `status` override. (CSV live status is
  still static - no "has imported" signal yet; left for later.)
  FROM `reference/v2.7/web/src/components/AddContract.tsx` + `ContractResolver.tsx`
  (richer paste-address/deployer/explorer/website resolver UX, if wanted).
  INTO the existing real path `src/features/audience/components/import-contracts-dialog.tsx`
  + `src/features/settings/project-settings.service.ts`. The "Your contracts" card
  and the Events tab read/write this, not a new store.

- [x] **5. Events tab (indexed contracts + product events).** Done:
  `events-tab.tsx` wired into the `events` tab. Indexed contracts are real (table
  from `projectSettingsService.contractAddresses` + chain labels, "Add contract"
  opens `ImportContractsDialog`, empty state otherwise). Product events have no
  backend yet, so that section is an honest empty state pointing at the SDK /
  analytics connectors rather than seeded mock data.
  FROM `reference/v2.7/web/src/screens/DataScreen.tsx:93-169` + `data/productEvents.ts`.
  INTO `src/features/integrations/components/events-tab.tsx`. Indexed contracts <-
  `projectSettingsService.contractAddresses`; the product-events table needs a
  backend (none today - flag as new work or seed-only).

- [x] **6. Migrate tab.** Done: a note banner (CSV fallback + "Ask us"), search
  over the 14 migration targets, a row per tool stating what it brings and what
  it leaves, and a "Migrate from X" dialog (suppressed-safe copy) with a stubbed
  "Connect X" toast. File: `src/features/integrations/components/migrate-list.tsx`,
  wired into the `migrate` tab. Reuses the already-ported `MIGRATIONS` +
  `searchMigrations`. Per-tool importers and the real CSV-fallback wiring are
  still stubbed (toast), pending backend.
  FROM `reference/v2.7/web/src/components/MigrateList.tsx` + `migrate.css` +
  `MIGRATIONS` (14 tools, from `sources.ts`).
  INTO `src/features/integrations/components/migrate-list.tsx`. The CSV-fallback path
  reuses `import-export.tsx` / `audienceService`; per-tool migrations are stubbed
  toasts initially.

- [x] **7. API + Webhooks tabs (relocation, not rebuild).** Done: the existing
  real `DeveloperApiCard` gained an `only?: "keys" | "webhooks"` prop (plus
  `title`/`description` overrides) that gates its sections and queries. The
  Integrations `api` tab renders `only="keys"` (base URL + keys + endpoint
  reference, including the `/identify` wallet-only note), the `webhooks` tab
  renders `only="webhooks"` (endpoints + the HMAC verification block). No
  behaviour change; Settings still renders the full card (default props).
  Follow-up (not blocking): `developer-api.tsx` is a 1,200-line over-budget file
  - the keys and webhooks sections should be extracted into their own components
  when next touched.
  FROM `reference/v2.7/web/src/components/ApiPanel.tsx` (tab split `only="keys"` /
  `only="webhooks"`, the endpoint reference, the `/identify` wallet-only note).
  INTO the existing real `developer-api.tsx` + `developer.service.ts`. Keep app
  behaviour (HMAC, roll, status); adopt only the reference's tab organisation and
  the endpoint-reference block.

- [ ] **8. Channels tab slot.** This branch provides the tab slot in the shell; the
  implementation lands via `v2.7-channels` (`docs/migration/channels.md`).

- [x] **9. Cleanup.** Done: removed the stale marketing `integrationsList` and
  `webhooks` demo arrays from `src/features/settings/utils/index.ts` (confirmed
  zero references across the repo; tsc clean after removal).

## Gotchas

- The reference connect flow is a mock ("Authorise" -> toast). Superseded
  2026-10-22: the flows are real now (see the status section below).
- Inbound ingestion is `POST /events` / `/events/batch` with a secret key; the
  SDK and Inbound webhook sources point at it. Segment, Zapier and the other
  streaming connectors still have no backend.

## Status 2026-10-22: wired to the connectors backend (staging)

The connect flows are real now, against `/organization/connections/*` and
`/organization/integrations/*` (staging only; a 404 surfaces as "This isn't
available on this server yet"). All are OWNER/ADMIN; other roles see a note
instead of a form.

- **Sources.** `data/connectors.ts` lists every connector the backend verifies,
  with the exact credential fields. A catalog source with a connector gets the
  real form (live verification, saved-but-rejected state, replace, disconnect)
  and then its run controls: a paged identity sync for Privy, Clerk and Dynamic,
  a one-call pull for Dune and Google Sheets, an SDK note for Magic, Reown,
  thirdweb and Web3Auth. SDK and Inbound webhook show the `POST /events` call.
  Sources with no backend (Segment, Mixpanel, Amplitude, RudderStack, Zapier)
  read as "Soon" and offer "Ask for it", instead of a fake connect.
- **Migrate.** Mailchimp, beehiiv, EmailOctopus (added to the list), Kit, Attio,
  HubSpot, Salesforce and Intercom run the paged migrate route with Stop, a
  round cap, and held-back counts. Iterable starts its background job and
  polls it. HubSpot, Salesforce and Intercom connect by OAuth. Tools with no
  importer take the CSV route.
- **Channels.** Telegram, Discord, WhatsApp, X and Farcaster connect through
  the same panel. Then: Telegram turns on opt-ins (`/activate`), Discord
  imports server members, WhatsApp shows its Meta webhook URL and verify
  token. Readiness reads the saved connections. The X stub
  (`/channels/x/status`, which never existed) is gone.
- **Events.** Product events come from `GET /events/catalog`.
- **OAuth.** The `/api/v1` proxy passes the authorize 302 through instead of
  following it. `/settings/integrations` (the callback's target) forwards to
  `/integrations?tab=migrate`, which toasts the outcome and reopens the tool.

### Backend issues found while wiring (for the backend team)

1. `APP_BASE_URL` in `.env.example` is the API base (`.../api/v1`), but the
   OAuth callback redirects to `${APP_BASE_URL}/settings/integrations`. It must
   be the frontend origin, or the person lands on the API after consenting.
2. `CreateOptInLinkDto` (Telegram) has no class-validator decorators, so the
   global `whitelist: true` strips `walletAddress` and
   `POST /organization/connections/telegram/opt-in-link` always answers
   `WALLET_ADDRESS_REQUIRED`. The Settings Telegram card calls it.
3. `GET /organization/integrations/iterable/migrate/:jobId` does not check the
   job belongs to the caller's org.
4. `GET /events/catalog` has no `OrganizationRoleGuard`; with no org resolved,
   the Prisma filter drops `organizationId` and the query is unscoped.
5. `GET /organization/connections/discord/opt-in-link` does not validate
   `walletAddress`.
6. PostHog verifies and saves, but nothing reads events from it yet.
7. The directory route `GET /organization/connections/available` exists only on
   `feat/connector-directory`. Once it ships, the static field list in
   `data/connectors.ts` can come from it. Its comment gives the OAuth path as
   `/organization/connections/oauth/...`; the real path is
   `/organization/integrations/oauth/...`.
