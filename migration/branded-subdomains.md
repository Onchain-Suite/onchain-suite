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

## Done since

### Workspace resolution (done - frontend + backend)
The subdomain label is the org's existing **`subdomain`** field (unique; the
Settings subdomain claim already validates it via `POST
/organization/subdomain/validate`). No new slug concept.
- **Backend:** `GET /organization/by-workspace/:subdomain` (public, `@Public()`),
  returns `{ id, name, subdomain }` only - no settings, no PII. 404 for unknown.
  (In the `feat/subdomain-workspace-resolution` backend branch; push + merge to
  staging, then deploy the droplet.)
- **Frontend:** `src/lib/published-workspace.ts` reads the `x-ocs-workspace`
  header the middleware sets, calls that endpoint, and brands the page as the
  workspace's - the dashboard eyebrow shows "<workspace> - dashboard", the form
  shows the workspace name, and the metadata title uses it. Degrades to the
  unscoped OnchainSuite page on any failure, so it is safe to ship before DNS is
  live. The "Published with OnchainSuite" footer stays on both.

## Still needed to switch it on

### 1. DNS + TLS (you)
The published pages are the **frontend** (Vercel). Point a wildcard there:
- **Vercel (frontend host):**
  1. Vercel project -> Settings -> Domains -> add `*.onchainsuite.com`.
  2. At the DNS provider for `onchainsuite.com`, add the record Vercel shows for
     the wildcard - a `CNAME` for `*` -> `cname.vercel-dns.com` (Vercel verifies
     it and issues the wildcard TLS cert automatically). Keep the existing apex
     / `app` / `api` records as they are.
  3. If DNS is on **DigitalOcean** (same place as the droplet): DO Networking ->
     Domains -> `onchainsuite.com` -> add a `CNAME` with hostname `*` and value
     `cname.vercel-dns.com.` (trailing dot). `api` stays an `A` record to the
     droplet IP; the wildcard is for the published FE only.
- **If the frontend is self-hosted on the droplet** (not Vercel): add an `A`
  record `*.onchainsuite.com` -> the droplet IP, add a wildcard `server_name
  *.onchainsuite.com;` block in nginx pointing at the Next server, and issue a
  wildcard cert with `certbot --nginx -d onchainsuite.com -d '*.onchainsuite.com'`
  (DNS-01 challenge).
- Then set the frontend env **`NEXT_PUBLIC_PUBLISHING_DOMAIN=onchainsuite.com`**.
  That one env flips the middleware on; nothing routes until the backend publish
  store below lands, so it is safe to set early.

### 2. Backend - publish persistence (still to do)
Replaces the current browser `localStorage` store in
`analytics/dashboards.service.ts` (per `migration/analytics-api-draft.md`):
- `POST /analytics/dashboards/:id/publish` -> `{ token }` (128-bit random);
  store `{ token, orgId, title, specs, lanes, createdAt }`, owner holds a
  `manageKey` (server keeps only its hash).
- `GET /analytics/published/:token` -> the dashboard's title + chart specs,
  **aggregate only** (no wallet addresses, no contacts). Live-recomputed, not a
  snapshot. 404 for revoked/never-existed (identical, on purpose).
- `DELETE /analytics/published/:token` (with the manage key) -> revoke.
- When a published token is read with `x-ocs-workspace` set, assert the token's
  `orgId` matches that subdomain's org (so `acme.onchainsuite.com/d/<token>`
  can only open Acme's dashboards). Forms already have a public read at
  `/f/[token]`; add the same check there.

### 3. Optional later
- `acme.onchainsuite.com/` (bare) -> a small public index of that workspace's
  published dashboards (Dune-style), behind the same resolution.
- Per-org **custom domains** (TypeForm Pro style) as a paid add-on.

## Security notes
- Published content is public, read-only, aggregate numbers only - the token is
  the credential; the subdomain only scopes + brands.
- The middleware never runs on the app/API (matcher is `/d`,`/f` only), so the
  authenticated app is unaffected whether or not publishing is enabled.
- Reserved subdomains are rejected as workspaces; `workspaceSlug` validation must
  reject them too at assignment time.
