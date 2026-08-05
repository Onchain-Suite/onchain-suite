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
 * Returns a one-time nonce for a wallet to sign (EIP-1193 / SIWE-style), so the
 * backend can verify wallet ownership on submit without the user ever entering
 * a credential. Proxies the backend's `/public/forms/:token/nonce`.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const wallet = req.nextUrl.searchParams.get("wallet")?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json(
      { error: "A valid wallet address is required." },
      { status: 400 }
    );
  }

  const targetUrl = `${backendBaseUrl()}/public/forms/${encodeURIComponent(
    token
  )}/nonce?wallet=${encodeURIComponent(wallet)}`;

  let res: Response;
  try {
    res = await fetch(targetUrl, { headers: publicBackendHeaders() });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the verification service." },
      { status: 502 }
    );
  }

  const text = await res.text().catch(() => "");
  return NextResponse.json(safeJson(text) ?? {}, { status: res.status });
}
