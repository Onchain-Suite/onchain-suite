import type { Metadata } from "next";

import { AboutBody } from "@/onchain-suite-website/components/about/about-body";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/about", {
  title: "About",
  description:
    "OnchainSuite is the customer relationship layer for the onchain economy. We give blockchain companies customers who stay, come back and grow with them.",
});

export default function Page() {
  return (
    <NsShell>
      <AboutBody />
    </NsShell>
  );
}
