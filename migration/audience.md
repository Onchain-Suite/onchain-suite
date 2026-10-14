# v2.7 migration: Audience / contacts

Branch `v2.7-audience` (off `v2.7`). Reference: `reference/v2.7/web/src`. Start with
`reference/v2.7/HANDOFF.md` (§5 is the wallet-first/channel-handle contract).

## What this branch owns

The Audience feature: contacts list, contact detail, segments, and the wallet-first
data model. Reference entry is one file, `screens/AudienceScreen.tsx` (41.5 KB), plus
a `data/` model seam. App entry is the real feature at `src/features/audience/`
(~12.6 KLOC, backend-wired).

## Reference vs app at a glance

| | Reference (v2.7) | App (today) |
|---|---|---|
| Tabs | 5: contacts, lists, tags, **segments**, suppressed | 4: contacts, lists, tags, suppressed (segments folded into Lists) |
| KPI tiles | 5 (adds **"Both lanes"** coverage) | 4 (no coverage tile) |
| Contacts columns | 5, scan-first (Contact, **Stage**, Value, **Last did**, Last seen) | 8, data-dense (keeps Email/Chains/Apps/Tokens as columns, no Stage, no combined-lane cell) |
| Contact detail | one rich drawer | slide-over (quick, thin) **and** full `/audience/[id]` page (deep, backend-wired) |
| Segment builder | nested predicate **rule tree** (`segmentRules.ts`) | flat field/operator/value form in Intelligence, backend-capped |

## Current app (keep these - they are better than reference)

- **Real import/export**: `components/import-export.tsx` (2597 lines) - platform
  presets, column mapping, async job polling, error-CSV download. Plus
  `import-contracts-dialog.tsx` + `imports/` (chain-requirement, job-storage).
  Do NOT swap in the reference mock `ImportCsvModal`.
- **Real backend + org tenancy**: typed `audience.service.ts` (44 methods,
  `x-org-id`), React Query caching/mutations/invalidation, server pagination/sort/
  search. All new reads go through this seam, not axios (CLAUDE.md §3).
- **Full detail page** at `/audience/[id]` (`profile-detail.tsx`, 1112 lines) with
  real health / churn / activity / emails / transactions / contract-activity /
  dapp-stats queries.
- **Bulk ops**: multi-select -> Compose email, Apply tags, Enrich selected, Delete;
  delete-all with confirm count.
- **Wallet-first contract already enforced**: `profileReach` / `readChannels` /
  `isSyntheticWalletEmail` / `zkProtected`; `email:null` + `reachable:['email']` =
  ZK-protected, address never exposed. Do not regress this.

## What the app lacks vs reference

1. **Lifecycle stages** - entire `data/lifecycle.ts` model (6 stages:
   new|activated|engaged|at_risk|dormant|reactivated, movements, reactivated/
   slipping headline numbers). Zero presence in `src/`.
2. **"Both lanes" coverage** - the 5th KPI tile + per-row hollow-dot coverage
   signal (`coverageFor`): product-vs-chain event coverage per wallet.
3. **Interleaved both-lane timeline + "Quiet for N days"** (`LaneTimeline` /
   `timelineFor` / `quietSince`). App has separate Activity + Email + Transaction
   lists, not one lane-tagged time-sorted stream.
4. **Holdings panel** (chains/apps/tokens as logos+names in the drawer). App shows
   these as table columns; the slide-over omits them.
5. **Journeys / automation enrolments** in contact detail (`enrolmentsFor`) -
   "why did this wallet get that message?". Absent in both detail surfaces.
