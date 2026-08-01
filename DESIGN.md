# OnchainSuite — Design System (v2)

The single source of truth for how the **product (dashboard/app)** looks and feels. The reference
implementation is live at **https://onchainsuite.aborodeolusegun.workers.dev/** — when a value here
and the running app disagree, the reference wins, and this doc is what we migrate the app toward.

The aesthetic is **paper + electric blue**: a near-white canvas (graphite in dark), white/graphite
surfaces, **electric-blue** as the single brand action color, **orange** reserved for focus and
links-on-hover, navy ink, soft navy-tinted elevation, and **Instrument Sans / Geist Mono** type. It
is a calm, data-dense product system — not a marketing showpiece.

> Scope note: this is the **app** design system. The marketing landing runs a separate `.ocs2`
> implementation of the same brand (`features/website/.../ landing/v2/landing-v2.css`) and is
> intentionally left on its own styling. Older revisions of this file described a terminal/cyan
> `.os-landing` system — that was **removed**; ignore any memory of it.

---

## 1. Principles

1. **Light-first, dark by token.** Every color is a semantic token that resolves per theme. Never
   hardcode a hex in a component — reference a token so `[data-theme="dark"]` flips it for free.
2. **One accent, used sparingly.** Electric blue (`--action-primary`) is for the primary action and
   selected state, nothing else. Orange is focus/attention only. Color is a signal, not decoration.
3. **Numbers are typographic.** Metrics, addresses, hashes, code, timestamps → **Geist Mono** via
   the numeric/code type tokens. Prose → Instrument Sans.
4. **Structure from hairlines, depth from soft shadow.** 1px token borders define layout; elevation
   is a subtle navy-tinted shadow, not heavy blur.
5. **Small, consistent radii.** 4px is the default (`--radius-md`); 6px for cards/chips; full-round
   only for pills, dots, and avatars.
6. **Motion is quick and standard.** ~180ms on the standard easing. No scroll-hijacking or marquees
   inside the app.

---

## 2. Color — primitive ramps

Raw palettes. Components should almost never use these directly; they exist so the **semantic**
tokens in §3 can be built from them.

| Ramp               | 25 / 50 → 500 (key) → 900/950                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **neutral**        | `25 #FBFBFC` `50 #F5F6F7` `100 #ECEDEF` `200 #DEE0E3` `300 #C4C7CC` `400 #9DA1A8` `500 #767B83` `600 #585D65` `700 #42464D` `800 #2C3035` `900 #1C1F23` `950 #121417` (`0 #FFFFFF`) |
| **blue** (brand)   | `25 #F0F4FF` `50 #E4EAFF` `100 #C9D5FF` `200 #A3B4FF` `300 #7A8EFB` `400 #5468F2` `500 #3344EA` **`600 #1727E0`** `700 #121FB4` `800 #0E188A` `900 #0A1160` `950 #060A3D`           |
| **sky**            | `50 #EBF5FF` `100 #D6EBFF` `300 #7FBEFF` **`500 #2F94FF`** `700 #155AA8` `900 #0A2C54`                                                                                              |
| **navy** (ink)     | `600 #1B2B52` `700 #131F42` `800 #0C1735` `900 #061029` **`950 #010F31`**                                                                                                           |
| **orange** (focus) | `50 #FFF3ED` `100 #FFE4D6` `300 #FFA275` `400 #FF8449` **`500 #FF6828`** `700 #B53C0B` `900 #5F1F06`                                                                                |
| **green**          | `50 #E9F7F0` `100 #CBEDDD` **`500 #17A66B`** `600 #128355` `700 #0E6743`                                                                                                            |
| **red**            | `50 #FDECEC` `100 #FAD4D5` **`500 #E5484D`** `600 #C13539` `700 #9B2A2E`                                                                                                            |
| **yellow**         | `50 #FDF6E7` `100 #FAEAC4` **`500 #E8A317`** `600 #BE8410` `700 #94660C`                                                                                                            |

Plus `--alice #F0F7FF` (brand wash for gradients/marketing accents).

---

## 3. Color — semantic tokens (use these)

Values shown **light → dark**. This is the contract the whole app is built on.

### Surfaces & backgrounds

