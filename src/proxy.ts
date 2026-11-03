import { type NextRequest, NextResponse } from "next/server";

import { resolveHostRouting } from "@/lib/host-routing";

import {
  gatedPath,
  passcodeMatches,
  strategyGateCookie,
  strategyGateOn,
} from "@/onchain-suite-website/utils/strategy-gate";

// Hard split between the marketing site (apex) and the app (app./staging.).
// OFF by default: flip HOST_SPLIT_ENABLED=true in Vercel only once DNS and the
// app.onchainsuite.com / staging.onchainsuite.com domains resolve, or the app
// paths would 308 to a host that does not exist yet. See @/lib/host-routing.
const SPLIT_ENABLED = process.env.HOST_SPLIT_ENABLED === "true";

/**
 * Routes a request in two passes:
 *  1. Host split - send app paths to the app subdomain and marketing paths to
 *     the apex (no-op while HOST_SPLIT_ENABLED is off).
 *  2. Strategy gate - keep a passcode-gated client strategy, and its PDF,
 *     behind its passcode. Without the right cookie the page's own URL shows
 *     the passcode form (a rewrite, so the address a client was sent stays the
 *     same) and the PDF sends them to that form.
 * Anything neither pass claims passes straight through.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const { pathname, search } = request.nextUrl;

  const routing = resolveHostRouting(host, pathname, search, {
    enabled: SPLIT_ENABLED,
  });
  if (routing.kind === "redirect") {
    // Relative ("/dashboard") stays on the same origin; absolute crosses hosts.
    const destination = routing.location.startsWith("http")
      ? routing.location
      : new URL(routing.location, request.url).toString();
    return NextResponse.redirect(destination, routing.permanent ? 308 : 307);
  }

  if (!strategyGateOn()) return NextResponse.next();
  const gated = gatedPath(pathname);
  if (!gated) return NextResponse.next();

  const passcode = request.cookies.get(strategyGateCookie(gated.slug))?.value;
  if (await passcodeMatches(gated.slug, passcode)) return NextResponse.next();

  if (gated.kind === "pdf") {
    return NextResponse.redirect(
      new URL(`/retention-playbook/${gated.slug}`, request.url)
    );
  }
  const form = request.nextUrl.clone();
  form.pathname = `/strategy-gate/${gated.slug}`;
  return NextResponse.rewrite(form);
}

export const config = {
  // Broad so the host split can see every navigable path; Next internals and
  // the image optimizer are skipped, and the routing util classifies /api,
  // /cms-api, /f, /d and assets as public itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
