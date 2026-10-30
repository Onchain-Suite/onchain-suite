import { withPayload } from "@payloadcms/next/withPayload";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

/**
 * Security headers for the PUBLIC hosted-form route (`/f/:token`).
 *
 * These pages render tenant-defined content (field labels, presentation) and,
 * critically, live on the SAME registrable domain as the authenticated app —
 * and the Better Auth session cookie is scoped `Domain=onchainsuite.com`
 * (cross-subdomain), so it rides along on this origin. There is no XSS sink
 * today (everything is React-escaped; no dangerouslySetInnerHTML), but this is
 * the belt-and-braces: shrink what a hosted page is allowed to do so that a
 * future injection can't phone home or be framed.
 *
 * Phase 1 ships the CSP in REPORT-ONLY mode so we can watch real violations
 * before flipping it to enforcing — a botched enforced CSP would blank the page
 * for every visitor. The non-CSP headers below are safe to enforce immediately.
 *
 * `frame-ancestors 'none'` is safe here because the embeddable widget is a raw
 * <form> that posts straight to the API — it never iframes `/f/` — so nothing
 * legitimately frames this page.
 */
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogCspSources = (() => {
  if (!posthogHost) return { script: "", connect: "" };

  try {
    const { hostname } = new URL(posthogHost);
    const domain = hostname.split(".").slice(-2).join(".");
    return {
      script: ` https://*.${domain}`,
      connect: ` ${posthogHost}`,
    };
  } catch {
    return { script: "", connect: "" };
  }
})();

const HOSTED_FORM_CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Turnstile (Cloudflare) is the only third party the form loads.
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${posthogCspSources.script}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Submissions go through the same-origin proxy (/api/forms/*); no direct
  // cross-origin egress. This is the line that stops data exfiltration.
  `connect-src 'self' https://challenges.cloudflare.com${posthogCspSources.connect}`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "report-uri /api/csp-report",
].join("; ");

/**
 * App-wide CSP (report-only for now). Broader than the hosted-form policy: the
 * authenticated app also loads Clarity analytics, Cloudinary images and Google
 * Fonts, and talks to its own same-origin `/api/v1` proxy + `/ws/*` sockets.
 * Ships REPORT-ONLY so violations land at `/api/csp-report` without breaking a
 * page; tighten from the real reports, then flip the key to
 * `Content-Security-Policy` to enforce. Kept intentionally without a blanket
 * `https:` so genuine cross-origin egress shows up in the report.
 */
const APP_CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // 'unsafe-inline'/'unsafe-eval' reflect what Next.js needs today; the report
  // stream will tell us what can be dropped on the way to a nonce-based policy.
  // cdn.databuddy.cc serves the Databuddy tracker + session-replay recorder
  // (databuddy.js / replay.js), mounted app-wide in the root layout.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clarity.ms https://cdn.databuddy.cc${posthogCspSources.script}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Logo CDNs for the audience on-chain columns: chain/protocol icons from
  // DefiLlama, token icons from Covalent (the latter already loaded via
  // backend-provided logoUrl); vendor favicons for the integrations connector
  // cards from DuckDuckGo. Declared so they survive the flip to enforce.
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.clarity.ms https://icons.llamao.fi https://logos.covalenthq.com https://icons.duckduckgo.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // basket.databuddy.cc is Databuddy's event + session-replay ingest endpoint.
  `connect-src 'self' https://*.clarity.ms https://challenges.cloudflare.com https://basket.databuddy.cc${posthogCspSources.connect}`,
  "frame-src 'self' https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "report-uri /api/csp-report",
].join("; ");

/** Baseline security headers for the whole app. All safe to enforce today. */
const appSecurityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: APP_CSP_REPORT_ONLY },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Ignored over plain HTTP (dev); enforces HTTPS in production.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/**
 * The dedicated public hosts for published forms and dashboards (Option 2: one
 * fixed host each, not a per-org wildcard). A bare `/<token>` on these hosts is
 * rewritten to the `/f` or `/d` route; every other host (the app) is untouched.
 */