| Token                                 | Light                  | Dark                | Use                               |
| ------------------------------------- | ---------------------- | ------------------- | --------------------------------- |
| `--bg-page`                           | `neutral-25` `#FBFBFC` | `#101215`           | App canvas                        |
| `--bg-surface` / `--bg-raised`        | `neutral-0` `#FFFFFF`  | `#17191D`           | Cards, panels, popovers           |
| `--bg-sunken`                         | `neutral-50`           | `#0B0D0F`           | Wells, inset areas                |
| `--surface-hover`                     | `neutral-50`           | `#23262B`           | Row/item hover                    |
| `--surface-subtle` / `--surface-tint` | `neutral-100`/`50`     | `#262A2F`/`#1A1D21` | Zebra, subtle fills               |
| `--bg-brand`                          | `blue-600`             | (same)              | Solid brand fill (primary button) |
| `--bg-brand-subtle`                   | `blue-25`              | `#1B2130`           | Tinted brand background           |
| `--bg-selected`                       | `blue-25`              | `#1C2333`           | Selected chip/row/nav item        |
| `--bg-overlay`                        | `rgba(18,20,23,.5)`    | `rgba(0,0,0,.6)`    | Modal scrim                       |

### Text

| Token                                | Light                | Dark                | Use                    |
| ------------------------------------ | -------------------- | ------------------- | ---------------------- |
| `--text-primary`                     | `navy-950` `#010F31` | `#F4F5F6`           | Headings, key values   |
| `--text-secondary`                   | `neutral-600`        | `neutral-300`       | Body                   |
| `--text-tertiary`                    | `neutral-500`        | `neutral-400`       | Labels, captions, meta |
| `--text-disabled`                    | `neutral-400`        | `neutral-600`       | Disabled               |
| `--text-inverse` / `--text-on-brand` | `#FFFFFF`            | `#101215` (inverse) | On brand/solid fills   |
| `--text-link`                        | `blue-600`           | `sky-400`           | Links                  |
| `--text-link-hover`                  | `orange-600`         | `orange-400`        | Link hover             |

### Borders

`--border-subtle` (neutral-100 / `#212429`) · `--border-default` (neutral-200 / `#2B2F35`) ·
`--border-strong` (neutral-400 / `#3B4046`) · **`--border-focus`** (orange-500 / orange-400).
Widths: `--border-width-default 1px`, `--border-width-strong 2px`.

### Actions

`--action-primary` blue-600 → **blue-400** (dark), hover blue-700→blue-300, active
blue-800→blue-200. `--action-destructive` red-500, hover red-600.

### Status (bg / border / text triads)

`success` green · `info` sky · `warning` orange · `error` red. Each has `--status-{name}-bg`,
`--status-{name}-border`, `--status-{name}-text` (dark uses translucent bg + a lightened text, e.g.
success text `#4ADE9C`).

### Focus & tints

`--focus-ring rgba(255,104,40,.28)` (orange, dark `.3`) — **focus is orange, not blue.**
`--tint-hover rgba(18,20,23,.06)` / dark `rgba(255,255,255,.07)`; `--tint-pressed` `.1` / `.12`.

### Data-viz series

`--data-1..8`: sky-500, blue-700, orange-400, `#17A66B`, `#8B7CF6`, `#E8A317`, sky-800, neutral-400.
`--chart-axis` neutral-500, `--chart-grid` neutral-200 / `#2B2F35`.

---

## 4. Typography

- **Sans:** `--font-sans` = **"Instrument Sans"** (already registered in `app/layout.tsx`). Body,
  headings, UI.
- **Mono:** `--font-mono` = **"Geist Mono"** — data, metrics, addresses, code. Registered via
  `next/font/google` as `--font-geist-mono`; it replaces JetBrains Mono for the app (JetBrains stays
  registered for the `.os-404` terminal page only).

Every text style is a token trio (size / line / weight, some with tracking):

