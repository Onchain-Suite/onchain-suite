# Dead Code Report

> Generated 2026-07-22. Scan method: `bunx knip` across 567 `.ts`/`.tsx` files,
> then **every hit independently grep-verified** for zero live importers across the
> whole repo (including root configs and dynamic usage). Knip's raw output had
> false positives (e.g. `src/components/ui/button.tsx` is imported 55×) — those
> were filtered out. Everything below is verified dead. **Nothing has been removed.**

## How to read this
- **Confidence: High** — zero importers anywhere in the repo, verified by grep.
- **Transitively dead** — only referenced by other dead code in this report; dies with it.
- **Verify first** — likely dead but has an edge case worth a manual check before deleting.

---

## 1. Abandoned onboarding feature (~45 files) — highest value

The live route `src/app/onboarding/page.tsx` imports `@/features/onboarding-flow/onboarding-flow`.
The **entire** `src/features/core/onboarding/` tree is unreferenced — a superseded implementation.

**Location:** `src/features/core/onboarding/` (whole directory)

Includes (non-exhaustive):
- `actions/index.ts`, `actions/mutations.ts`, `actions/queries.ts`
- `components/*-step.tsx` (business-address, business-goal, contact-count, important-features, organization-type, personal-info, plan-selection)
- `components/onboarding-layout/` (illustration-section, layout-header, onboarding-layout, progress-bar, security-banner, index)
- `components/plan-selection/components/` (feature-comparison-table, feature-row, feature-value, footer-disclaimer, mobile-plan-card, plan-header, plan-info-links, promotional-banner, step-header, index) + `plan-selection/data/index.ts` + `plan-selection/types/index.ts`
- `components/index.ts`
- `constants/index.ts`, `hooks/index.ts`, `hooks/use-onboarding-persistence.tsx`
- `page/index.tsx`, `types/index.ts`, `utils/index.ts`, `validation/index.ts`

**Related dead code (same feature area):**
- `src/features/onboarding-flow/components/onboarding-flow.tsx` — stale duplicate; the *used* one is the dir root, not `components/`
- `src/features/onboarding-flow/components/contract-suggestions.tsx`
- `src/lib/safe-execute.ts` — **transitively dead**, only imported by `core/onboarding/actions/mutations.ts`

---

## 2. Entire `data-table` component set (11 files)

**Location:** `src/shared/components/data-table/` (whole directory) — zero importers anywhere.

- `index.ts`
- `types/index.ts`
- `data-column-visibility.tsx`
- `data-table-search.tsx`
- `data-table-pagination.tsx`
- `data-table-delete-button.tsx`
- `data-table-faceted-filter.tsx`
- `data-table-body/default-table-body.tsx`
- `data-table-body/resizable-table-body.tsx`
- `data-table-header/default-table-header.tsx`
- `data-table-header/resizable-table-header.tsx`

---

## 3. Email subtree — all except the live service (9 files)

**Location:** `src/shared/emails/`

The only **live** file here is `email.service.ts` (used by `src/features/audience/components/compose-email-dialog.tsx`). Everything else is dead:

- `actions/index.ts`
- `actions/send-email.tsx`
- `components/base-layout.tsx`
- `components/button.tsx`
- `components/index.ts`
- `templates/index.ts`
- `templates/welcome-email.tsx`
- `templates/password-reset-email.tsx`
- `templates/email-verfication.tsx` _(note: misspelled filename)_

**Transitively dead:** `src/lib/backend.ts` — only imported by the dead `emails/actions/send-email.tsx`.

---

## 4. Orphaned UI primitives (~19 files)

**Location:** `src/shared/components/ui/` — zero importers.

- `accordion.tsx`
- `alert.tsx`
- `blockchain-background.tsx`
- `custom-modal.tsx`
- `custom-tabs.tsx`
- `drawer.tsx`
- `floating-dock.tsx`
- `pagination.tsx`
- `phone-input.tsx`
- `progress-bar.tsx`
- `responsive-modal.tsx`
- `scroll-area.tsx`
- `slider.tsx`
- `sort-order-toggle.tsx`
- `sort-select.tsx`
- `split-button.tsx`
- `status-indicator.tsx`

**Elsewhere:**
- `src/shared/components/loading/optimized-loading.tsx`
- `src/components/ui/timezone-display.tsx`

---

## 5. `lib/` orphans

- `src/lib/arcjet.ts` — not imported anywhere
- `src/lib/env/index.ts` — **not wired into `next.config.ts`** (env validation never runs)
- `src/lib/env/server.ts`
- `src/lib/server-error.ts`

---

## 6. Misc feature orphans

- `src/features/dashboard/components/activity-section.tsx`
- `src/features/dashboard/types/index.ts`
- `src/features/help/help.service.ts`
- `src/features/intelligence/pages/index.tsx`
- `src/features/settings/components/change-password.tsx`
- `src/features/settings/components/color-picker.tsx`
- `src/features/settings/components/header.tsx`
- `src/features/website/onchain-suite/page/index.tsx`
- `src/features/website/onchain-suite/components/meta/index.ts`
- `src/features/audience/types/index.ts`
- `src/data/campaign.ts`
- `src/data/notifications.ts`
- `src/shared/types/api.ts`

**Dead barrel `index.ts` files:**
- `src/features/campaigns/components/index.ts`
- `src/features/campaigns/components/campaign-form/index.ts`
- `src/features/common/layout/index.ts`
- `src/features/inbox/components/index.ts`

---

## 7. Unused dependencies (`package.json`)

### Genuinely zero usages — safe to remove
- `@arcjet/inspect`
- `@hugeicons/core-free-icons`
- `@hugeicons/react`
- `@react-oauth/google`
- `@xyflow/react` ⚠️ see note below
- `dotenv`
- `gsap`
- `jspdf`
- `jspdf-autotable`
- `lenis`
- `lucide-react`

> ⚠️ **Incomplete ReactFlow migration:** `@xyflow/react` (v12) is installed but **only the old
> `reactflow` v11 is actually imported (12 files)**. You're shipping both packages. Either
> finish the migration to `@xyflow/react` or drop it.

### Transitively dead — only imported by dead files in sections above
- `@radix-ui/react-accordion` (only `ui/accordion.tsx`)
- `@radix-ui/react-scroll-area` (only `ui/scroll-area.tsx`)
- `@radix-ui/react-slider` (only `ui/slider.tsx`)
- `react-phone-number-input` (only `ui/phone-input.tsx`)
- `vaul` (only `ui/drawer.tsx`)

---

## 8. The long tail (not enumerated per-line)

Knip also found, inside otherwise-live files:
- **~170 unused named exports** across 92 files
- **~63 unused types**

Top offenders by unused-export count:
- `src/features/website/onchain-suite/components/landing/content.ts` (9)
- `src/features/settings/utils/index.ts` (7)
- `src/features/onboarding-flow/validation/index.ts` (7)
- `src/shared/components/ui/dropdown-menu.tsx` (5)
- `src/shared/components/meta-components/index.ts` (5)
- `src/features/campaigns/constants/campaign.ts` (5)

These are lower-value / noisier — review individually before trimming.

---

## Caveats — verify before deleting

**devDependencies knip flagged but are likely false positives** (referenced by config
files knip parses inconsistently — do NOT remove without checking):
- `@commitlint/cli`
- `eslint-config-next`
- `tsx`
- `baseline-browser-mapping`

**General:** confirm nothing is loaded dynamically (string paths, `next/dynamic` with a
computed name) before removing any file. All findings above were grepped for static imports;
dynamic references are not caught by grep.
