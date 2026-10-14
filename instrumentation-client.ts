import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// Missing config disables analytics with a dev-only warning rather than throwing:
// a teammate without the PostHog keys must still be able to run `bun dev`.
if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[posthog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN and NEXT_PUBLIC_POSTHOG_HOST are not set; product analytics is disabled. Set both (see .env.example) to enable it."
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
