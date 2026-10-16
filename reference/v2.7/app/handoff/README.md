# Handoff: Onchain Suite Dashboard App

## Overview
Onchain Suite is communication infrastructure for Web3 — it connects live blockchain behaviour to personalized, automated communication ("Stripe for Web3 communication"). This handoff covers the **full dashboard product**: an 8-section application shell plus a first-run onboarding gate. Users index on-chain contracts, resolve wallets into reachable, ZK-verified contacts, then segment, message, and automate against on-chain + off-chain behaviour.

## About the Design Files
The files in this bundle are **design references authored in HTML/React (Babel-in-the-browser)** — high-fidelity prototypes that show the intended look, copy, states, and behaviour. **They are not production code to ship as-is.** There is no build system, router, data layer, or backend here: screens run on a global-namespace component bundle and hardcoded mock arrays.

Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries. If no environment exists yet, choose an appropriate modern stack (recommended: **Vite or Next.js + React + TypeScript**, CSS variables or Tailwind mapped to the tokens below, a router, and a data-fetching layer). The `.jsx` files are an accurate component/prop **spec** — mirror their structure and copy, but wire real routing, forms/validation, and API calls.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, radii, motion, copy, empty/full states, and interactions are all resolved. Recreate the UI pixel-faithfully using the design tokens in `styles.css` / `tokens/*`. All values are real CSS custom properties and transfer directly.

## Architecture at a glance
- **Shell:** `DashboardApp.jsx` owns top-level state and renders `OnboardingScreen` (phase `onboarding`) or the app (`AppShell` + active screen). `AppShell.jsx` = sidebar + top bar (breadcrumbs, env indicator, search/command palette, notifications, user, theme toggle).
- **8 nav sections:** Dashboard (Home), Campaigns, Audience, Forms, Automations, Intelligence, Analytics, Settings.
- **Theme:** `data-theme="dark"` on the root toggles dark mode; persisted in `localStorage` (`os-dash-theme`).
- **Empty vs Full state:** every data screen accepts a `filled` boolean. A bottom-right toggle in the prototype flips it — in production this is simply "has data yet or not".
- **Cross-screen loops (must preserve):**
  - Audience → "Create campaign" seeds and navigates to the Campaign wizard with the segment/list preselected (`onCreateCampaign(seed)` → `campaignSeed`).
  - Home Ask bar → Intelligence chat with the question seeded (`onAsk(q)` → `askSeed` → `seedQuestion`).
  - Intelligence "Create campaign" → Campaign wizard preselected.
  - Forms → automation enrolment: a form can enrol submitters into a named automation, and "Form submitted" / "Joined a list" are automation triggers.
  - Segments (Intelligence, dynamic rules) → shared source of truth consumed by the Campaign wizard audience selector (`segments.js`).

## Screens / Views

### 1. Onboarding (first-run gate) — `OnboardingScreen.jsx`
- **Purpose:** three-step setup before the app unlocks.
- **Layout:** centered card (~560px), logo top, `Stepper` down the left, active step's form on the right, progress %.
- **Steps:**
  1. **Add a contract to index** — contract *name* input; contract *address* input; **contract type** select (ERC-20 token / ERC-721 NFT / ERC-1155 multi-token / Staking–deposit vault / Custom contract); **chain** select; **activity-to-track** chips (Mint, Purchase, Deposit, Withdrawal, Transfer, Stake, Unstake) — because a contract is not always a plain token/NFT. Primary: "Add contract".
  2. **Enrich wallet data** — a 3-node mini-flow (Discover holders → Pull metrics → Ready to segment) and an info callout: **the free plan enriches the first 5 wallets** so the user sees it end-to-end; upgrade to enrich every holder. Primary: "Enrich 5 wallets free"; secondary "Skip for now".
  3. **Verify sender domain** — sending-domain input; 3-node flow (Add DNS records → We check → Verified); a DNS table (TXT DKIM + TXT SPF rows with copy affordance). Primary: "Verify domain"; secondary "I'll do this later".
- Completing or skipping all three sets `filled=true` and enters the app.

### 2. Home / Dashboard — `HomeScreen.jsx`
- **Purpose:** at-a-glance overview + natural-language Ask bar.
- Empty state = onboarding checklist path; full state = KPI cards, recent activity, and a live **Ask** bar that routes to Intelligence.

