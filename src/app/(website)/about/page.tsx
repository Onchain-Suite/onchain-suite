import type { Metadata } from "next";

import { AboutBody } from "@/onchain-suite-website/components/about/about-body";
import { NsShell } from "@/onchain-suite-website/components/site/ns-shell";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/about", {
  title: "About",
  description:
    "OnchainSuite is building the retention layer for every blockchain company. Our story, the engine, our clients, the founders and the facts about OnchainSuite Ltd.",
});

export default function Page() {
  return (
    <NsShell>
      <AboutBody />
    </NsShell>
  );
}
