import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { McpPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Intelligence MCP · OnchainSuite",
  description:
    "Ask your app and contract data a question in plain English. The Intelligence MCP turns your question into a query across both lanes, no SQL required.",
};

export default function Page() {
  return (
    <NsStandalone>
      <McpPage />
    </NsStandalone>
  );
}