### 3. Campaigns — `CampaignsScreen.jsx` + `CampaignWizard.jsx` + `TemplateEditor.jsx`
- **Purpose:** list campaigns; create via a 3-step wizard (Audience → Message → Review).
- **Audience step — "Send to":** four modes — **Segments · Lists · Contacts · Everyone**. Segments and Lists are **searchable, scrollable checklists** with a live selected-count and Clear (built to scale to dozens). Reachability warning when channel coverage is thin. Overlapping wallets messaged once.
- **Message step:** email opens the real block editor (`TemplateEditor`); in-app push has a title/message/deep-link builder with live device preview.
- **Review step:** exact send summary (audience, channel, reach after dedupe).

### 4. Audience — `AudienceScreen.jsx`
- **Purpose:** the contact database. **Four tabs: Contacts · Lists · Tags · Suppressed** (tab counts are live).
- **Contacts:** wallet-first table; ZK-verified identity shown as badges; row → contact drawer.
- **Lists:** table (List, Source, Type Growing/Static, Reachable-via, Contacts, Updated). **"New list"** opens a real create modal (name + type). Lists are built from form sign-ups and imports.
- **Tags:** table with its own search + **"New tag"** create modal (name + rule: Manual or Auto rules). 
- **Suppressed:** unsubscribed/bounced wallets; **"Reinstate"** removes the row live and updates the count.

### 5. Forms — `FormsScreen.jsx`
- **Purpose:** capture forms that turn visitors into ZK-verified contacts.
- List → 3-stage builder (Style · Template · Content). Placement-aware preview: Inline / Pop-up / Hello bar / Slide-in / Hosted.
- **"Where contacts land":** a select choosing **which list** submitters join (+ create new list), plus auto-tag.
- Display rules (trigger, frequency cap, targeting), double opt-in, post-submit actions (message / redirect / eligibility reveal via ZK), and **"Enrol into automation"** (a select of which automation — real state, reflected in the summary).
- Submissions funnel view.

### 6. Automations — `AutomationsScreen.jsx`
- **Purpose:** visual flow builder + monitor.
- **Triggers:** a flow can start from **1–3 triggers combined with OR** ("a wallet enters when any of these fire"); add/remove on canvas. Triggers are grouped **On-chain** (on-chain event, holder acquired, swap completed…) and **Off-chain** (Form submitted, **Joined a list**, Segment entered…).
- **Steps:** Send email (opens the full email builder), Send in-app push (opens a push builder mirroring Campaigns), Wait, Add tag, **Add to list**, Branch (If yes / If no paths).
- Pause-to-edit locking; monitor view with per-step performance stats.

### 7. Intelligence — `IntelligenceScreen.jsx`
- **Purpose:** chat-first SQL explorer over on-chain data; save results as dynamic **segments**; reports. "Create campaign" hands a segment to the Campaign wizard.

### 8. Analytics — `AnalyticsScreen.jsx`
- **Purpose:** balanced on-chain/off-chain KPIs, trends, channel performance. **No revenue metrics** — conversions are the outcome metric. Empty metric renders "—", never 0.

### 9. Settings — `SettingsScreen.jsx`
- Flat side-nav. Includes a **Privacy & Identity** section that governs the ZK-identity system: zero-knowledge identity (how wallets link to email/socials, verified-link count, proof method), data & retention (GDPR: encrypted off-chain link storage, wallet-as-PII, right to erasure via unsubscribe), and consent (opt-in + which channels a wallet agreed to). This is the compliance home for wallet↔identity links that let you message a wallet without seeing who's behind it.

## Interactions & Behavior
- **Navigation:** sidebar switches `page`; breadcrumbs reflect it; command palette (top-bar search) jumps to campaigns/segments/lists/contacts.
- **Seed-and-navigate loops:** see "Cross-screen loops" above — preserve them; they're core to the product story.
- **Modals/drawers:** create-list, create-tag, contact detail. Overlays get shadow (elevation-2/3/4); resting surfaces use 1px borders and no shadow.
- **Motion:** durations 100/180/280/400ms, `cubic-bezier(0.2,0,0,1)`; hover/press = tint only, no scale on product controls; charts animate once on mount, never on refresh; everything collapses under `prefers-reduced-motion`.
- **Validation/errors:** specific and instructive ("Wallet address must be 42 characters starting with 0x"), never "Invalid input", always a recovery path.

