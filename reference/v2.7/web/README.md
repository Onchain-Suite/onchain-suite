# OnchainSuite — production web app

A real **Vite + React 18 + TypeScript** build of the OnchainSuite dashboard — the productionization
of the hi-fi prototype in `../app`. This is the app you extend toward $5B-grade; the prototype
stays as the visual reference.

## Run

```bash
cd web
npm install
npm run dev      # http://localhost:4175
npm run build    # typecheck + production build to dist/
npm test         # vitest (unit + interaction + a11y)
npm run lint     # eslint incl. jsx-a11y (0 warnings enforced)
```

## What's real here (vs the prototype)

- **Router** (`react-router-dom`) with an onboarding gate and **route-level code-splitting** — every
  screen is its own lazy chunk (see the build output).
- **Typed, swappable data layer**: `src/data/types.ts` (domain contracts) → `src/data/mock.ts`
  (deterministic mock, internally consistent) → `src/data/api.ts` (async, latency-simulating; swap
  the bodies for `fetch()` to go live) → `src/data/useAsync.ts` (loading/error states) and a reactive
  `src/data/store.ts` for client mutations (list/tag CRUD, onboarding) via `useSyncExternalStore`.
- **Theme system** (`src/theme.tsx`) — light/graphite-dark, persisted, `data-theme` on `<html>`.
- **Accessible primitives** (`src/components/ui.tsx`) — Button, Table, Modal/Drawer with **focus trap +
  Esc + return-focus**, Switch, fields, etc. Icons are tree-shaken from `lucide-react`.
- **App shell** (`src/shell/Shell.tsx`) — collapsible icon-rail sidebar (persisted, auto-rails under
  860px), **account+workspace menu in the footer** (with Invite/share), command palette (⌘K), skip link.
- **Tests** (`src/**/*.test.tsx`) — data integrity, component behaviour, the Audience list/tag
  **drill-down** regression, and **axe** a11y smoke tests. All green.

## Product fixes folded in (from review feedback)

- **Lists/Tags drill-down** — clicking a list or tag opens its member wallets **with their emails**
  (was a no-op in the prototype). `AudienceScreen` → `MemberView`.
- **Campaigns "Upcoming" cards** now open the campaign (were a dead chevron affordance).
- **Workspace switcher** moved out of the top bar into the sidebar **account menu** (Invite people,
  Workspace settings, Switch workspace, Sign out).
- **Collapsible nav** (icon rail) with persistence + responsive auto-collapse.
- **Intelligence** chat surface is labelled **OS MCP** (not "Chat").
- Mock data made internally consistent (KPI totals derive from the actual contact set).

## Remaining phases (same patterns)

These screens are present and data-driven but their deep builders are the next work:
- **Campaign wizard** (Audience → Message → Review) + block **email editor**.
- **Automations flow builder** (React Flow canvas: multi-trigger OR, steps, branches).
- **Intelligence** live query execution + saved segments feeding the wizard.
- **Forms** builder (Style · Template · Content) and submissions funnel.
- Real auth, API wiring, and an e2e suite (Playwright).
