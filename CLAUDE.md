# CLAUDE.md - Frontend rendering & engineering guide

This file guides anyone (humans or AI agents) editing the OnchainSuite frontend.
Its job is to push the codebase toward **world-class production rendering
performance** and **maintainable frontend engineering**.

Scope right now: **rendering speed + frontend architecture only**. Do NOT make
design/visual decisions - the team hasn't finalized design. Keep existing
visuals; change *how* things render, not *how they look*. When a change forces a
visual choice, keep it minimal and theme-token based, and call it out.

Stack: Next.js 16 (App Router) · React 19 · TypeScript · React Query v5 · SWR ·
Tailwind v4 · shadcn/ui · Heroicons · framer-motion · Recharts · ReactFlow ·
axios · react-hook-form + zod.

---

## 0. Standing directives

1. Implement the latest API endpoints from `docs/backend.md`; model typed
   request/response contracts, never `any`.
2. Reduce frontend render time as much as possible - this whole document is how.
3. Model the domain **wallet-first** (Section 0.5). It's the product standard,
   shared with the backend; UI/data contracts must conform.
4. **Keep the tree tidy (Section 15).** Feature-first folders, backend
   contracts in `<feature>/contracts/`, tests colocated, and no new file over
   ~400 lines. Structure is the thing that decays silently.
5. **No em-dashes.** Never use the em-dash character (Unicode `U+2014`) anywhere
   in the frontend: not in UI copy, string literals, JSX text, or comments. Use
   a hyphen (`-`), a comma, a colon, or restructure the sentence. This keeps
   copy consistent and on-brand. (Ellipsis `…` and arrows `→` are fine.)

---

## 0.5 Product data contracts (wallet-first - shared standard)

Mirrors the backend `CLAUDE.md` Section 2.5. These are product invariants; the
frontend consumes and must not contradict them.

1. **Wallet is the identity.** Type a contact around `walletAddress` as the primary
   key; `email`, `farcaster`/FID, `x`, `ens`, `telegram`, `discord` are optional
   **channel handles** (`{ value, source, verifiedAt, optInAt }`). A wallet with
   zero channels is valid - never gate UI (forms, tables, selection) on an email
   existing, and never send an empty email as required.
2. **Channel-aware reachability.** "reachable on in-app push" ≠ "has email". Model
   reachability per channel in audience/segment builders; don't assume email.
3. **Never render PII from plaintext assumptions.** Email/FID/X/Discord are PII and
   are blind-indexed/encrypted server-side. Display only what the API returns
   (decrypted at the boundary); don't build client-side joins/dedup on raw email -
   use the server's contact id / wallet.
4. **Multi-channel, one trigger.** The automation builder's send nodes are siblings
   - `{ Send Email, Send In-App Push, Post to Discord, Post to Telegram, Post to
   Farcaster }` - over a shared trigger/segment contract. Per-channel analytics
   differ (email: Sent/Delivered/Opened/Clicked; in-app: Delivered/Viewed/
   Dismissed/Clicked; posts: Posted/Reactions/Replies) - type them separately.
5. **Protocol Plays** are versioned specs the user forks into an editable
   automation; render the gallery by tier (Starter first) with "Ready to fork" vs
   "Needs setup" from the Play's tier/gate. First-mile shows an auto-generated
   cohort insight with a no-email CTA ("reach these wallets with an in-app push").

---

## 1. Golden rules (read first)

1. **Server Components by default.** Add `"use client"` only when a file needs
   state, effects, refs, browser APIs, or event handlers. Push client boundaries
   as far down the tree as possible (leaf, not page).
2. **Render only what's visible.** Paginate or virtualize anything that can grow
   past ~100 rows/items. Never map thousands of nodes into the DOM.
3. **Fetch once, cache, don't re-fetch on focus/reconnect.** The shared
   `QueryClient`/`SWRConfig` defaults already enforce this - keep it that way.
4. **Every async op is bounded.** Long/agentic calls (MCP, enrichment, streams)
   must have a timeout and an abort path. No request may hang forever.
