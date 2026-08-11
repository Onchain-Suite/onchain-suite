import { type NextRequest, NextResponse } from "next/server";

import {
  backendBaseUrl,
  publicBackendHeaders,
} from "@/lib/public-forms-backend";

/** Parse a backend response body, tolerating empty or non-JSON payloads. */
const safeJson = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

/**
 * Public submission proxy. Forwards a hosted-form submission to the backend's
 * `/public/forms/:token/submit`. No user auth - the form's public token is the
 * only credential. The body carries field values plus (optionally) the wallet
 * address, signed nonce and linked-channel tokens.
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetUrl = `${backendBaseUrl()}/public/forms/${encodeURIComponent(token)}/submit`;

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: "POST",
      headers: publicBackendHeaders({
        // Pass the visitor's origin so the backend can enforce allowedOrigins.
        "x-forwarded-origin": req.headers.get("origin") ?? "",
      }),
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the submission service. Try again." },
      { status: 502 }
    );
  }

  const text = await res.text().catch(() => "");
  return NextResponse.json(safeJson(text) ?? { success: res.ok }, {
    status: res.status,
  });
}
