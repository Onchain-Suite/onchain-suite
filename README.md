# Onchain Suite

Onchain Suite is the first integrated communication layer built natively for Web3. We help Web3
teams drive retention and engagement by combining on-chain behavioral analytics with lifecycle
messaging and privacy-aware authentication.

## What We Do

Most Web3 products have rich on-chain activity but limited ways to translate that behavior into
actionable marketing and retention workflows. Onchain Suite connects the data and the delivery layer
so growth teams can:

- Understand user behavior across chains and apps
- Segment audiences based on real activity signals
- Trigger personalized campaigns at the right moment
- Measure impact with analytics built into the workflow

## Product Suite

- **R3tain**: retention-focused email marketing built for Web3 brands, with campaigns designed to
  reduce churn and increase re-engagement.
- **Onch3n**: behavioral analytics that captures and interprets blockchain-based activity into
  marketer-friendly insights and retention signals.
- **3ridge**: authentication and data-management layer that helps platforms integrate marketing and
  analytics with privacy-preserving onboarding.

## Who It’s For

- Web3 consumer apps, DeFi protocols, NFT platforms, and on-chain communities
- Growth and marketing teams that need actionable analytics and reliable messaging
- Developers who want a clean API/SDK surface to embed analytics + auth + messaging

## This Repository

This repo contains the Onchain Suite web application (dashboard + website) and a same-origin API
proxy (`/api/v1/*`) that forwards requests to the backend to simplify auth and avoid CORS issues in
browser environments.

## Local Development

Two repositories run together:

- **This repo (frontend)** - the Next.js dashboard + website and the same-origin
  `/api/v1/*` proxy. Run with bun in dev mode.
- **[`onchain-backend`](https://github.com/Onchain-Suite/onchain-backend) (separate repo)** -
  the NestJS API plus Postgres and Redis. Run in Docker.

The browser only ever talks to this app's own `/api/v1` proxy, which forwards to
`BACKEND_URL`. On `localhost` the auth session cookie is accepted because the
browser treats it as a secure context; a bare `http://<ip>` is not a secure
context, so the cookie would be dropped and login would bounce.

### 1. Start the backend (Docker)

```bash
cd ../onchain-backend
docker compose up --build
```

This brings up Postgres (`:5433`), Redis (`:6380`) and the API on
**http://localhost:8080/api/v1**. The schema is created automatically on first
boot and dev-only auth secrets are baked in. Verify:

```bash
curl http://localhost:8080/api/v1/health
```

### 2. Start the frontend (bun, dev mode)

```bash
cp .env.example .env     # first time only, then adjust as needed
bun install
bun dev                  # http://localhost:3000
```

The values that matter for a local backend:

- `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` = `http://localhost:8080/api/v1`
- `NEXT_PUBLIC_APP_URL` = `http://localhost:3000` (must match the URL you open)

> The frontend's built-in dev default is `http://127.0.0.1:3333/api/v1`, but the
> backend's docker-compose serves `:8080` - so set `BACKEND_URL` explicitly.

### 3. Create an account and sign in

The local database starts empty, so register against your local backend:

1. Open **http://localhost:3000/auth/signup**
2. Create an account (this writes a user into your local Postgres).
3. Sign in.

### Ports

`3000` frontend · `8080` API · `5433` Postgres · `6380` Redis.

### Payload CMS (`/admin`)

`/admin` uses its own Postgres via `DATABASE_URI`. It is not required to run or
log into the app; set it only if you need the CMS.

## Deployment

The backend, Postgres and Redis run on a **DigitalOcean droplet managed by
[Coolify](https://coolify.io)** (each a Coolify resource). In the Coolify
environment set `NEXT_PUBLIC_APP_URL` to the app's public HTTPS domain and
`BACKEND_URL` to the backend's `/api/v1` origin - over HTTPS, so the session
cookie is accepted.

### Deploying this frontend to Coolify

The repo ships a production [`Dockerfile`](Dockerfile) (Next.js + Payload on bun,
`next start`). Coolify builds it directly.

**Why one domain matters.** Auth is cookie-based and the backend scopes cookies
to `.onchainsuite.com` (cross-subdomain). So the frontend and backend must be on
`onchainsuite.com` subdomains over HTTPS, or Google OAuth and the email links
break. Staging serves **everything from `api-next.onchainsuite.com`**: the
frontend answers `/*`, and its built-in `/api/v1/*` proxy forwards to the backend
privately. That keeps the session cookie on one origin, so sign-in, sign-up,
Google OAuth and email verification all work without localhost.

**1. Create the Coolify application** from this repo, build pack **Dockerfile**,
exposed port **3000**, domain `https://api-next.onchainsuite.com` (HTTPS).

**2. Build variables** (inlined into the client bundle at build time - these MUST
be set as Coolify *build* args, not just runtime env):

```
NEXT_PUBLIC_APP_URL=https://api-next.onchainsuite.com
NEXT_PUBLIC_BACKEND_URL=https://api-next.onchainsuite.com/api/v1
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=<token>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**3. Runtime environment variables:**

```
BACKEND_URL=<the NestJS backend's reachable URL>/api/v1   # e.g. the Coolify
            # internal service URL, or a private backend subdomain. The browser
            # never sees this; the /api/v1 proxy uses it server-side.
BACKEND_API_KEY=<if the backend requires a server key, else empty>
DATABASE_URI=<Coolify Postgres for Payload CMS /admin>
PAYLOAD_SECRET=<random secret>
```

**4. On the backend (`onchain-backend`) app**, point it at this frontend:

```
FRONTEND_URL=https://api-next.onchainsuite.com
APP_BASE_URL=https://api-next.onchainsuite.com/api/v1
```

`APP_BASE_URL` is the public URL the browser reaches (through the frontend's
`/api/v1` proxy), so better-auth builds OAuth callbacks and email links on
`api-next` - the one domain. Add `https://api-next.onchainsuite.com` as an
Authorized JavaScript origin in the Google OAuth console (the
`.../api/v1/auth/callback/google` redirect URI is already allowed).

> The frontend must reach the backend at `BACKEND_URL`. Since the frontend now
> owns the public `api-next` domain, the backend should be reachable at a private
> URL (Coolify internal service or a separate subdomain), not the public
> `api-next` origin - otherwise the proxy would point at itself.

## Links

- Website: https://onchainsuite.com
- X (Twitter): https://twitter.com/onchainsuite