5. **Stable references.** Memoize derived data and callbacks that feed memoized
   children, effect deps, or query keys. Don't allocate new objects/arrays in
   render that become dependencies.
6. **Measure before and after.** Use the React Profiler / Web Vitals; don't
   guess. A change "for perf" without a number is a maybe.
7. **Type the boundary.** One typed service per API family; unwrap the
   `{ success, data }` envelope once, in the service - components consume typed
   data.

---

## 2. Rendering model (RSC, client boundaries, streaming)

- **Default to Server Components** for pages, layouts, and static/presentational
  subtrees. They ship zero JS and render data on the server.
- **`"use client"` is a cost.** Everything it imports ships to the browser. A
  client page that renders 20 static sections is 20 sections of needless JS.
  Extract the interactive bit into a small client component and keep the rest
  server-rendered.
- **Co-locate the boundary.** Prefer `Parent(server) → InteractiveChild(client)`
  over making the whole page client just for one button.
- **Stream with Suspense.** Wrap slow data regions in `<Suspense>` with a
  skeleton so the shell paints immediately. Don't block the whole route on the
  slowest query.
- **`loading.tsx` / `error.tsx`** per route segment for instant feedback and
  resilient failures.
- **Never import server-only code into client files** (and vice versa). Keep
  service modules isomorphic or clearly split.

## 3. Data fetching & caching

- **React Query is the default** for server state. Conventions:
  - Query keys are arrays, hierarchical, and include every input:
    `["intelligence","query", queryId, "results", { page, limit }]`.
  - The app sets sane global defaults (`refetchOnWindowFocus: false`,
    `refetchOnReconnect: false`, `staleTime`, `retry: 1`) in
    `src/shared/providers/root-providers.tsx` and the dashboard `QueryClient`.
    Inherit them; only override per-query with a reason.
  - `enabled` to gate dependent queries; never fire with missing inputs.
  - Mutations: `onSuccess` invalidates the minimal set of keys. Use optimistic
    updates for snappy UX, with rollback in `onError`.
- **One service layer per domain** (`*.service.ts`). It owns URLs, headers
  (`x-org-id`), envelope unwrapping, and typed responses. Example pattern:
  `features/intelligence/intelligence.service.ts`. Components never call axios
  directly.
- **Parallelize, don't waterfall.** Independent requests run with
  `Promise.all` / parallel queries - not awaited one after another.
- **Debounce user-driven fetches** (search, audience estimate) ~300–400ms; see
  `features/campaigns/.../audience-step.tsx`.
- **SWR** is used for a few org-level reads - same discipline: focus/reconnect
  revalidation off, dedupe interval set (see the global `SWRConfig`).
- **Bound long calls.** Pass `signal` (AbortController) and a `timeout` to
  agentic/streaming requests; expose a Stop control. The MCP query in
  `intelligence.service.ts` / `query/index.tsx` is the reference.
- **Don't store server data in component state** when a query can own it (avoids
  duplicate sources of truth and extra renders).

## 4. Rendering data fast (lists, tables, grids)

- **Paginate at the source.** Request `page`/`limit`; render a page, not a
  dataset. Backends cap rows (e.g. SQL results cap at 500) - respect it.
- **Virtualize large/variable lists.** Add **`@tanstack/react-virtual`** (not
  currently installed) for any list/table that can exceed a screen - render only
  rows in view. Mandatory for results grids, audience tables, long histories.
- **Derive with `useMemo`.** Compute columns, filtered/sorted rows, totals once
  per input change - not every render. Heavy transforms belong in memos or the
  service, not inline JSX.
- **Stable, meaningful `key`s** (entity id), never array index for dynamic
  lists - index keys cause remount churn and state bugs.
- **Avoid inline allocation in hot render paths.** No `style={{...}}`,
  `onClick={() => ...}` recreated per row for thousands of rows when it can be
  hoisted or memoized.
- **Format on demand.** `toLocaleString`/date formatting is not free at scale -
  memoize formatters; format only visible rows.
