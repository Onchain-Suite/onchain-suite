import * as Sentry from "@sentry/nextjs";

// Server + edge runtime error tracking. Entirely gated on a DSN: with none set
// (local dev, and prod until NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN is provisioned)
// this is a no-op, so adding the SDK changes nothing at runtime until then.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!dsn) return;
  const runtime = process.env.NEXT_RUNTIME;
  if (runtime === "nodejs" || runtime === "edge") {
    Sentry.init({
      dsn,
      // Low trace sampling - this is error tracking, not full APM.
      tracesSampleRate: 0.05,
      // Never attach PII (emails/wallets are sensitive, blind-indexed server-side).
      sendDefaultPii: false,
      environment:
        process.env.NEXT_PUBLIC_VERCEL_ENV ??
        process.env.NODE_ENV ??
        "development",
    });
  }
}

// Report errors thrown in nested React Server Components to Sentry.
export const onRequestError = Sentry.captureRequestError;
