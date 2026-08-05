import { type NextRequest, NextResponse } from "next/server";

import { backendBaseUrl } from "@/lib/public-forms-backend";

const PROVIDERS = new Set(["x", "farcaster"]);

/**
 * Kicks off channel-link OAuth for a hosted form by redirecting to the
 * backend's authorize endpoint. The backend runs the OAuth dance and, on
 * completion, redirects back to our `/f/oauth-callback` page (passed as
 * `redirect_uri`), which postMessages the linked handle to the opener.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; provider: string }> }
) {
  const { token, provider } = await params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const callback = new URL("/f/oauth-callback", req.nextUrl.origin).toString();
  const authorize = new URL(
    `${backendBaseUrl()}/public/forms/${encodeURIComponent(
      token
    )}/oauth/${provider}`
  );
  authorize.searchParams.set("redirect_uri", callback);

  return NextResponse.redirect(authorize.toString());
}
