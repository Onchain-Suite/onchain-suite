"use client";

import dynamic from "next/dynamic";

// The real sending-domain flow (input -> generate DNS records -> check -> verified) is the email
// channel's own setup panel and is self-contained (no routing, no role gating), so it sits under
// this step's heading as it does in Integrations -> Channels -> Email. It is below the fold of
// onboarding and pulls in React Query + the records table, so it is code-split and only loads
// when the step is reached.
const SenderDomains = dynamic(
  () =>
    import("@/features/channels/components/email/sender-domains").then(
      (m) => m.SenderDomains
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-muted/30 h-40 animate-pulse rounded-xl border" />
    ),
  }
);

/**
 * The sending domain. The email channel's generate-and-verify panel, dropped into the step so
 * the records can be set up here and now. Nothing blocks: the records resolve on their own
 * schedule and can be added whenever the account owner can reach their DNS, so Continue is a skip.
 */
export function StepDns({
  handingOver,
  handoffSent,
  website,
}: {
  handingOver: boolean;
  handoffSent: boolean;
  website: string;
}) {
  const domain = website
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
  return (
    <>
      <h1 className="text-foreground text-3xl font-bold">
        Set up your sending domain
      </h1>
      <p className="text-muted-foreground mt-3">
        {handingOver
          ? handoffSent
            ? `A few DNS records so email leaves as ${domain || "you"}. If you can reach your DNS you can add them now; if not, skip, they are in the steps your developer was just invited to.`
            : `A few DNS records so email leaves as ${domain || "you"}. If you can reach your DNS you can add them now; if not, skip and invite your developer from Settings later.`
          : `A few DNS records so email leaves as ${domain || "you"} rather than as us. Generate them now and add them whenever you can reach your DNS.`}
      </p>

      <div className="mt-8">
        <SenderDomains defaultDomain={domain} />
      </div>

      <p className="text-muted-foreground mt-4 text-sm">
        You do not have to finish this here. Verification runs on its own, and
        you can come back to it from Integrations → Channels → Email.
      </p>
    </>
  );
}