- **Cap visible columns/data** like the SQL table does (`columns.slice(0, 8)`),
  with "show more" affordances rather than dumping everything.
- **Empty/loading/error states** are first-class - render skeletons, not blank
  layout shifts.

## 5. Icons (fast, no bloat)

- **Heroicons, per-icon named imports only** - this is tree-shaken:
  `import { BoltIcon } from "@heroicons/react/24/outline"`. This is already the
  convention; keep it.
- **Never build a dynamic "all icons" map/registry** or `import * as Icons` - it
  defeats tree-shaking and ships the whole set. Map your own string→component
  lookups explicitly with only the icons you use.
- **`currentColor` + Tailwind text color** for theming; don't hardcode icon
  fills. Set explicit `h-/w-` so icons never cause layout shift (CLS).
- **`aria-hidden="true"`** on decorative icons; label the interactive element,
  not the glyph.
- For **very large icon counts** in one view (e.g. a chain/token picker),
  prefer a single SVG **sprite** (`<use href="#id">`) or lazy-load the icon
  module, instead of dozens of React icon components mounting at once.
- Don't wrap every icon in `motion.*`; animate the container, not each SVG.

## 6. Re-render hygiene

- **Split components** so state changes re-render the smallest subtree. A giant
  component (e.g. a 3000-line query view) re-renders everything on every
  keystroke - extract the input, the results table, the chat thread, etc.
- **`React.memo`** leaf/presentational components that receive stable props.
  Pair with `useCallback`/`useMemo` for the props you pass them.
- **Colocate state** with where it's used; lift only when shared. Avoid putting
  fast-changing state (input text, scroll) high in the tree.
- **Context**: a context value that changes often re-renders all consumers.
  Split contexts by update frequency, or pass setters (stable) separately from
  values.
- **Don't pass new object/array literals** as props/deps unless memoized.
- Prefer **uncontrolled inputs** (or local state + debounce) for text fields in
  large forms; controlled + global state on every keystroke is a re-render tax.

## 7. Code-splitting & bundle size

- **`next/dynamic`** (with `ssr: false` when client-only) for heavy, below-the-
  fold, or rarely-used modules: **ReactFlow** (automation builder),
  **Recharts** (report charts), rich editors, anything pulling large deps.
