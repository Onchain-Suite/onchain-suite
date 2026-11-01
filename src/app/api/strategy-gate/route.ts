import { NextResponse } from "next/server";

import {
  isGatedStrategy,
  normalisePasscode,
  passcodeMatches,
  STRATEGY_GATE_MAX_AGE,
  strategyGateCookie,
} from "@/onchain-suite-website/utils/strategy-gate";

/**
 * The passcode form on a gated strategy posts here. The right passcode is kept
 * in an httpOnly cookie for 30 days and the reader goes back to the strategy;
 * a wrong one goes back to the form with ?wrong=1.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const slug = String(form.get("slug") ?? "");
  const passcode = String(form.get("passcode") ?? "");
  if (!isGatedStrategy(slug)) {
    return new NextResponse(null, { status: 404 });
  }

  const page = new URL(`/retention-playbook/${slug}`, request.url);
  if (!(await passcodeMatches(slug, passcode))) {
    page.searchParams.set("wrong", "1");
    return NextResponse.redirect(page, 303);
  }

  const response = NextResponse.redirect(page, 303);
  response.cookies.set(strategyGateCookie(slug), normalisePasscode(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STRATEGY_GATE_MAX_AGE,
  });
  return response;
}
