import { type NextRequest, NextResponse } from "next/server";

import {
  gatedPath,
  passcodeMatches,
  strategyGateCookie,
  strategyGateOn,
} from "@/onchain-suite-website/utils/strategy-gate";

/**
 * Keeps a passcode-gated client strategy, and its PDF, behind its passcode.
 * Without the right cookie the page's own URL shows the passcode form (a
 * rewrite, so the address a client was sent stays the same) and the PDF sends
 * them to that form. Everything else passes straight through.
 */
export async function proxy(request: NextRequest) {
  if (!strategyGateOn()) return NextResponse.next();
  const gated = gatedPath(request.nextUrl.pathname);
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
  matcher: ["/retention-playbook/:slug", "/playbooks/:file"],
};