- **framer-motion** is heavy - load it only where used; prefer CSS transitions
  for simple hovers/reveals (see the landing's CSS-driven reveals). Don't import
  `motion` into otherwise-static components.
- **Avoid barrel files that re-export everything** (`index.ts` exporting a whole
  feature) on hot paths - they can pull unrelated code into a chunk. Import from
  the specific module.
- **Watch import cost.** Before adding a dependency, check its size and whether a
  platform primitive (Intl, URL, fetch, CSS) already does the job.
- Run the **bundle analyzer** when adding/upgrading deps; keep route JS lean.

## 8. Images, fonts, media

- **`next/image`** for all raster images - automatic sizing, lazy-load,
  responsive `srcset`. Always set `width`/`height` (or `fill` + sized parent) to
  avoid CLS. Add remote hosts to `next.config.ts`.
- **`next/font`** (already used in `app/layout.tsx`) for self-hosted, swap-free
  fonts. Don't add `<link>` Google Fonts.
- **Canvas/animation backdrops** must cap DPR, scale work to viewport, and pause
  when offscreen/hidden or under `prefers-reduced-motion` (see the landing hero
  canvas as the reference implementation).

## 9. Forms, inputs, interactions

- **react-hook-form + zod** for forms - uncontrolled by default, minimal
  re-renders, schema validation. Use `useWatch` for targeted subscriptions
  instead of `watch()` re-rendering the whole form.
- **Debounce/throttle** expensive change handlers (search, live estimates,
  autosave). Cancel in-flight requests when inputs change (sequence ref or
  abort).
- Keep keypress handlers cheap; defer heavy work to `requestIdleCallback` or a
  memoized effect.

## 10. Perceived performance

- **Skeletons over spinners** for content regions; reserve layout to avoid CLS.
- **Optimistic UI** for mutations that usually succeed (status toggles,
  deletes), with rollback.
- **Stream/Suspense** so the shell is interactive before data lands.
- Show progress for long ops (enrichment status polling, MCP stream activity);
  always offer a Stop/cancel.

## 11. Pitfalls we've already hit (don't regress)

- **Refetch storms:** focus/reconnect refetch was hammering the API (429s). It's
  off globally - don't re-enable per-query without cause.
- **Unbounded agent calls:** MCP "ran forever" with no timeout. All
  long/streaming calls need timeout + abort + a Stop button.
- **Envelope shape:** responses are `{ success, data }`; unwrap once in the
  service. Map backend field names exactly (e.g. SQL columns are
  `{ key, label }`, not `name`).
- **Hardcoded theme colors:** don't bake `bg-[#…]` / `rgba(...)` darks into
  components - use Tailwind **semantic tokens** (`bg-card`, `bg-muted`,
  `border-border`, `text-foreground`) so light/dark both work.
- **Giant client components** re-rendering on every keystroke - split them.

## 12. Quality gates & tooling

- **TypeScript is the contract.** `next.config.ts` currently sets
  `typescript.ignoreBuildErrors: true` - that hides real breakage. Treat type
  errors as build failures: run `npx tsc --noEmit` and keep it green; the goal
  is to remove that flag.
- **Lint** (`eslint`) clean - unused imports/vars inflate bundles and signal
  dead code.
- **Measure:** React DevTools Profiler for re-renders; Lighthouse / Web Vitals
  (LCP, INP, CLS) for the route; `@next/bundle-analyzer` for chunk size.
- **Targets:** LCP < 2.5s, INP < 200ms, CLS < 0.1 on key dashboard routes.

## 13. PR / change checklist

- [ ] Is this component a Server Component? If `"use client"`, is the boundary as
      small as possible?
- [ ] Any list/table that can grow - is it paginated or virtualized?
- [ ] New data fetch - typed service method, correct query key, inherits caching
      defaults, parallel (not waterfall)?
- [ ] Long/async op - timeout + abort + cancel UI?
- [ ] Derived data memoized; callbacks stable; keys are entity ids?
- [ ] Icons: per-import, `currentColor`, fixed size, no dynamic icon registry?
- [ ] Heavy dep (chart/flow/editor/motion) dynamically imported?
- [ ] Colors use semantic tokens (light + dark both work)?
- [ ] Every new file in the right folder (Section 15) - no loose files at a
      feature root?
- [ ] New/changed backend types in `<feature>/contracts/`, not inline in the
      service?
- [ ] Test colocated with the file it covers; logic pure enough to test without
      rendering?
- [ ] New file under 400 lines; any over-budget file you touched left smaller,
      not larger?
- [ ] `tsc --noEmit` clean; lint clean; profiled if perf-sensitive?

## 14. Git & PR conventions

- **Do not** append the `🤖 Generated with Claude Code` trailer (or any
  tool-attribution footer) to PR descriptions or commit messages. Keep PR bodies
  and commits clean and descriptive.

## 15. File & folder layout (where things go)

The repo is **feature-first**: everything a feature owns lives under
`src/features/<feature>/`, and something moves to `src/shared` or `src/lib`
only once a **second** feature needs it. A file dropped at a feature root
"just for now" is how a 5,000-line component happens, so every file lands in a
folder with one purpose.

### 15.1 Canonical feature shape

```
src/features/<feature>/
  <family>.service.ts        # HTTP boundary: URLs, headers, envelope unwrap
  <family>.service.test.ts   # colocated, same name + .test
  contracts/                 # BACKEND CONTRACTS - types only, no runtime code
    <family>.ts              #   one file per API family in docs/backend.md
  components/                # one component per file
    <area>/                  #   folder per area once an area has 2+ files
  hooks/                     # use-*.ts, React only
  utils/                     # pure functions, no React, no network
  pages/                     # the feature's route-level compositions
  data/                      # static catalogs, fixtures, seed content
  types/                     # UI/domain types that are NOT wire contracts
```

Not every feature needs every folder - create one when it has a second file,
not before.

### 15.2 Backend contracts live in `contracts/`

Every request/response type that mirrors `docs/backend.md` belongs in
`<feature>/contracts/<family>.ts`, **not** inline in the service.

- **One file per API family**, named after the doc section it mirrors
  (`builder.ts`, `watches.ts`, `imports.ts`), so a reviewer can diff a contract
  against the docs without reading transport code. Services today carry 18-60
  exported types each, which is why nobody notices when one drifts.
- **Types only.** No axios, no functions, no constants that run. A contract file
  should be safe to import from anywhere, client or server.
- **Comment the field, not the type.** Note what the backend actually does
  (`"unavailable" means the READ failed, not that nothing is subscribed`), and
  cite the doc date when the contract changed.
- The service **imports and may re-export** them
  (`export type { BuilderGraph } from "./contracts/builder"`) so moving types
  never churns call sites.
- **Never `any` at the boundary**, and unwrap the `{ success, data }` envelope
  once, in the service (Section 1).

### 15.3 `utils/` inside a feature, `src/lib/` for the app

- `<feature>/utils/` - pure, testable helpers for that feature. **Do not add
  another `lib/` folder inside a feature**; `campaigns/lib` and
  `campaigns/utils` currently mean the same thing, and that ambiguity is the
  mess. Fold `lib/` into `utils/` when you next touch it.
- `src/lib/` - app-wide infrastructure only (api client, auth, dates, env).
  Feature logic never goes here.
- `src/shared/` - components, hooks, providers and types used by 2+ features.

### 15.4 Tests

- **Colocate**: `foo.ts` → `foo.test.ts`, right next to it. This is already the
  convention in ~40 files; keep it.
- `src/test/` is only for **setup, mocks, e2e and cross-feature smoke tests**.
  A unit test for one feature never lives there.
- **Extract logic so it can be tested without rendering.** Parsing, mapping,
  validation and formatting belong in `utils/` with a unit test; a test that has
  to mount a 3,000-line component to check a mapping is a design smell, not a
  testing problem. `automation/utils/builder-issues.ts` and
  `automation/utils/builder-graph.ts` are the reference: pure module, exhaustive
  unit test, component just renders the result.
- A bug fix lands **with the test that would have caught it**.

### 15.5 File size budget

- **New files: 400 lines soft, 500 hard.** Past that, split by responsibility -
  a config panel, a results table and a canvas are three files.
- **When you edit a file already over budget, extract the part you touched**
  rather than growing it. Leaving it larger than you found it is not acceptable
  in a file this size.
- Current offenders, in order, so nobody has to guess:
  `automation/components/flow-automation/create-automations.tsx` (~5.6k),
  `intelligence/components/query/index.tsx` (~3.6k),
  `campaigns/pages/form.tsx` (~2.5k),
  `audience/components/import-export.tsx` (~2.5k),
  `app/api/v1/[...path]/route.ts` (~2.4k).

### 15.6 Naming

- **Files and folders: kebab-case** (`builder-issues.ts`,
  `flow-automation/nodes/trigger-node.tsx`).
- **One exported component per file**, PascalCase, matching the filename
  (`trigger-node.tsx` → `TriggerNode`).
- Services `<family>.service.ts`, hooks `use-<thing>.ts`, contracts named after
  the API family.
- An `index.ts` may re-export the files **of its own folder** (e.g.
  `components/flow-automation/nodes/index.ts`). It must never re-export a whole
  feature - see Section 7 on barrels.

### 15.7 Deciding where a new file goes

1. Does it talk to the API? → `<feature>/<family>.service.ts`, with its types in
   `<feature>/contracts/`.
2. Is it a pure function? → `<feature>/utils/`, with a colocated test.
3. Does it render? → `<feature>/components/<area>/`.
4. Is it React state logic reused by 2+ components? → `<feature>/hooks/`.
5. Do 2+ features need it? → `src/shared/` (or `src/lib/` if it is
   infrastructure).
6. None of the above? It probably belongs in the feature that already owns the
   concept - not at the root.