6. **Segments as a first-class tab** with rich `SegmentRow`: rule chips,
   per-channel reach (`reachFor`), campaign-usage warning (`segmentUsage`, "Used by
   N campaigns, M still scheduled... editing changes who they go to").
7. **Nested predicate rule tree** (`segmentRules.ts`: AND/OR nesting, `did_not`,
   frequency `count_gte`, mandatory `windowDays`, visible `≈` estimate for negation
   anti-joins, `treeFromQueryRules` to carry an Intelligence question in).
8. **Multi-channel rows** in Linked channels - reference shows X; CLAUDE.md 0.5
   wants Email/In-app/Discord/Telegram/Farcaster siblings. App slide-over models
   only Email + In-app push.
9. **"Send a test" routes push when push-reachable** (reference). App slide-over
   disables the button without an email - contradicts 0.5.

## Steps

Port FROM reference -> INTO app, re-skinned to Tailwind v4 + shadcn. FE-only =
renders from data the app already returns; BACKEND-GATED = needs a new/extended
`docs/backend.md` field + `audience.service.ts` type. No em-dashes (0.5.5).

- [x] **1. Lifecycle stage model - FE-first.** Done (`27b9505`):
  `src/features/audience/utils/lifecycle.ts` ports the reference model
  (new/activated/engaged/at_risk/dormant, priority-ordered first-match) as a pure,
  unit-tested `deriveStage` + `stageForProfile` adapter that reads the fields the
  profile already returns (`healthScore`, `engagement`, last-action recency) - no
  backend change needed. `reactivated` + stage MOVEMENTS need a backend
  `stageHistory` so they are intentionally NOT derived (kept in the type + metadata
  for when that ships); authoritative `stage`/movement counts remain BACKEND-GATED.

- [x] **2. Stage column in the contacts table - FE-only.** Done (`27b9505`):
  `StageBadge` (toned pills) in a new Stage column right after Contact (the
  reference's second column), derived via `stageForProfile`. Kept the data-dense
  8-column table for now (did NOT trim Chains/Apps/Tokens) - that trim is a
  still-open UX decision for the user, not something to drop silently.

- [ ] **3. "Both lanes" coverage - BACKEND-GATED.**
  Add a coverage/`bothLanes` figure to `AudienceOverview` + a 5th KPI card in
  `pages/index.tsx`; port the `coverageFor` concept. Needs backend product-event
  coverage per wallet. Honest empty state until it ships.

- [~] **4. Enrich the contact slide-over - mixed.** (a) Done (`f1e7fbe`):
  `components/contact-slide-over.tsx` now shows the lifecycle stage badge,
  sibling channel rows for X/Telegram/Discord/Farcaster (rendered only when
  `readChannels` marks them reachable, handle from `extractSocialHandles`),
  identity-source driven from `profile.identitySource` with an honest inferred
  fallback (no more hardcoded `"ZK-verified link"`), and a fixed "Send a test"
  gated on reachability (`emailLinked || hasPush`) instead of a plaintext address
  so ZK-protected + push-reachable contacts aren't wrongly blocked. Render-tested
  (5 cases). (b) STILL BACKEND-GATED - add a Holdings block (reuse
  `icon-cluster.tsx` + `getWalletOnchainSummary`); `getWalletOnchainSummary`
  exists, so this is wire-able as the next increment.

- [ ] **5. Interleaved both-lane timeline + "Quiet for N days" - BACKEND-GATED.**
  Port `LaneTimeline`/`timelineFor`/`quietSince` (`data/timeline.ts`) into
  `profile-detail.tsx`, merging the existing `getProfileActivity` +
  `getProfileEmails` + `getProfileTransactions` into one lane-tagged, time-sorted
  stream. Keep the per-source sections or replace per user preference.

- [ ] **6. Journeys / automation-enrolment panel - BACKEND-GATED.**
  Port `Journeys`/`enrolmentsFor` into `profile-detail.tsx` (optionally the
  slide-over). Needs `GET /audience/profiles/{id}/journeys` (enrolment + current
  step). Ties to the automations feature.

- [ ] **7. Segments as a first-class tab + rich SegmentRow - mixed.**
  Add a Segments tab to `pages/index.tsx` (distinct from Lists, or relabel Lists)
  and port `components/SegmentList.tsx` + `data/relationships.ts`: rule chips,
  per-channel reach (`reachFor`), campaign-usage warning (`segmentUsage`). FE-only
  for chips/reach if segment `criteria` + `reachableVia` are returned;
  BACKEND-GATED for the campaign-usage edge (`GET /audience/segments/{id}/campaigns`).

- [ ] **8. Nested predicate segment rule builder - BACKEND-GATED (largest, do last).**
  Port `data/segmentRules.ts` (nested AND/OR, `did_not`, frequency, mandatory
  window, `≈` estimate, `treeFromQueryRules`) into a new
  `src/features/audience/segments/` (or extend
  `src/features/intelligence/components/segments/segments-view.tsx`). Requires
  backend operators beyond today's numeric+recency cap - coordinate the `criteria`
  schema first.

- [ ] **9. Holder-base reach view - BACKEND-GATED (optional).**
  Port `data/holders.ts` concept ("reachable value vs holders you hold", ~34% link
  rate) as a coverage insight. Needs indexed holder data.

Suggested order: FE-first 1, 2, 4a, then 7 (chips/reach), then BACKEND-GATED 3, 4b,
5, 6, 7 (usage edge), 8, 9.

## Pitfalls to preserve while porting

- Keep `email:null` + `reachable:['email']` = `ZK-protected`; never expose the
  address (HANDOFF §5, CLAUDE.md 0.5). App already does this in row + slide-over.
- Keep the app's real import/export and job plumbing; do NOT swap in the reference
  mock `ImportCsvModal`.
- Keep `audienceService` as the typed seam; all new reads go through it.
- Reimplement reference visuals in Tailwind v4 + shadcn; port the logic, not the CSS.
- No em-dashes in any copy you add.
