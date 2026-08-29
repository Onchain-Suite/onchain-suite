import { withPayload } from "@payloadcms/next/withPayload";
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
const HOSTED_FORM_CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Turnstile (Cloudflare) is the only third party the form loads.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Submissions go through the same-origin proxy (/api/forms/*); no direct
  // cross-origin egress. This is the line that stops data exfiltration.
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "report-uri /api/csp-report",
].join("; ");

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
      // Scope the hardening to the public hosted-form pages only, so the
      // authenticated app is untouched by this phase.
      { source: "/f/:path*", headers: hostedFormSecurityHeaders },
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
export default withPayload(nextConfig);
