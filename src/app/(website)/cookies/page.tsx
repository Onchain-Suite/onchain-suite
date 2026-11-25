import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { CookiesPage } from "@/onchain-suite-website/components/site/site-bundle";
import { pageMeta } from "@/onchain-suite-website/config/page-meta";

export const metadata: Metadata = pageMeta("/cookies", {
  title: "Cookie Policy",
  description:
    "How OnchainSuite uses cookies and similar technologies under PECR and UK GDPR.",
});

export default function Page() {
  return (
    <NsStandalone>
      <CookiesPage />
    </NsStandalone>
  );
}