## State Management
- **Shell:** `page`, `phase` (onboarding|app), `filled`, `theme`, `campaignSeed`, `askSeed`.
- **Audience:** `tab`, `lists`, `tags`, `suppressed`, create-modal draft (`draftName`, type/rule) — lists/tags creation prepends live; reinstate filters suppressed.
- **Campaign wizard:** `step`, `audMode`, `segs`+`segQ`, `lists`+`listQ`, `picked` contacts, channel (`push`), message state.
- **Automations:** `triggers[]` (1–3), `steps[]` (incl. branch paths), `sel`, `active`(locked), builder/monitor `view`.
- **Forms:** `toList`, `enrol`, `enrolAuto`, field list, placement, style.
- **Data:** every hardcoded array (segments in `segments.js`, lists, contacts, tags, KPIs) becomes an API call. ZK identity / enrichment / on-chain indexing are represented in the UI only — no chain integration exists yet.

## Design Tokens
All defined as CSS custom properties in `styles.css` → `tokens/*.css` (colors, typography, spacing, effects, fonts, base). Use those files verbatim. Key values:
- **Colors (60/30/10):** neutral surfaces = 60; blue = 30; orange = 10. `blue.600 #1727E0` interactive (buttons, active nav, primary emphasis); `sky.500 #2F94FF` data/info accent (never body text on white — fails AA); `navy.950 #010F31` brand ink & gradient anchor; `orange.500 #FF6828` accent, ≤10% of any view (focus rings, progress bars, link hover, small underlines, one standout number). Red = failure ≠ orange = attention. Light page bg `neutral.25 #FBFBFC`; neutrals are near-neutral slate (barely cool). Dark mode via `data-theme="dark"`.
- **Type:** Instrument Sans everywhere; **Geist Mono** for addresses/IDs/code. Closed scale 69→12px. Negative tracking only ≥32px. Tabular figures in tables/KPIs. Sentence case everywhere (only 12px `label-s` table headers/badges may be uppercase).
- **Spacing:** 4px base, 8px rhythm. 4/8 inside components, 12/16 related, 24/32 between components, 48–128 between sections. Dashboard card gap uniformly 16px.
- **Radius:** sm 2 (tags/badges) · md 4 (buttons/inputs) · lg 6 (cards/modals) · xl 10 (marketing media only) · round for circles only. **No pills.**
- **Depth:** tonal before dimensional — 1px borders at rest, no shadow; Oxford-blue-tinted shadows only on floating elements (elevation-2 dropdowns, -3 modals, -4 command palette).
- **Motion:** see above.

## Assets
- Logos in `assets/logos/` (horizontal lockups + icon marks; light/dark; coloured/mono). Use the codebase's own brand system if it already has one.
- Icons: **Lucide** (`lucide@0.454.0`). No emoji anywhere.
- Fonts: Instrument Sans + Geist Mono (loaded in `tokens/fonts.css`).

## Files (in this bundle)
- `tokens_and_styles/` — `styles.css` + `tokens/*.css` (the design tokens; source of truth for all values).
- `dashboard/` — all screen sources: `DashboardApp.jsx`, `AppShell.jsx`, `HomeScreen.jsx`, `CampaignsScreen.jsx`, `CampaignWizard.jsx`, `TemplateEditor.jsx`, `AudienceScreen.jsx`, `FormsScreen.jsx`, `AutomationsScreen.jsx`, `IntelligenceScreen.jsx`, `AnalyticsScreen.jsx`, `SettingsScreen.jsx`, `OnboardingScreen.jsx`, `AuthScreen.jsx`, `segments.js`, `index.html` (runnable reference).
- `components/` — the 55 shared UI components (`.jsx`) the screens import, grouped by folder. Read these for exact component contracts (props, states).
- `PROJECT_README.md` — the design system's own README: brand personality, content fundamentals, visual foundations.

To see the designs running, open `dashboard/index.html` (it loads the compiled bundle) in a browser.
