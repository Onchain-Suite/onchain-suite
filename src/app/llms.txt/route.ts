import { buildLlmsTxt } from "@/onchain-suite-website/utils/llms-txt";

// Built once at deploy time from data/brand-facts.ts; the facts only change
// with a commit, so there is nothing to revalidate.
export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
