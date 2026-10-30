# Branded publishing on `share.onchainsuite.com` (Option 2)

How OnchainSuite serves published **dashboards** (`/d/<token>`) and hosted
**forms** (`/f/<token>`) to the public: one fixed, branded host, like Dune's
`dune.com/embeds/...` or a Typeform `form.typeform.com/to/<id>`.

This is **Option 2**: a single subdomain, workspace read from the TOKEN (not the
host). We rejected Option 1 (per-org `acme.onchainsuite.com` wildcard) because a
wildcard certificate needs DNS-01, which forces delegating the whole
`onchainsuite.com` zone to Vercel's nameservers - moving every record
(`api` -> the DigitalOcean droplet, mail MX/SPF/DKIM, etc.) off GoDaddy. Option 2
needs one CNAME and touches nothing else.

## How it works

- A published link is `https://share.onchainsuite.com/d/<token>` (dashboard) or
  `/f/<token>` (form). The token is globally unique and maps to its org on the
  backend, so **no workspace is needed in the host or the path** - the page is
  branded from the token's org.
- **Dashboards**: `GET /public/dashboards/<token>` returns `{ title,
  workspaceName, period, computedAt, charts: [{ spec, data }] }`. `data` was
  frozen when the author published (they have org access; the public read does
  not and needs none). The page shows `"<workspaceName> · dashboard"` and
  renders the snapshot. There is no server-side metric compute and no wildcard.
- **Forms**: `GET /public/forms/<token>` already returns the form config; the
  page renders it in the branded shell with the "Published with OnchainSuite"
  footer.
- No Next.js middleware is involved. Everything is served by the same Vercel
  deployment under one host.

## Finishing setup (owner)

1. **GoDaddy** - add ONE record to `onchainsuite.com`:
   `CNAME  share  ->  cname.vercel-dns.com`  (TTL 600). Nothing else changes;
   `api`, `www`, mail and the rest stay exactly as they are.
2. **Vercel** - Project -> Settings -> Domains -> add `share.onchainsuite.com`.
   Vercel issues the certificate over the CNAME (DNS-01 is not required for a
   single host). Wait for "Valid Configuration".
3. **Vercel env** (Production): set `NEXT_PUBLIC_ANALYTICS_DASHBOARDS_API=1` so
   publishing/reading links goes through the backend rather than this browser's
   localStorage.
4. **Backend** (DigitalOcean droplet, `ocs-server`): set
   `ANALYTICS_PUBLIC_URL=https://share.onchainsuite.com` so the link URLs the API
   returns use the share host. Deploy the publish-persistence change (manual
   deploy - merged is not live).

Until step 1-2 land, links still work at the app host (`/d/<token>`,
`/f/<token>`); the share subdomain is only a nicer public face.
