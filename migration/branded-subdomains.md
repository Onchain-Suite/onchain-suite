# Branded publishing on `forms.` + `dashboard.onchainsuite.com`

How OnchainSuite serves published **dashboards** and hosted **forms** to the
public: two fixed, branded hosts, Typeform-style
(`forms.onchainsuite.com/<token>`) and Dune-style
(`dashboard.onchainsuite.com/<token>`).

This is the single-subdomain model (not a per-org wildcard): a wildcard cert
needs DNS-01, which forces delegating the whole `onchainsuite.com` zone to
Vercel's nameservers and moving every record (`api` -> the DigitalOcean droplet,
mail MX/SPF/DKIM, etc.) off GoDaddy. Two fixed CNAMEs need none of that.

## How it works

- A published link is `https://forms.onchainsuite.com/<token>` (form) or
  `https://dashboard.onchainsuite.com/<token>` (dashboard). The token is
  globally unique and maps to its org on the backend, so **no workspace is
  needed in the host or path** - the page brands from the token.
- **Routing** (no middleware): `next.config.ts` rewrites, scoped by `Host`, map
  a bare `/<token>` on the forms host to the `/f/<token>` route and on the
  dashboard host to `/d/<token>`. Every other host (the app itself) passes
  through untouched. `/f/<token>` and `/d/<token>` still work directly on any
  host. The forms host also carries the stricter hosted-form security headers on
  every path (via a `Host` `has` condition), and the app baseline is excluded
  there (`missing` host) so nothing is set twice.
- **Dashboards** (`GET /public/dashboards/<token>`): returns `{ title,
  workspaceName, period, computedAt, charts: [{ spec, data }] }`, each chart
  recomputed live for the token's org by the backend (no org access needed by
  the viewer). The page brands `"<workspaceName> · dashboard"`.
- **Forms** (`GET /public/forms/<token>`): the form config, rendered in the
  branded shell with the "Published with OnchainSuite" footer. Views/starts are
  beaconed to `POST /public/forms/<token>/events` for the funnel analytics.

## Finishing setup (owner)

1. **GoDaddy** - add TWO records to `onchainsuite.com`, nothing else changes:
   - `CNAME  forms      ->  cname.vercel-dns.com`
   - `CNAME  dashboard  ->  cname.vercel-dns.com`
2. **Vercel** - Project -> Settings -> Domains -> add both
   `forms.onchainsuite.com` and `dashboard.onchainsuite.com`. Wait for "Valid
   Configuration" (a single-host cert; no DNS-01).
3. **Vercel env** (Production): `NEXT_PUBLIC_ANALYTICS_DASHBOARDS_API=1` (publish
   + read links through the backend). The hosts default to the two above;
   override with `NEXT_PUBLIC_FORMS_HOST` / `NEXT_PUBLIC_DASHBOARD_HOST` if ever
   needed.
4. **Backend** (DigitalOcean droplet, `ocs-server`): set
   `DASHBOARD_PUBLIC_URL=https://dashboard.onchainsuite.com` so the share-link
   URLs the API returns use the dashboard host. Deploy (manual - merged is not
   live).

Until 1-2 land, links still work at the app host (`/f/<token>`, `/d/<token>`).