const FORMS_HOST = process.env.NEXT_PUBLIC_FORMS_HOST ?? "forms.onchainsuite.com";
const DASHBOARD_HOST =
  process.env.NEXT_PUBLIC_DASHBOARD_HOST ?? "dashboard.onchainsuite.com";

const hostedFormSecurityHeaders = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: HOSTED_FORM_CSP_REPORT_ONLY,
  },
  // Standalone page — never legitimately framed. Blocks clickjacking.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The form's public token sits in the URL path; never leak the full URL to a
  // third party via Referer.
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  /* config options here */
  // Don't advertise the framework/version to every visitor.
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // PayloadCMS loads `sharp` on every getPayload() call (blog reads + admin).
  // `withPayload` marks sharp as a server-external package, so Next traces the
  // sharp JS - but sharp `dlopen`s its native libvips from the SEPARATE
  // `@img/sharp-libvips-linux-x64` package at runtime, which the tracer can't
  // follow. Without these the Vercel (linux-x64) function ships the sharp
  // loader but not `libvips-cpp.so`, so /blog 500s with ERR_DLOPEN_FAILED.
  // Force both linux-x64 native packages into every server function's trace.
  // Globs that match nothing (e.g. a local macOS build) are a safe no-op.
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/@img/sharp-linux-x64/**",
      "./node_modules/@img/sharp-libvips-linux-x64/**",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      // App-wide baseline. The negative lookahead excludes /f/; `missing` host
      // excludes the dedicated forms host (which gets the form policy on every
      // path below) so no header is ever set twice.
      {
        source: "/((?!f/).*)",
        missing: [{ type: "host", value: FORMS_HOST }],
        headers: appSecurityHeaders,
      },
      // The public hosted-form pages keep their tighter, form-specific policy -
      // at /f/* on any host, and on every path of the dedicated forms host
      // (where a bare /<token> renders a form).
      { source: "/f/:path*", headers: hostedFormSecurityHeaders },
      {
        source: "/:path*",
        has: [{ type: "host", value: FORMS_HOST }],
        headers: hostedFormSecurityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // Legacy /products (removed — it 404'd and still sat in the old sitemap).
      // Point it at the lead platform page the nav uses. Permanent so Search
      // Console drops the 404 and the old URL's link equity passes through.
      {
        source: "/products",
        destination: "/platform/audience",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const devDefault = "http://127.0.0.1:3333/api/v1";
    const prodDefault = "https://onchain-backend-dvxw.onrender.com/api/v1";
    const backendBase = pickNonEmpty(
      process.env.BACKEND_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL,
      process.env.NODE_ENV === "production" ? prodDefault : devDefault
    );
    const clean = backendBase.replace(/\/$/, "");
    return {
      beforeFiles: [
        {
          source: "/ws/inbox",
          destination: "/api/ws/inbox",
        },
        {
          source: "/ws/inbox/:path*",
          destination: "/api/ws/inbox",
        },
        // Dedicated public subdomains: a bare /<token> maps to the /f or /d
        // route. Scoped by Host, so the app host is never touched. /f/* and
        // /d/* keep working directly (two segments don't match /:token).
        {
          source: "/:token",
          has: [{ type: "host", value: FORMS_HOST }],
          destination: "/f/:token",
        },
        {
          source: "/:token",
          has: [{ type: "host", value: DASHBOARD_HOST }],
          destination: "/d/:token",
        },
      ],
      fallback: [
        {
          source: "/api/v1/:path*",
          destination: `${clean}/:path*`,
        },
      ],
    };
  },
};

// withPayload wires up the aliases + server-external packages the CMS needs and
// mounts Payload (admin UI + /cms-api) alongside the existing app.
const configWithCms = withPayload(nextConfig);

// Sentry build instrumentation is applied ONLY when a DSN is set at build time,
// so the current (no-DSN) build is byte-for-byte unchanged until the DSN env is
// provisioned in Vercel. Source maps upload only when an auth token is present.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithCms, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      disableLogger: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
    })
  : configWithCms;
