# Onchain Suite Design System

**v2 · Foundation Release**

Onchain Suite is the communication infrastructure for Web3: it connects live blockchain behaviour to personalized, automated communication. The positioning is "Stripe for Web3 communication" — as Stripe abstracted payments and Twilio abstracted messaging, Onchain Suite abstracts the relationship between a wallet and a message. Products: the **dashboard app** (segments, campaigns, automations, analytics over on-chain behaviour) and the **marketing website**, plus three "3"-named sub-products — **Onch3n**, **R3tain**, **3ridge** (the "3"-for-E substitution is a naming device for official sub-products only, never a typographic style in running text).

## Sources

- `uploads/Onchain-Suite-Design-System.md` — internal design-system specification v1.0 (tokens, colour ramps, type scale, component contracts, motion, governance). Primary source of truth for every value in this project.
- `uploads/Brand Guideline Sheet - Onchain Suite.pdf` — visual identity sheet (logo construction, colours, gradients, type hierarchy, brand motif derivation).
- `uploads/*.svg` — official logo files (horizontal lockups + icon marks, light/dark, coloured/mono). Copied to `assets/logos/`.

No Figma or codebase was provided; UI kits here are built from the written spec, not screen recreations.

## Brand personality

Precise · Quiet · Fluent · Trustworthy · Intelligent. The mark is two counterposed arcs locking into a continuous S-form — a *loop*: signal out, signal back. Guiding metaphor: **marketing shows the sky; product shows the instruments; both are built from the same metal.**

## CONTENT FUNDAMENTALS

- **Sentence case everywhere** — headings, buttons, labels. The single exception: `label-s` (12px) table headers and badges may be uppercase.
- **Buttons are verbs**: "Create segment", "Add to segment", "Test trigger" — never "OK", "Submit", "Yes".
- **Voice**: confident infrastructure prose. Declarative, specific, no hype. Third person for the system, second person ("you", "your users") for the reader. Never first-person "I".
- **Error copy is specific and instructive**: "Wallet address must be 42 characters starting with 0x" — never "Invalid input". Never blame the user; never dead-end (always a retry/recovery path + reference ID).
- **No emoji.** Anywhere. Lucide icons carry all glyph duty.
- **Numbers/data**: wallet addresses always middle-truncated `0x1A2b…9F3e` (6+4) in Geist Mono with a copy affordance; timestamps UTC-labelled; empty metric = "—" + "No data for this period", never 0.
- **Naming grammar**: sub-products substitute 3 for E (Onch3n, R3tain, 3ridge) — official names only.
- **Headline style**: marketing headlines ≤8 words, e.g. hero patterns like "Know your users. On-chain." Insight stated typographically above its evidence (chart cards lead with a finding sentence).

## VISUAL FOUNDATIONS

