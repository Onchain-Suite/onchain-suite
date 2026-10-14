# v2.7 migration: Onboarding

Branch `v2.7-onboarding` (off `v2.7`). Reference: `reference/v2.7/web/src`. Start with
`reference/v2.7/HANDOFF.md`.

## What this branch owns

The **first-mile**: everything between "account exists" and "user has done the one
thing that makes the product useful" (indexed a contract, so there is a wallet
audience to act on). Two layers in the reference:

- **Phase A - guided wizard** (`components/GuidedOnboarding.tsx` +
  `data/guidedOnboarding.ts`): a role-branched intro (builder vs operator) that
  hands off into the app.
- **Phase B - empty-workspace first-mile** (the bigger, more valuable half):
  the app itself is "empty vs live" aware and teaches in place - a self-removing
  checklist pinned in the sidebar, a "Start here: index your contract" banner, a
  guided product tour, and a single shared empty-state component.

## Current app (what exists today)

- `src/features/onboarding-flow/` - the **active** 2-step wizard (org + plan),
  backend-gated, with `use-onboarding-tracking.tsx` (resumable). Keep this as the
  Phase A spine; it is real and wired.
- `src/features/core/onboarding/` - a **dead** 7-step wizard (includes a phone
  step). Not routed. Cleanup candidate (step 11).
- `src/features/dashboard/components/get-started.tsx` - an 8-task checklist in an
  in-page carousel. This is the closest thing to Phase B's checklist, but it is
  in-page (not sidebar-pinned) and does not self-remove.
- `src/features/dashboard/components/contract-address-nudge.tsx` - a single nudge,
  the seed of the "Start here: index your contract" idea.
- `src/features/campaigns/.../new-user.tsx` (`NewUserFlow`, `isNewUser`) - a
  first-run flow whose `isNewUser` reset is a TODO stub.

### What the app lacks vs reference

1. **Empty-workspace mode** - no `WorkspaceMode` (`empty | live`) signal the whole
   app can branch on. Today surfaces each decide emptiness ad hoc.
2. **Index-in-progress signal** - no "we are indexing your contract" interim
   state between "nothing" and "live audience".
3. **Unified `SectionEmpty`** - each surface rolls its own empty state; reference
   has one component (`SectionEmpty.tsx`) so they read consistently.
4. **"Start here" banner** on data screens (reference `DataScreen` banner).
5. **Sidebar-pinned, self-removing checklist** (reference `GettingStarted.tsx`) -
   app's checklist is in-page and persistent.
6. **Guided product tour** (reference `data/tour.ts` + `CerebraTour.tsx`, 9 stops).
7. **Role branch + handoff** (builder vs operator) from the wizard into the app.
8. **`pendingProject` continuity** - carrying the just-entered contract/project
   from the wizard into the first-mile without a round-trip.

## Preserve (the app already does these better)

- The real org/plan creation + resumable tracking in `onboarding-flow/`
  (`use-onboarding-tracking.tsx`). Do NOT swap in the reference's in-memory wizard.
- The dashboard's real task data behind `get-started.tsx` - rebuild the checklist
  UI (sidebar-pinned, self-removing) but keep deriving tasks from live state.
- Honest backend-gating: the "indexing" and role-handoff signals need backend
  fields; surface an honest interim state rather than faking "live".

## Steps

Port FROM reference -> INTO app, re-skinned to Tailwind v4 + shadcn (reference uses
hand-built CSS-token UI). FE-only = renders from state the app already has;
BACKEND-GATED = needs a new/extended `docs/backend.md` field + service type. No
em-dashes in copy (CLAUDE.md 0.5 directive 5).

- [x] **1. Workspace mode (`empty | live`) - foundation, FE-first.** Done
  (`aa86014`): `src/features/onboarding/utils/workspace.ts` holds a pure,
  unit-tested `deriveWorkspaceMode` (empty = no contract tracked + zero contacts,
  live otherwise) and `hooks/use-workspace-mode.ts` derives it from the dashboard
  checklist's existing project-settings + audience-overview reads (shared query
  keys dedupe, no new endpoints). Holds `live` while loading so teaching UI never
  flashes at a populated account. Dropped the reference's persisted demo toggle +
  simulated index timer as dishonest; an authoritative `workspaceMode` + indexing
  status stays BACKEND-GATED (step 4).

