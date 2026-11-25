import type { Metadata } from "next";

import { NsHome } from "@/onchain-suite-website/components/site/ns-home";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

// Title and description come from the root layout's defaults; this only adds
// the homepage's own canonical and og:url.
export const metadata: Metadata = pageMeta("/");

export default function Home() {
  return <NsHome />;
}
