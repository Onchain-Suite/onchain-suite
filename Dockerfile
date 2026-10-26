# Production image for the OnchainSuite frontend (Next.js + Payload CMS, on bun).
# Built by Coolify for the staging/prod frontend deploy.
#
# IMPORTANT: NEXT_PUBLIC_* values are inlined into the client bundle at BUILD
# time, so they must be passed as build args (Coolify: "Build Variables").
# Everything else (BACKEND_URL, DATABASE_URI, PAYLOAD_SECRET, ...) is read at
# runtime from the container's env (Coolify: "Environment Variables").
FROM oven/bun:1.3.14
WORKDIR /app

# Dependencies first so this layer caches until the lockfile changes.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# --- Build-time public config (inlined into the client bundle) -----------------
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=$NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST

# Payload reads these when `next build` compiles the admin panel. The real DB is
# only reachable at runtime, so a placeholder keeps the build from trying to
# connect. These do NOT end up in the running container (runtime env wins).
ENV PAYLOAD_SECRET=build-time-placeholder \
    DATABASE_URI=postgresql://build:build@localhost:5432/build

RUN bun run build

ENV NODE_ENV=production
EXPOSE 3000

# `next start` serves the built app (no standalone output in this repo, so the
# full node_modules + .next are kept in the image, which also keeps Payload's
# runtime happy). Bind 0.0.0.0 so Coolify's proxy can reach it.
CMD ["bunx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
