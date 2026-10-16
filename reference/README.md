# Migration reference

Design-complete reference material for migrations. **Not app source.** It is
excluded from `tsc`, ESLint, Prettier, and the Vercel deploy upload, and nothing
in the app imports from it.

## `v2.7/`

The v2.7 reference frontend: a standalone React 18 + Vite + React Router
dashboard where every screen and flow is built and interactive, with all data
mocked behind a typed `data/` seam (no backend). We migrate the production
Next.js app toward it, area by area (Settings is done; Analytics, Channels, and
Integrations follow on their own branches off `v2.7`).

Start with `v2.7/HANDOFF.md`. The dashboard lives in `v2.7/web/` (run it with
`cd reference/v2.7/web && npm install && npm run dev`); `v2.7/app/` holds the
design-system and handoff explorations.

Marketing image blobs from the original bundle (`launch-assets/`, `uploads/`)
were left out to keep the repo lean; pull them from the source zip if needed.