| Role            | Token prefix         | Size / line / weight (tracking)        | Use                         |
| --------------- | -------------------- | -------------------------------------- | --------------------------- |
| Display XL      | `--text-display-xl`  | `clamp(40,5.5vw,69)` / 74 / 700 (-1px) | Marketing hero only         |
| Display L/M     | `--text-display-l/m` | 56/62/700 · 48/54/600 (-1px)           | Big splash numbers          |
| Heading XL      | `--text-heading-xl`  | 32 / 40 / 600 (-.5px)                  | Page title                  |
| Heading L       | `--text-heading-l`   | 24 / 32 / 600 (-.25px)                 | Section title               |
| Heading M       | `--text-heading-m`   | 20 / 28 / 600                          | Card title                  |
| Heading S       | `--text-heading-s`   | 16 / 24 / 600                          | Sub-card / dense title      |
| Body L/M/S      | `--text-body-l/m/s`  | 18/28 · 16/24 · 14/20                  | Prose (M default, S dense)  |
| Label M/S       | `--text-label-m/s`   | 14/20/500 · 12/16/500 (.2px)           | Buttons, form labels, tabs  |
| **Numeric L/M** | `--text-numeric-l/m` | **28/32/600 · 20/24/600** (mono)       | **Stat values, metrics**    |
| Code M/S        | `--text-code-m/s`    | 14/22 · 12/18 (mono)                   | Addresses, hashes, snippets |
| Caption         | `--text-caption`     | 12 / 16                                | Meta, timestamps            |

**Rule of thumb:** number/address/status/label/button → mono or label token; sentence → body;
page/section/card title → heading. Stat tiles use `--text-numeric-*` in Geist Mono.

---

## 5. Spacing, radius, elevation

- **Spacing scale** (`--space-*`, 4px base):
  `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64 20=80 24=96 32=128`. Semantic:
  `--space-card-padding 24`, `--space-field-gap 8`, `--space-section-app 32`.
- **Radius:** `--radius-sm 2` · `--radius-md 4` (default: inputs, buttons) · `--radius-lg 6` (cards,
  chips) · `--radius-xl 10` · `--radius-round 9999`.
- **Elevation** (navy-tinted): `--elevation-0 none` · `1 0 1px 2px rgba(1,15,49,.07)` ·
  `2 0 2px 8px /.1` · `3 0 8px 24px /.14` · `4 0 16px 48px /.18`. Cards sit at 0–1; popovers/menus
  at 2–3; modals at 4.
- **Effects:** `--blur-glass 16px`, `--blur-overlay 8px`. Gradients: `--gradient-core` (sky→blue),
  `--gradient-dawn`, `--gradient-depth`, `--gradient-ember` — brand flourishes, use sparingly.

---

## 6. Motion

- **Durations:** `--duration-instant 0` · `fast .1s` · `base .18s` (default UI) · `slow .28s` ·
  `deliberate .4s` · `expressive .7s`.
- **Easings:** `--ease-standard cubic-bezier(.2,0,0,1)` (default) · `--ease-emphasized` (enter) ·
  `--ease-exit`.
- Keep app motion to reveal-on-mount, hover tints, chevron rotation, skeleton shimmer, and the
  tab/nav active-pill slide. Respect `prefers-reduced-motion`.

---

## 7. Component patterns (as built in the reference)

- **Primary button:** `--bg-brand` fill, `--text-on-brand`, `--radius-md`, height 40px, padding
  `0 16px`, label-M (14/500). Hover → `--action-primary-hover`.
- **Secondary/ghost button:** transparent or `--bg-surface`, `--border-default`, `--text-primary`;
  hover `--surface-hover`.
- **Input / select:** height 40px, `--radius-md`, `1px --border-default`, `--bg-surface`, body-S
  (14px), padding `0 12px`; focus → `--border-focus` + `--focus-ring`. Mono inputs (addresses) use
  `--font-mono`.
- **Chip / toggle (selectable):** `--radius-lg`, padding `6px 12px`, 13px/500. Selected =
  `--bg-selected` fill + `1px --action-primary` border + `--action-primary` text; idle =
  `--bg-surface` + `--border-default` + `--text-secondary`. (This is exactly our channel toggle /
  activity chips.)
- **Card:** `--bg-surface`, `1px --border-subtle`/`default`, `--radius-lg`, `--space-card-padding`,
  `--elevation-0/1`.
- **Step / index badge:** 28×28, `--radius-md`, `2px --border-strong`, centered label-S.
- **Status pill:** `--status-{n}-bg` + `--status-{n}-text`, `--radius-round`.
- **Nav item (sidebar/tabs):** active = `--bg-selected`/`--surface-hover` + `--action-primary`
  icon + `--text-primary`; idle = `--text-tertiary`, hover `--surface-hover`.
