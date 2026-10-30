# Per-org subdomains for published Forms & Analytics (Dune / TypeForm style)

Goal: a workspace's published **forms** (`/f/[token]`) and **analytics
dashboards** (`/d/[token]`) are served on that workspace's own OnchainSuite
subdomain - `acme.onchainsuite.com/d/<token>` - branded OnchainSuite, the way
Dune hosts `dune.com/<workspace>` and TypeForm hosts `form.typeform.com`.

Decision (confirmed): **per-org subdomains** (`<workspace>.onchainsuite.com`),
not a single shared host and not custom per-org domains (that can be a later Pro
add-on).

## Done in this PR (frontend)

1. **Branded chrome.** `PublishedFooter` (`src/features/common/branding/`) - a
   "Published with OnchainSuite" badge (icon + link to the marketing site) on
   both `/f/[token]` and `/d/[token]`. Replaces the plain-text footers.
2. **Subdomain middleware.** `src/middleware.ts`, matched to `/d` and `/f`
   **only** (never the app or its API). It extracts the workspace slug from the
   `Host` header and forwards it as the `x-ocs-workspace` request header.
   - **Inert until configured:** does nothing unless `NEXT_PUBLIC_PUBLISHING_DOMAIN`
     is set, so local dev and Vercel previews are unaffected.
   - Apex and reserved subdomains (`www`, `app`, `api`, `admin`, …) are never
     treated as workspaces. Pure `resolveWorkspaceFromHost(host, domain)` is
     unit-tested.

## Still needed to switch it on

### 1. DNS + Vercel (you)
- Wildcard DNS: `*.onchainsuite.com` -> the Vercel app (CNAME/ALIAS), alongside
  the existing `app`/apex records.
- Add the wildcard domain to the Vercel project (Vercel issues the wildcard TLS
  cert). The app already builds on `main`/the deploy branch; no separate deploy.
- Set env on the frontend: `NEXT_PUBLIC_PUBLISHING_DOMAIN=onchainsuite.com`.
  This alone turns the middleware on; nothing else routes until the backend
  pieces below land, so it is safe to set early.

### 2. Backend
- **Publish persistence** (replaces the current browser `localStorage` store in
  `analytics/dashboards.service.ts`, per `migration/analytics-api-draft.md`):
  - `POST /analytics/dashboards/:id/publish` -> `{ token }` (128-bit random);
    store `{ token, orgId, title, specs, lanes, createdAt }`, owner holds a
    `manageKey` (server keeps only its hash).
  - `GET /analytics/published/:token` -> the dashboard's title + chart specs,
    **aggregate only** (no wallet addresses, no contacts). Live-recomputed, not
    a snapshot. 404 for revoked/never-existed (identical, on purpose).
  - `DELETE /analytics/published/:token` (with the manage key) -> revoke.
  - Forms already have a public read at `/f/[token]`; add the same
    workspace-scoping below.
- **Workspace resolution** (new, what the subdomain needs):
  - Each org gets a unique **`workspaceSlug`** (set at onboarding or in
    Settings; validate against the reserved list). This is the subdomain label.
  - `GET /organization/by-workspace/:slug` -> `{ orgId, name, branding }` (public,
    cacheable) so a page can resolve `acme` -> the org and brand the page as
    "Acme".
  - When a published token is read with a workspace in context, assert the
    token belongs to that workspace (so `acme.onchainsuite.com/d/<token>` can
    only open Acme's dashboards).

### 3. Frontend wiring (once the above exist)
- `/d/[token]` and `/f/[token]` read the `x-ocs-workspace` header (set by the
  middleware), call `GET /organization/by-workspace/:slug`, and:
  - scope the token read to that workspace (reject cross-workspace tokens);
  - pass the workspace name/branding to `PublishedFooter` / the page header so
    the page reads as that workspace's, still "Published with OnchainSuite".
- Optional: `acme.onchainsuite.com/` (bare) -> a small public index of that
  workspace's published dashboards (Dune-style), behind the same resolution.

## Security notes
- Published content is public, read-only, aggregate numbers only - the token is
  the credential; the subdomain only scopes + brands.
- The middleware never runs on the app/API (matcher is `/d`,`/f` only), so the
  authenticated app is unaffected whether or not publishing is enabled.
- Reserved subdomains are rejected as workspaces; `workspaceSlug` validation must
  reject them too at assignment time.
