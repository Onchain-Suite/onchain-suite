import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const pickNonEmpty = (...values: Array<string | undefined | null>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

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
