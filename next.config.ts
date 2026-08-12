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
