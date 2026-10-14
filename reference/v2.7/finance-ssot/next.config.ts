import type { NextConfig } from 'next';

// STATIC=1 switches on Next's static export, which is what Cloudflare serves. Every route in this
// app prerenders - there are no route handlers, no middleware, no dynamic segments and no server
// actions - so the build emits plain HTML, CSS and JS with no runtime behind it.
//
// It is conditional rather than always on because `output: 'export'` disables `next start`, and the
// kit's CI smoke test starts the app that way. `npm run build` stays the kit's build; the deploy
// uses `npm run build:static`.
const config: NextConfig = {
  reactStrictMode: true,
  ...(process.env.STATIC
    ? { output: 'export' as const, images: { unoptimized: true }, trailingSlash: true }
    : {}),
};
export default config;
