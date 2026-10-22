import type { Metadata } from "next";

import { NsStandalone } from "@/onchain-suite-website/components/site/ns-standalone";
import { ReferPage } from "@/onchain-suite-website/components/site/site-bundle";

export const metadata: Metadata = {
  title: "Refer a team or become an agency partner · OnchainSuite",
  description:
    "Introduce a team that should be using OnchainSuite, or become an agency partner and run OnchainSuite for the companies you work with.",
  alternates: { canonical: "/refer" },
};

export default function Page() {
  return (
    <NsStandalone>
      <ReferPage />
    </NsStandalone>
  );
}
