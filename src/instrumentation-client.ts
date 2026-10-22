import * as Sentry from "@sentry/nextjs";

// Browser error tracking. Gated on the public DSN: a no-op until
// NEXT_PUBLIC_SENTRY_DSN is set, so the SDK ships inert rather than changing
// behaviour before it is configured.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.05,
    // Session Replay off by default - opt in later if wanted.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV ??
      process.env.NODE_ENV ??
      "development",
  });
}

// Lets Sentry tie a navigation to the errors that happen during it.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
