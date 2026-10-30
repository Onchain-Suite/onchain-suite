import { type NextRequest, NextResponse } from "next/server";

import {
  backendBaseUrl,
  publicBackendHeaders,
} from "@/lib/public-forms-backend";

/**
 * Public funnel-beacon proxy. Forwards a hosted-form `view` / `start` event to
 * the backend's `/public/forms/:token/events`. No user auth - the form's public
 * token is the only credential, and the body carries no PII (type, source,
 * anonymous session id). Fire-and-forget: always answers 200 so a failed beacon
 * never surfaces to the visitor.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const targetUrl = `${backendBaseUrl()}/public/forms/${encodeURIComponent(token)}/events`;
  try {
    await fetch(targetUrl, {
      method: "POST",
      headers: publicBackendHeaders({
        "x-forwarded-origin": req.headers.get("origin") ?? "",
      }),
      body: JSON.stringify(body),
    });
  } catch {
    // Swallow: a dropped beacon must never break the page.
  }
  return NextResponse.json({ ok: true });
}
