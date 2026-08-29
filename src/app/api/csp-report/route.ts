import { type NextRequest, NextResponse } from "next/server";

/**
 * CSP violation sink for the hosted-form route's report-only policy
 * (`report-uri /api/csp-report`). Phase 1 of hardening runs the policy in
 * report-only mode, so this endpoint is how we learn what a would-be enforced
 * CSP would break BEFORE flipping it on — a botched enforced policy blanks the
 * page for every visitor.
 *
 * It only logs. It never trusts or reflects the body, caps how much it reads,
 * and always answers 204 so a flood of reports (or junk POSTs) can't turn into
 * an error loop or an amplification vector.
 */
export const runtime = "nodejs";

// Browsers post a small JSON envelope; anything larger is not a real CSP report.
const MAX_REPORT_BYTES = 16 * 1024;

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw && raw.length <= MAX_REPORT_BYTES) {
      // `csp-report` (report-uri) wraps the violation under a top-level key;
      // log just the useful fields, never the whole untrusted blob verbatim.
      const parsed = JSON.parse(raw) as {
        "csp-report"?: Record<string, unknown>;
      };
      const report = parsed["csp-report"] ?? parsed;
      const pick = (k: string) =>
        typeof (report as Record<string, unknown>)[k] === "string"
          ? ((report as Record<string, unknown>)[k] as string)
          : undefined;
      console.warn("[csp-report] hosted-form violation", {
        documentUri: pick("document-uri"),
        violatedDirective: pick("violated-directive"),
        blockedUri: pick("blocked-uri"),
      });
    }
  } catch {
    // Malformed body — ignore. A report endpoint must never error.
  }
  return new NextResponse(null, { status: 204 });
}