- [x] **2. Unified `SectionEmpty` component - FE-only.** Done (`db5503e`):
  `src/shared/components/common/section-empty.tsx` is a presentational, prop-driven
  empty state (icon, title, body, optional action + an optional "waiting on your
  first indexed contract" / "indexing X, on its way" hint). Owns no data reads, so
  it stays decoupled from the backend-gated indexing signal (step 4) and reads the
  same everywhere; the caller renders it when `useWorkspaceMode()` is `empty`.
  Icons are heroicon components, not a string registry (CLAUDE.md section 5).
  Matches the app's Card empty-state idiom + semantic tokens. Render-tested (6
  cases). Not yet wired into any surface (steps 3+ consume it).

- [x] **(Added, per product) Onboarding time per protocol.** Done
  (`58f6c7f`): time-on-onboarding was only reported when a protocol *finished* the
  wizard, and only covered the 2-step form. Closed both gaps:
  (a) **Abandonment flush** - `hooks/use-onboarding-abandonment.ts` beacons the
  current step's elapsed time (`action: "abandoned"`) on `visibilitychange`-hidden
  / `pagehide`, so protocols that drop partway still count; `markCompleted()`
  disarms it on a normal finish. (b) **Time-to-value** - the wizard stamps a
  durable first-mile start; `hooks/use-time-to-value.ts` (mounted on the dashboard)
  closes the clock the first time the workspace reads `live` and reports once (no
  stamp -> never reports, so existing protocols are untouched). Pure timing math in
  `utils/onboarding-timing.ts` (unit-tested). The `workspace_live` milestone rides
  the existing `POST /onboarding/track` metadata; a first-class backend
  `timeToValueSeconds` field stays BACKEND-GATED. Per-protocol aggregates surface
  in the separate `onchain-admin` app (`GET /onboarding/admin/summary`).

- [ ] **3. "Start here: index your contract" banner - FE-only.**
  Port the reference `DataScreen` banner into the dashboard (extend
  `contract-address-nudge.tsx`). Shows while workspace is empty; CTA opens the
  contract-index flow; self-hides once a contract is indexed.

- [ ] **4. Index-in-progress state - BACKEND-GATED.**
  Add an "indexing your contract" interim surface between empty and live. Needs a
  backend indexing-status field (job state + progress). Until then, show an honest
  "indexing can take a few minutes" placeholder, not a fake live audience.

- [ ] **5. Sidebar-pinned, self-removing checklist - mixed.**
  Port reference `GettingStarted.tsx` + `data/setup.ts` (`useSetupSteps`, 6
  data-derived steps) into a sidebar-pinned checklist, replacing the in-page
  `get-started.tsx` carousel. FE-only for the UI + self-removal; keep deriving the
  6 steps from the app's existing live state. Unify with `get-started.tsx` so
  there is one checklist, not two.

- [ ] **6. Guided product tour - FE-only.**
  Port reference `data/tour.ts` + `CerebraTour.tsx` (9 stops) into
  `src/features/onboarding/`, re-skinned. Triggered after the wizard / from the
  checklist; dismissible; remembers completion.

- [ ] **7. Role branch (builder vs operator) in the wizard - mixed.**
  Port reference `data/guidedOnboarding.ts` role branching into `onboarding-flow/`
  so the wizard asks role and tailors the first-mile copy/CTAs. FE-only for the
  branch UI; BACKEND-GATED to persist `role` on the org/user.

- [ ] **8. Wizard -> app handoff + `pendingProject` continuity - BACKEND-GATED.**
  Carry the just-entered contract/project from the wizard into the first-mile.
  Needs the contract to be persisted and the dashboard to read it back; wire the
  handoff so step 3's banner is pre-filled.

- [ ] **9. Fix `NewUserFlow.isNewUser` reset - FE-only.**
  Replace the TODO stub in `campaigns/.../new-user.tsx` so `isNewUser` resets off
  the real first-mile-complete signal (workspace mode from step 1), not a stub.

- [ ] **10. First-mile cohort insight + no-email CTA - BACKEND-GATED.**
  Per CLAUDE.md 0.5.5, once a contract is indexed show an auto-generated cohort
  insight with a no-email CTA ("reach these wallets with an in-app push"). Ties to
  audience + channels. Needs the cohort-insight read.

- [ ] **11. Dead-code cleanup - FE-only.**
  Remove `src/features/core/onboarding/` (the unrouted 7-step wizard) once the
  above lands and nothing references it.

Suggested order: FE-first 1, 2, 3, 6, then 5, 7, 9, then BACKEND-GATED 4, 8, 10,
then cleanup 11.

## Pitfalls to preserve while porting

- Keep `onboarding-flow/`'s real org/plan creation + resumable tracking; the
  reference wizard is a mock, do not import it.
- Keep the checklist's steps derived from live state, not hardcoded.
- Surface indexing/role as honest interim/gated states; never fake "live".
- Reimplement reference visuals in Tailwind v4 + shadcn; port the logic, not the
  CSS.