- **Colour & the 60/30/10 rule**: neutral surfaces are the 60, blue is the 30, orange is the 10. Each hue has ONE job — `blue.600 #1727E0` = interactive (buttons, active nav, primary emphasis); `sky.500 #2F94FF` = informational/data accents (never body text on white — fails AA); `navy.950 #010F31` = brand ink & the marketing gradient anchor; `orange.500 #FF6828` = the accent (see below), max ~10% of any view. Neutrals are **near-neutral slate** — only a whisper of cool, never overtly blue (deliberately desaturated from v1's blue-tinted greys). Red ≠ orange: Red = failure, orange = attention. Light page background is near-white (`neutral.25 #FBFBFC`); large Alice-Blue fills are retired in favour of `--surface-tint` (neutral.50).
- **Orange accent placements (the 10)**: keep orange scarce and functional — form-input focus rings (active field), progress/loading bars, link hover, small accent underlines under section headers, and highlights on key information (alert/badge emphasis, a single standout number). Never as a large fill, never more than one attention point per view.
- **Gradients**: exactly four tokens, always at the brand's 30° tilt (`linear-gradient(120deg, …)`): depth, dawn, core, ember. Marketing only — never in product UI chrome. Text over gradients only at verified stops.
- **Type**: Instrument Sans for everything; **Geist Mono** for code/addresses/IDs. Closed scale 69→12 (see `tokens/typography.css`). Tracking −1px only at display sizes (≥32px gets negative tracking, smaller never). Tabular figures mandatory in tables/KPIs.
- **Spacing**: strict 4px base, 8px baseline rhythm. 4/8 inside components, 12/16 between related elements, 24/32 between components, 48–128 between sections. Dashboard card gap is uniformly 16px.
- **Radius (restrained, minimal)**: `sm 2` (tags, badges) · `md 4` (buttons, inputs — the workhorse) · `lg 6` (cards, modals) · `xl 10` (marketing media only) · `round` for circles ONLY (avatars, identicons, status dots, switch track). **No pills** — badges, chips, and env indicators use `sm`, never full-round.
- **Depth is tonal before dimensional**: resting surfaces use 1px borders, NO shadows. Shadows (restrained Oxford-blue tint) only on floating elements: dropdowns (elevation-2), modals (elevation-3), command palette (elevation-4).
- **Backgrounds**: solid tokens, the four gradients (marketing), `--surface-tint` neutral bands, or the motif at ≤8% opacity. No dot-grid field, no waves, no diagonal cuts, no decorative dividers — separators are 1px neutral.200 rules.
- **Motion**: signal through a wire — fast, decisive, damped, never bouncy. Durations 100/180/280/400ms (700ms marketing-only), `cubic-bezier(0.2,0,0,1)` standard. Hover/press = tint only, no scale on product controls. Charts animate once on mount, never on refresh. All motion collapses under reduced-motion.
- **Hover states**: 6% tint overlay. Pressed: 10% tint. Disabled: 45% opacity. Focus: 2px **orange** border + soft orange halo, universal (the active-field accent).
- **Cards**: surface, 1px border, radius 6px, 24px padding, no resting shadow; interactive cards gain elevation-1 + stronger border on hover.
- **Dark mode**: **neutral graphite base, NOT blue** — page `#101215` → surface `#17191D` → raised `#1E2125`, neutral borders. Blue stays an accent (interactive `blue.400`), never the background. This is the deliberate departure from a navy dark theme. Default for monitoring/ops views.
- **Imagery**: real product screenshots (radius-xl frame, elevation-3, 1px border) — never illustration of fake UI. Decorative set is closed: motif, gradient fields, 1px rules. Nothing else.
- **Emphasis budget per view**: one primary action, one orange signal, one display-weight text element.

## ICONOGRAPHY

- **Lucide is the sole icon set** — loaded from CDN (`https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js`); the `Icon` component (`components/icons/`) renders any glyph from `window.lucide`. No other sets, no hand-drawn SVGs, no emoji, no unicode-as-icon.
- Sizes locked to **16 / 20 / 24**. Stroke 1.5px at 20/24, 2px at 16.
- Icons inherit text colour (`--text-secondary` default). Never blue.600 decoratively — blue implies clickable. Status conveyed by shape + colour, never colour alone.
- Canonical concept→glyph mapping (normative, one concept one icon): wallet `wallet` · segment `users` · campaign `megaphone` · automation `workflow` · trigger `zap` · event `activity` · identity `fingerprint` · analytics `chart-line` · send `send` · notification `bell` · chain `network` · transaction `arrow-left-right` · health `heart-pulse` · filter `sliders-horizontal` · settings `settings-2` · search `search` · copy `copy` · external link `arrow-up-right` · API keys `key-round` · docs `book-open` · success `check-circle-2` · error `x-circle` · warning `alert-triangle` · info `info`.
- Empty states: one 24px icon in a 48px neutral.100 circle — never oversized icon illustrations.
- **Logos** (`assets/logos/`): `full-horizontal-*` lockups for wide contexts (nav, docs headers); `icon-*` mark for favicons/avatars/sidebar. The suffix names the **logo tone**: `*-light` = light/white artwork for **dark** surfaces; `*-dark` = navy artwork for **light** surfaces. "Coloured" variants carry the brand gradient in the mark (wordmark tuned to the surface). Minimums: mark 16px, horizontal 24px height. Never recolour, rotate, outline, stretch, or gradient-fill the wordmark.

## Index

- `styles.css` — global entry; imports everything under `tokens/`.
- `tokens/` — `colors.css` (ramps + semantic + dark theme), `typography.css`, `spacing.css`, `effects.css` (radius/elevation/motion/z), `fonts.css`, `base.css`.
- `assets/logos/` — 8 official logo SVGs.
- `guidelines/` — foundation specimen cards (Design System tab), including the **Colour usage** set (`usage-surfaces`, `usage-text`, `usage-buttons`, `usage-accent`, `usage-status`) that annotates light-vs-dark rules for every semantic role.
- `components/` — reusable primitives, grouped: `icons/`, `actions/`, `forms/`, `feedback/`, `navigation/`, `overlays/`, `data/`, `product/`.

### Components

- **icons/** — `Icon` (Lucide wrapper, locked sizes/strokes)
- **actions/** — `Button`, `IconButton`, `Link`
- **forms/** — `Input`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`
- **feedback/** — `Badge`, `Tag`, `Chip`, `Alert`, `Toast`, `Skeleton`, `Progress`, `EmptyState`, `Tooltip`
- **navigation/** — `Tabs`, `Breadcrumbs`, `Pagination`, `Sidebar`, `TopBar`
- **overlays/** — `Modal`, `Drawer`, `Menu`
- **data/** — `Card`, `KPICard`, `Table`, `Chart`, `ChartLegend`, `Avatar`, `Identicon`, `Timeline`, `Stepper`, `Accordion`
- **product/** — `AddressChip` (+ `truncateAddress`), `WalletIdentityCard`, `WalletHealthIndicator`, `EventCard`, `TriggerCard`, `NotificationPipeline`, `CampaignFunnel`
- **ui_kits (full screens, also exported)** — `DashboardApp` (8-section app shell), `AudienceScreen`, `CampaignsScreen`, `CampaignWizard`, `FormsScreen`, `AutomationsScreen`, `IntelligenceScreen`, `AnalyticsScreen`, `SettingsScreen`, `OnboardingScreen`, `MarketingSite`
- `ui_kits/dashboard/` — full app shell: Home, Campaigns, Audience (Contacts · Lists · Tags · Suppressed), Forms, Automations (multi-trigger), Intelligence, Analytics, Settings, plus the 3-step onboarding gate.
- `ui_kits/marketing/` — marketing site recreation (hero, features, pricing, CTA).
- `SKILL.md` — agent skill entry point.

## Intentional additions

- `Icon` wrapper component — required to consume Lucide uniformly at locked sizes/strokes.

## Caveats

- **Fonts load from Google Fonts** — Instrument Sans (brand voice) + Geist Mono (code/addresses). Both are the intended faces, not substitutes; JetBrains Mono was swapped out for Geist Mono per brand direction. No self-hostable binaries ship in the repo — supply licensed WOFF2 files to replace the `tokens/fonts.css` @import with @font-face.
- Spec sections not (yet) built as components: Combobox, Date/Time Picker, Tree, Command Palette, Automation Canvas, Segment Builder, Identity Resolution Panel — ask to extend.
- The uploaded logo SVGs shipped without working fill rules (CorelDRAW export left `.fil0/.fil1` classes undefined → everything rendered black). The copies in `assets/logos/` are repaired by writing explicit `fill` attributes: `*-light` = white artwork (for dark surfaces), `*-dark` = navy `#010F31` (for light surfaces), coloured marks keep the gradient. Geometry untouched. Verify against the original brand intent.