- **Z-index:** `base 0` `raised 10` `sticky 100` `overlay 1000` `modal 1010` `popover 1020`
  `toast 1030` `tooltip 1040` `spotlight 1050`.

---

## 8. Theming

Light is the default on `:root`; dark is opted into with the **`.dark` class** on `<html>` — the
app's `ThemeProvider` runs next-themes with `attribute="class"`, so the override block in
`globals.css` is `.dark { … }`, not `[data-theme="dark"]`. Only the subset of semantic tokens in §3 is
overridden in dark — primitives stay fixed, so anything built on semantic tokens is automatically
theme-correct. Never branch on theme in components; branch in the tokens.

---

## 9. Applying this to the dashboard

`src/styles/globals.css` now carries the **full token set** above: the §2 primitive ramps, the §3
semantic tokens (with `.dark` overriding only the subset that changes), and the §4/§5/§6 type,
space, elevation and motion scales. The shadcn names (`--background`, `--card`, `--primary`,
`--border`, `--ring` = orange, …) are kept as **aliases resolving through those tokens**, so every
existing utility keeps working while new code reads from one vocabulary. What remains is migrating
component call sites off the aliases and off hardcoded hex.

Concrete mappings for what we've built:

- **Stat tiles** → `--bg-surface` card, value in `--text-numeric-l` (Geist Mono), label in
  `--text-tertiary` label-S, trend in `--status-success-text`, sparkline stroke
  `--data-2`/`--action-primary`.
- **Channel chips / toggles** → the selectable-chip pattern (§7): `--bg-selected` +
  `--action-primary` when on.
- **Settings sidebar** → nav-item pattern: active `--bg-selected`/`--surface-hover`
  - `--action-primary` icon.
- **Activity feed** → status dots from the data/status ramps; addresses + times in `--text-code-s` /
  `--font-mono`.
- **Focus states everywhere** → `--focus-ring` (orange), not blue.

Do **not** port marketing-only gradients/flourishes into dense app views.

---

## 10. Migration checklist (globals.css → v2 tokens)

- [x] Register **Geist Mono** in `app/layout.tsx`; expose as `--font-mono`. (Also fixed `--font-sans`,
      which pointed at a non-existent `"Instrument_Sans"` family instead of the next/font variable.
      All font variables now sit on `<html>` so `:root` can resolve them.)
- [x] Add the primitive ramps + semantic tokens (§2–3) to `:root` and `.dark`; keep the existing
      shadcn aliases pointing at them so current components don't break.
- [x] Add the type scale (§4) as utilities (`text-heading-xl`, `text-numeric-l`, `text-code-s`, …),
      plus `--color-*` utilities for the surface/status/data tokens and `shadow-elevation-*`.
- [ ] Move stat values / metrics onto `text-numeric-*` + `font-mono`.
- [ ] Standardize radii on `md`(4)/`lg`(6). **Deliberately deferred** — `--radius` stays at the
      app's current `0.625rem` so adopting the tokens caused no visual change. Flipping it is a
      design decision, not a migration step.
- [x] Elevation available as `--elevation-0..4` / `shadow-elevation-*`.
- [ ] Audit components for hardcoded hex/`bg-[#…]` and replace with tokens.
- [x] Keep the landing (`.ocs2`) untouched.

---

## 11. Files

- **Reference (source of truth):** https://onchainsuite.aborodeolusegun.workers.dev/
- `src/styles/globals.css` — app tokens (§2–3 ramps + semantic tokens, shadcn aliases mapped onto
  them, and the §4 type scale exposed as Tailwind utilities in `@theme inline`).
- `src/app/layout.tsx` — font registration (Instrument Sans + Geist Mono; the `.variable` classes
  live on `<html>` so `:root` can reference them).
- `src/shared/providers/theme-provider.tsx` — next-themes with `attribute="class"` → `.dark`.
- `src/shared/components/channel-chip.tsx`, `features/dashboard/components/*`,
  `features/settings/pages/settings-side-nav.tsx` — current v2-token consumers.

When in doubt, open the reference URL in both themes and match it.
