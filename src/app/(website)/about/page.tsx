import type { Metadata } from "next";

import { AboutBody } from "@/onchain-suite-website/components/about/about-body";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/about", {
  title: "About",
  description:
    "Company facts for OnchainSuite: what it does, plans and prices, channels, chains, founders and how to refer to it.",
});

export default function Page() {
  return (
    <NsShell>
      <AboutBody />
    </NsShell>
  );
}
