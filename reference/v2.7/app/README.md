# OnchainSuite — Product app

The product dashboard, rendered from the **authoritative design handoff**
(`~/Downloads/design_handoff_dashboard`). The app mounts the design system's resolved
`DashboardApp` — an 8-section application shell plus the first-run onboarding gate — straight
from the compiled bundle, so it is pixel-faithful to the handoff rather than an approximation.

## Run

```bash
python3 -m http.server 4174 --directory app
```

Open http://localhost:4174 (launch config `onchainsuite-app`). No build step — React 18 + the
design-system bundle + Lucide + Babel-standalone load in the browser.

## What renders

`app.jsx` mounts `window.OnchainSuiteDesignSystem_070d6e.DashboardApp` — the same component the
handoff's `dashboard/index.html` renders. The bundle in `ds/ds-bundle.js` is **byte-identical** to
the handoff's `_ds_bundle.js`.

- **Onboarding gate** — 3 steps: add a contract to index (name · address · type · chain · activity
  chips), enrich wallet data (free plan enriches first 5 wallets), verify sender domain (DKIM/SPF).
- **8 sections** — Dashboard, Campaigns, Audience (Contacts · Lists · Tags · Suppressed),
  Forms, Automations (multi-trigger flow builder), Intelligence (chat-first segment explorer),
  Analytics, Settings (incl. Privacy & Identity / ZK).
- **Empty ↔ Full state** toggle (bottom-right) — first-run vs live workspace.
- Cross-screen loops wired: Audience → Campaign wizard, Home Ask bar → Intelligence, etc.
- Light / dark (graphite) themes; persisted in `localStorage`.

## Files

- `index.html` — runtime loader (React → DS bundle → Lucide → Babel → `app.jsx`).
- `app.jsx` — mounts `DashboardApp`.
- `ds/` — design system: `ds-bundle.js`, `styles.css`, `tokens/` (verbatim from the handoff / DS).
- `assets/logos/` — brand marks.
- `handoff/` — reference copy of the handoff: `README.md`, `PROJECT_README.md`, the screen sources
  (`dashboard-src/`), and the 55 component contracts (`components/`). Read these to recreate the
  screens in a production codebase (Vite/Next + React + TS) — the handoff is a spec, not ship code.
- `app-custom-v1.jsx.bak` — an earlier hand-built approximation, kept for reference.
```
